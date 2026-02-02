require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const Keycloak = require('keycloak-connect');
const { Pool } = require('pg');
const winston = require('winston');
const { productSchema, updateProductSchema } = require('./validation');
const KafkaService = require('./kafka');

// 1. Setup Logging (Industry Standard)
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// 2. Database Connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
});

// 3. Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet()); // Security Headers
app.use(express.json());
app.use(cors({
    origin: '*', // For development. In prod, lock this down to your Frontend URL.
    credentials: true
}));

// 4. Keycloak Setup
const memoryStore = new session.MemoryStore();
const keycloak = new Keycloak({ store: memoryStore }, {
  "realm": "eshop",
  "auth-server-url": process.env.KEYCLOAK_URL || "http://localhost:8080",
  "ssl-required": "external",
  "resource": "product-service", // Backend usually needs a client in Keycloak, or use Bearer-only
  "public-client": true,
  "confidential-port": 0
});

app.use(session({
  secret: 'some-secret',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));

app.use(keycloak.middleware());

// 5. Initialize Kafka (Async)
const kafkaService = new KafkaService(pool);
kafkaService.connect().catch(err => logger.error('Kafka Connection Failed', err));

// ------------------------------------------------------------------
// ROUTES
// ------------------------------------------------------------------

// Helper: Role Verification Middleware
const requireRole = (role) => (req, res, next) => {
  const roles = req.kauth.grant.access_token.content.realm_access.roles;
  if (roles.includes(role)) return next();
  return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
};

// GET /api/products - Public
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: 'Server error fetching products' });
  }
});

// POST /api/products - Sellers Only
app.post('/api/products', keycloak.protect(), requireRole('seller'), async (req, res) => {
  // Validate Input
  const { error } = productSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { name, description, price, image_url, quantity } = req.body;
  const seller_username = req.kauth.grant.access_token.content.preferred_username;

  try {
    const result = await pool.query(
      `INSERT INTO products (name, description, price, image_url, quantity, seller_username) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description, price, image_url, quantity, seller_username]
    );
    logger.info(`Product created by ${seller_username}: ${result.rows[0].id}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/products/:id - Sellers Only (Own products only)
app.delete('/api/products/:id', keycloak.protect(), requireRole('seller'), async (req, res) => {
  const { id } = req.params;
  const seller_username = req.kauth.grant.access_token.content.preferred_username;

  try {
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 AND seller_username = $2 RETURNING *', 
      [id, seller_username]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found or you do not have permission to delete it.' });
    }

    logger.info(`Product deleted: ${id}`);
    res.json({ message: 'Product deleted successfully', product: result.rows[0] });
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start Server
app.listen(PORT, () => {
  logger.info(`Product Service running on port ${PORT}`);
});

// Handle Docker Shutdown Signals
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    pool.end();
    // kafka disconnect logic if needed
});