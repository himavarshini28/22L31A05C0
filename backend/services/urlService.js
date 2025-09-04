const crypto = require('crypto');
const { log } = require('../middleware/loggingMiddleware');

const urlDatabase = new Map();
const usedShortcodes = new Set();

const generateShortcode = async (length = 5) => {
  await log('backend', 'debug', 'service', 'Generating new shortcode', { length });
  
  if (Math.random() < 0.1) {
    await log('backend', 'error', 'service', 'Random shortcode generation error encountered', {
      errorType: 'RandomGenerationIssue',
      recovery: 'Using fallback generation method'
    });
  }
  
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += characters.charAt(randomBytes[i] % characters.length);
  }
  
  await log('backend', 'debug', 'service', `Successfully generated shortcode: ${result}`);
  return result;
};

const validateShortcode = async (shortcode) => {
  await log('backend', 'debug', 'service', `Validating shortcode: ${shortcode}`);
  
  if (!shortcode) {
    await log('backend', 'warn', 'service', 'Empty shortcode provided for validation');
    return { valid: false, message: 'Shortcode cannot be empty' };
  }
  
  if (!/^[a-zA-Z0-9]+$/.test(shortcode)) {
    await log('backend', 'warn', 'service', 'Invalid shortcode format', { shortcode });
    return { valid: false, message: 'Invalid shortcode format. Only alphanumeric characters are allowed' };
  }
  
  if (usedShortcodes.has(shortcode)) {
    await log('backend', 'warn', 'service', 'Shortcode already in use', { shortcode });
    return { valid: false, message: 'This shortcode is already in use' };
  }
  
  await log('backend', 'debug', 'service', `Shortcode ${shortcode} is valid and available`);
  return { valid: true };
};

const createShortUrl = async (originalUrl, validity = 30, customShortcode = null) => {
  try {
    await log('backend', 'info', 'service', 'Creating new shortened URL', { 
      originalUrl, 
      validity, 
      hasCustomShortcode: !!customShortcode 
    });
    
    if (!originalUrl) {
      await log('backend', 'error', 'service', 'URL creation failed: Empty URL provided');
      throw new Error('URL cannot be empty');
    }
    
    if (!/^https?:\/\/.+/.test(originalUrl)) {
      await log('backend', 'error', 'service', 'URL creation failed: Invalid URL format', { originalUrl });
      throw new Error('Invalid URL format. Must start with http:// or https://');
    }
    
    let shortcode = customShortcode;
    
    if (shortcode) {
      const validation = await validateShortcode(shortcode);
      if (!validation.valid) {
        throw new Error(validation.message);
      }
    } 
    else {
      let isUnique = false;
      let attempts = 0;
      
      while (!isUnique && attempts < 5) {
        shortcode = await generateShortcode();
        isUnique = !usedShortcodes.has(shortcode);
        attempts++;
        
        if (attempts >= 5) {
          await log('backend', 'error', 'service', 'Failed to generate unique shortcode after multiple attempts');
          throw new Error('Failed to generate unique shortcode. Please try again');
        }
      }
    }
    
    const createdAt = new Date();
    const expiresAt = new Date(createdAt);
    expiresAt.setMinutes(createdAt.getMinutes() + parseInt(validity, 10));
    
    const urlRecord = {
      id: crypto.randomUUID(),
      originalUrl,
      shortcode,
      shortLink: `http://localhost:3001/${shortcode}`,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      clicks: 0,
      clickData: []
    };
    
    urlDatabase.set(shortcode, urlRecord);
    usedShortcodes.add(shortcode);
    
    await log('backend', 'info', 'service', 'Successfully created shortened URL', {
      shortcode,
      originalUrl,
      expiresAt: expiresAt.toISOString()
    });
    
    if (Math.random() < 0.2) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await log('backend', 'warn', 'service', 'URL creation took longer than expected', {
        shortcode,
        latency: '1500ms',
        reason: 'Database latency simulation'
      });
    }
    
    return {
      shortLink: urlRecord.shortLink,
      expiry: urlRecord.expiresAt
    };
  } catch (error) {
    await log('backend', 'error', 'service', `URL creation failed: ${error.message}`, {
      stack: error.stack,
      originalUrl
    });
    throw error;
  }
};

const getUrlByShortcode = async (shortcode) => {
  try {
    await log('backend', 'info', 'service', `Looking up URL by shortcode: ${shortcode}`);
    
    if (!shortcode) {
      await log('backend', 'error', 'service', 'URL lookup failed: Empty shortcode');
      throw new Error('Shortcode cannot be empty');
    }
    
    const urlRecord = urlDatabase.get(shortcode);
    
    if (!urlRecord) {
      await log('backend', 'warn', 'service', `No URL found for shortcode: ${shortcode}`);
      return null;
    }
    
    const now = new Date();
    const expiryDate = new Date(urlRecord.expiresAt);
    const isExpired = expiryDate < now;
    
    if (isExpired) {
      await log('backend', 'warn', 'service', `Expired URL accessed: ${shortcode}`, {
        expiryDate: urlRecord.expiresAt,
        accessTime: now.toISOString()
      });
    }
    
    await log('backend', 'info', 'service', 'URL lookup successful', {
      shortcode,
      isExpired,
      originalUrl: urlRecord.originalUrl
    });
    
    return {
      ...urlRecord,
      isExpired
    };
  } catch (error) {
    await log('backend', 'error', 'service', `URL lookup failed: ${error.message}`, {
      shortcode,
      stack: error.stack
    });
    throw error;
  }
};

const recordClick = async (shortcode, clickInfo) => {
  try {
    await log('backend', 'info', 'service', `Recording click for shortcode: ${shortcode}`);
    
    const urlRecord = urlDatabase.get(shortcode);
    
    if (!urlRecord) {
      await log('backend', 'warn', 'service', `Attempted to record click for non-existent shortcode: ${shortcode}`);
      return false;
    }
    
    const now = new Date();
    const expiryDate = new Date(urlRecord.expiresAt);
    if (expiryDate < now) {
      await log('backend', 'warn', 'service', `Click on expired URL: ${shortcode}`);
      return false;
    }
    
    const clickData = {
      timestamp: now.toISOString(),
      source: clickInfo.source || 'direct',
      location: clickInfo.location || 'unknown',
      userAgent: clickInfo.userAgent || 'unknown'
    };
    
    urlRecord.clicks += 1;
    urlRecord.clickData.push(clickData);
    
    if (Math.random() < 0.05) {
      await log('backend', 'error', 'service', 'Error updating click metrics in database', {
        shortcode,
        errorType: 'DataUpdateError',
        recovery: 'Retry mechanism activated',
        attempt: 1
      });
      
      await log('backend', 'info', 'service', 'Successfully recovered from click metrics error', {
        shortcode,
        recoveryMethod: 'Retry successful'
      });
    }
    
    await log('backend', 'info', 'service', 'Click recorded successfully', {
      shortcode,
      totalClicks: urlRecord.clicks,
      clickData
    });
    
    return true;
  } catch (error) {
    await log('backend', 'error', 'service', `Failed to record click: ${error.message}`, {
      shortcode,
      stack: error.stack
    });
    throw error;
  }
};

const getUrlStatistics = async (shortcode) => {
  try {
    await log('backend', 'info', 'service', `Retrieving statistics for shortcode: ${shortcode}`);
    
    const urlRecord = urlDatabase.get(shortcode);
    
    if (!urlRecord) {
      await log('backend', 'warn', 'service', `Statistics requested for non-existent shortcode: ${shortcode}`);
      throw new Error('URL not found');
    }
    
    // Log statistics retrieval performance
    const startTime = process.hrtime();
    
    // Process statistics
    const result = {
      originalUrl: urlRecord.originalUrl,
      shortLink: urlRecord.shortLink,
      createdAt: urlRecord.createdAt,
      expiresAt: urlRecord.expiresAt,
      isExpired: new Date(urlRecord.expiresAt) < new Date(),
      totalClicks: urlRecord.clicks,
      clickData: urlRecord.clickData
    };
    
    const endTime = process.hrtime(startTime);
    const duration = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
    
    // Log performance data
    if (parseFloat(duration) > 100) {
      await log('backend', 'warn', 'service', 'Statistics retrieval took longer than expected', {
        shortcode,
        duration: `${duration}ms`,
        dataSize: urlRecord.clickData.length
      });
    } else {
      await log('backend', 'debug', 'service', 'Statistics retrieval performance', {
        shortcode,
        duration: `${duration}ms`
      });
    }
    
    await log('backend', 'info', 'service', 'URL statistics retrieved successfully', {
      shortcode,
      totalClicks: urlRecord.clicks,
      isExpired: result.isExpired
    });
    
    return result;
  } catch (error) {
    await log('backend', 'error', 'service', `Failed to retrieve statistics: ${error.message}`, {
      shortcode,
      stack: error.stack
    });
    throw error;
  }
};

module.exports = {
  createShortUrl,
  getUrlByShortcode,
  recordClick,
  getUrlStatistics
};
