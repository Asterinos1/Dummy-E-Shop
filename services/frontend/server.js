const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;


// 1. INDUSTRY STANDARD FIX: Serve Keycloak client from node_modules
// This maps the URL '/library/keycloak.js' to the actual file inside the container
app.use('/library/keycloak.js', express.static(path.join(__dirname, 'node_modules/keycloak-js/dist/keycloak.min.js')));
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve index.html (optional, good for SPA behavior)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Frontend Server running at http://localhost:${PORT}`);
});