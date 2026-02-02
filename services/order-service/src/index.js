require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const Keycloak = require('keycloak-connect');
const { Pool } = require('pg');
const winston = require('winston');
const { orderSchema } = require('./validation');
const KafkaService = require('./kafka');

// 1. Setup Logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
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

// 3. Initialize Express
const app = express();
const PORT = process.env.PORT || 5001;

app.use(helmet());
app.use(express.json());
app.use(cors({ origin: '*', credentials: true }));

// 4. Keycloak Setup
const memoryStore = new session.MemoryStore();
const keycloak = new Keycloak({ store: memoryStore }, {
  "realm": "eshop",
  "auth-server-url": process.env.KEYCLOAK_URL || "http://localhost:8080",
  "ssl-required": "external",
  "resource": "order-service",
  "public-client": true,
  "confidential-port": 0
});

app.use(session({
  secret: 'order-secret',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));

app.use(keycloak.middleware());

// 5. Initialize Kafka
const kafkaService = new KafkaService(pool);
kafkaService.connect().catch(err => logger.error('Kafka Connection Failed', err));

// ------------------------------------------------------------------
// ROUTES
// ------------------------------------------------------------------

// Helper: Role Verification
const requireRole = (role) => (req, res, next) => {
  const roles = req.kauth.grant.access_token.content.realm_access.roles;
  if (roles.includes(role)) return next();
  return res.status(403).json({ error: 'Forbidden' });
};

// GET /api/orders - Customers Only (Own orders only)
app.get('/api/orders', keycloak.protect(), requireRole('customer'), async (req, res) => {
  const customer_username = req.kauth.grant.access_token.content.preferred_username;
  
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE customer_username = $1 ORDER BY created_at DESC', 
      [customer_username]
    );
    res.json(result.rows);
  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: 'Server error fetching orders' });
  }
});

// POST /api/orders - Create Order
app.post('/api/orders', keycloak.protect(), requireRole('customer'), async (req, res) => {
  // Validate Input
  const { error } = orderSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { products, total_price } = req.body;
  const customer_username = req.kauth.grant.access_token.content.preferred_username;

  try {
    // 1. Save to DB with 'Pending' status
    const result = await pool.query(
      `INSERT INTO orders (products, total_price, status, customer_username) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [JSON.stringify(products), total_price, 'Pending', customer_username]
    );

    const newOrder = result.rows[0];

    // 2. Trigger Async Stock Validation via Kafka
    await kafkaService.sendOrderForValidation({
      id: newOrder.id,
      products: products // pass raw JS object, not JSON string
    });

    logger.info(`Order #${newOrder.id} created (Pending)`);
    res.status(201).json(newOrder);

  } catch (err) {
    logger.error(err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// Start Server
app.listen(PORT, () => {
  logger.info(`Order Service running on port ${PORT}`);
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM received');
    pool.end();
});