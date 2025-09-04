const express = require('express');
const router = express.Router();
const urlService = require('../services/urlService');
const { log } = require('../middleware/loggingMiddleware');

// Create a new shortened URL
router.post('/', async (req, res) => {
  try {
    await log('backend', 'info', 'route', 'Received request to create shortened URL', { 
      body: req.body,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    const { url, validity, shortcode } = req.body;
    
    if (!url) {
      await log('backend', 'warn', 'route', 'Missing URL in request');
      return res.status(400).json({ 
        error: 'URL is required' 
      });
    }
    
    // Simulate occasional validation error to generate logs
    if (Math.random() < 0.1) {
      const errorMessage = 'Simulated validation error for logging demonstration';
      await log('backend', 'error', 'route', errorMessage, {
        requestBody: req.body,
        errorType: 'ValidationFailure'
      });
      return res.status(400).json({ error: errorMessage });
    }
    
    const result = await urlService.createShortUrl(
      url, 
      validity || 30, 
      shortcode || null
    );
    
    await log('backend', 'info', 'route', 'Successfully created shortened URL', {
      shortLink: result.shortLink,
      expiry: result.expiry
    });
    
    res.status(201).json(result);
  } catch (error) {
    await log('backend', 'error', 'route', `URL creation route error: ${error.message}`, {
      stack: error.stack,
      requestBody: req.body
    });
    
    if (error.message.includes('Invalid') || 
        error.message.includes('already in use')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to create shortened URL' });
  }
});

// Get statistics for a URL
router.get('/:shortcode', async (req, res) => {
  try {
    const { shortcode } = req.params;
    
    await log('backend', 'info', 'route', `Retrieving statistics for shortcode: ${shortcode}`);
    
    // Check if shortcode exists
    const urlData = await urlService.getUrlByShortcode(shortcode);
    
    if (!urlData) {
      await log('backend', 'warn', 'route', `Statistics requested for non-existent shortcode: ${shortcode}`);
      return res.status(404).json({ error: 'URL not found' });
    }
    
    const statistics = await urlService.getUrlStatistics(shortcode);
    
    await log('backend', 'info', 'route', `Successfully retrieved statistics for ${shortcode}`, {
      clicks: statistics.totalClicks,
      isExpired: statistics.isExpired
    });
    
    res.status(200).json(statistics);
  } catch (error) {
    await log('backend', 'error', 'route', `Statistics retrieval error: ${error.message}`, {
      shortcode: req.params.shortcode,
      stack: error.stack
    });
    
    if (error.message === 'URL not found') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to retrieve URL statistics' });
  }
});

// Redirect to original URL
router.get('/:shortcode/redirect', async (req, res) => {
  try {
    const { shortcode } = req.params;
    
    await log('backend', 'info', 'route', `Processing redirect for shortcode: ${shortcode}`, {
      referrer: req.headers.referer || 'direct',
      userAgent: req.headers['user-agent']
    });
    
    // Get URL info
    const urlData = await urlService.getUrlByShortcode(shortcode);
    
    // Handle non-existent URL
    if (!urlData) {
      await log('backend', 'warn', 'route', `Redirect requested for non-existent shortcode: ${shortcode}`);
      return res.status(404).json({ error: 'URL not found' });
    }
    
    // Handle expired URL
    if (urlData.isExpired) {
      await log('backend', 'warn', 'route', `Redirect requested for expired shortcode: ${shortcode}`, {
        expiryDate: urlData.expiresAt
      });
      return res.status(410).json({ error: 'URL has expired' });
    }
    
    // Record click
    const clickInfo = {
      source: req.headers.referer || 'direct',
      location: req.ip || 'unknown',
      userAgent: req.headers['user-agent']
    };
    
    await urlService.recordClick(shortcode, clickInfo);
    
    await log('backend', 'info', 'route', `Redirecting user to original URL`, {
      shortcode,
      originalUrl: urlData.originalUrl
    });
    
    // Redirect to original URL
    res.redirect(urlData.originalUrl);
  } catch (error) {
    await log('backend', 'error', 'route', `Redirect error: ${error.message}`, {
      shortcode: req.params.shortcode,
      stack: error.stack
    });
    
    res.status(500).json({ error: 'Redirect failed' });
  }
});

module.exports = router;
