require('dotenv').config();
const express = require('express');
const cors = require('cors');
const shortUrlRoutes = require('./routes/shortUrlRoutes');
const { log } = require('./middleware/loggingMiddleware');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Apply logging middleware
app.use(async (req, res, next) => {
  await log('backend', 'info', 'route', `${req.method} ${req.url} request received`, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  next();
});

// Routes
app.use('/shorturls', shortUrlRoutes);

// Redirect route
app.get('/:shortcode', async (req, res) => {
  const { shortcode } = req.params;
  try {
    await log('backend', 'info', 'route', `Redirect request for shortcode: ${shortcode}`, {
      shortcode,
      userAgent: req.headers['user-agent'],
      referer: req.headers['referer'] || 'direct'
    });

    // Redirect logic will be implemented in the route handler
    res.redirect(`/shorturls/${shortcode}/redirect`);
  } catch (error) {
    await log('backend', 'error', 'route', `Redirect error: ${error.message}`, { shortcode });
    res.status(500).json({ error: 'Server error during redirect' });
  }
});

// Error handling middleware
app.use(async (err, req, res, next) => {
  await log('backend', 'error', 'middleware', `Global error handler: ${err.message}`, {
    stack: err.stack,
    url: req.originalUrl
  });
  
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start the server
app.listen(PORT, async () => {
  await log('backend', 'info', 'service', `URL Shortener service started on port ${PORT}`);
  console.log(`URL Shortener service running at http://localhost:${PORT}`);
});
