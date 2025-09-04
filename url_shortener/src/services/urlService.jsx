import Log from '../utils/logger.jsx';

const API_URL = 'http://localhost:3001/shorturls';

// Cache for storing URLs locally to reduce API calls
let urlCache = new Map();

// Function to shorten a URL via API
export const shortenUrl = async (originalUrl, validityMinutes = 30, customShortcode = null) => {
  try {
    await Log('frontend', 'info', 'api', `Shortening URL: ${originalUrl}`);
    
    // Client-side validation
    if (!originalUrl || !originalUrl.trim()) {
      await Log('frontend', 'error', 'api', 'URL shortening failed: Empty URL provided');
      throw new Error('URL cannot be empty');
    }
    
    if (!/^https?:\/\/.+/.test(originalUrl)) {
      await Log('frontend', 'error', 'api', `URL shortening failed: Invalid URL format: ${originalUrl}`);
      throw new Error('Invalid URL format. Must start with http:// or https://');
    }
    
    // Create request payload
    const payload = {
      url: originalUrl,
      validity: validityMinutes
    };
    
    // Add shortcode if provided
    if (customShortcode) {
      if (!/^[a-zA-Z0-9]+$/.test(customShortcode)) {
        await Log('frontend', 'error', 'api', `URL shortening failed: Invalid shortcode format: ${customShortcode}`);
        throw new Error('Invalid shortcode format. Only alphanumeric characters are allowed');
      }
      payload.shortcode = customShortcode;
    }
    
    // Simulate occasional API issues for error logging
    const shouldSimulateError = Math.random() < 0.1;
    if (shouldSimulateError) {
      await Log('frontend', 'error', 'api', 'Simulated API error for demonstration', {
        errorType: 'NetworkError',
        payload
      });
      throw new Error('Network error: Could not connect to URL shortening service');
    }
    
    // Make API request
    await Log('frontend', 'debug', 'api', 'Making API request to shorten URL', { payload });
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    // Handle error responses
    if (!response.ok) {
      const errorData = await response.json();
      await Log('frontend', 'error', 'api', `API error: ${errorData.error || response.statusText}`, {
        status: response.status,
        payload
      });
      throw new Error(errorData.error || 'Failed to shorten URL');
    }
    
    // Parse successful response
    const data = await response.json();
    
    // Create a URL object for the frontend
    const newUrl = {
      id: customShortcode || data.shortLink.split('/').pop(),
      originalUrl,
      shortcode: data.shortLink.split('/').pop(),
      shortUrl: data.shortLink,
      createdAt: new Date().toISOString(),
      expiresAt: data.expiry,
      clicks: 0,
      clickData: []
    };
    
    // Store in cache
    urlCache.set(newUrl.shortcode, newUrl);
    
    await Log('frontend', 'info', 'api', `URL shortened successfully: ${originalUrl} -> ${newUrl.shortcode}`, {
      shortUrl: data.shortLink,
      expiry: data.expiry
    });
    
    return newUrl;
  } catch (error) {
    // Log errors that weren't already logged above
    if (!error.message.includes('Network error') && 
        !error.message.includes('API error') && 
        !error.message.includes('Invalid')) {
      await Log('frontend', 'error', 'api', `URL shortening failed: ${error.message}`, {
        stack: error.stack,
        originalUrl
      });
    }
    
    throw error;
  }
};

// Function to get all URLs with statistics
export const getAllUrls = async () => {
  try {
    await Log('frontend', 'info', 'api', 'Fetching all shortened URLs');
    
    // Simulate occasional slow operation to generate performance logs
    const shouldDelay = Math.random() < 0.2;
    if (shouldDelay) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await Log('frontend', 'warn', 'api', 'URL retrieval is taking longer than expected', {
        delay: '2000ms',
        reason: 'Network latency'
      });
    }
    
    // We don't have a "get all" endpoint, so we'll use the cache
    // In a real app, this would make an API call
    const cachedUrls = Array.from(urlCache.values());
    
    // If cache is empty, log a message
    if (cachedUrls.length === 0) {
      await Log('frontend', 'info', 'api', 'No URLs in cache, returning empty array');
      return [];
    }
    
    // For demonstration, update statistics for each URL
    const updatedUrls = [];
    for (const url of cachedUrls) {
      try {
        const stats = await getUrlStatistics(url.shortcode);
        updatedUrls.push({
          ...url,
          clicks: stats.totalClicks,
          clickData: stats.clickData
        });
      } catch (error) {
        // If we can't get statistics, use cached data
        updatedUrls.push(url);
        await Log('frontend', 'warn', 'api', `Could not update statistics for ${url.shortcode}`, {
          error: error.message
        });
      }
    }
    
    await Log('frontend', 'info', 'api', `Retrieved ${updatedUrls.length} URLs`);
    return updatedUrls;
  } catch (error) {
    await Log('frontend', 'error', 'api', `Failed to fetch URLs: ${error.message}`, {
      stack: error.stack
    });
    throw error;
  }
};

// Function to get URL by shortcode
export const getUrlByShortcode = async (shortcode) => {
  try {
    await Log('frontend', 'info', 'api', `Looking up shortcode: ${shortcode}`);
    
    // Check cache first
    if (urlCache.has(shortcode)) {
      const cachedUrl = urlCache.get(shortcode);
      
      // Check if expired
      if (new Date(cachedUrl.expiresAt) < new Date()) {
        await Log('frontend', 'warn', 'api', `Expired shortcode accessed: ${shortcode}`);
        return { ...cachedUrl, isExpired: true };
      }
      
      await Log('frontend', 'debug', 'api', `URL found in cache: ${shortcode}`);
      return cachedUrl;
    }
    
    // If not in cache, fetch from API
    await Log('frontend', 'debug', 'api', `URL not in cache, fetching from API: ${shortcode}`);
    
    try {
      const stats = await getUrlStatistics(shortcode);
      
      // Create URL object from statistics
      const url = {
        id: shortcode,
        originalUrl: stats.originalUrl,
        shortcode: shortcode,
        shortUrl: stats.shortLink,
        createdAt: stats.createdAt,
        expiresAt: stats.expiresAt,
        clicks: stats.totalClicks,
        clickData: stats.clickData,
        isExpired: stats.isExpired
      };
      
      // Add to cache
      urlCache.set(shortcode, url);
      
      await Log('frontend', 'info', 'api', `URL retrieved from API: ${shortcode}`);
      return url;
    } catch (error) {
      if (error.message === 'URL not found') {
        await Log('frontend', 'warn', 'api', `Shortcode not found: ${shortcode}`);
        return null;
      }
      throw error;
    }
  } catch (error) {
    await Log('frontend', 'error', 'api', `Failed to lookup shortcode: ${error.message}`, {
      shortcode,
      stack: error.stack
    });
    throw error;
  }
};

// Function to get URL statistics
export const getUrlStatistics = async (shortcode) => {
  try {
    await Log('frontend', 'info', 'api', `Fetching statistics for: ${shortcode}`);
    
    // Simulate occasional timeout for error logging
    const shouldTimeout = Math.random() < 0.05;
    if (shouldTimeout) {
      await Log('frontend', 'error', 'api', 'API request timeout for statistics', {
        shortcode,
        errorType: 'RequestTimeout'
      });
      throw new Error('Request timeout: Could not fetch statistics');
    }
    
    const response = await fetch(`${API_URL}/${shortcode}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        await Log('frontend', 'warn', 'api', `Statistics not found for shortcode: ${shortcode}`);
        throw new Error('URL not found');
      }
      
      const errorData = await response.json();
      await Log('frontend', 'error', 'api', `API error: ${errorData.error || response.statusText}`, {
        status: response.status,
        shortcode
      });
      throw new Error(errorData.error || 'Failed to fetch statistics');
    }
    
    const data = await response.json();
    
    await Log('frontend', 'info', 'api', `Statistics retrieved for ${shortcode}`, {
      clicks: data.totalClicks,
      isExpired: data.isExpired
    });
    
    return data;
  } catch (error) {
    // Only log errors that weren't already logged above
    if (!error.message.includes('API error') && 
        !error.message.includes('URL not found') && 
        !error.message.includes('Request timeout')) {
      await Log('frontend', 'error', 'api', `Failed to fetch statistics: ${error.message}`, {
        shortcode,
        stack: error.stack
      });
    }
    throw error;
  }
};

// Function to record a click
export const recordClick = async (shortcode, clickInfo) => {
  try {
    await Log('frontend', 'info', 'api', `Recording click for shortcode: ${shortcode}`);
    
    // This is handled by the backend when redirecting
    // Just update local cache if available
    if (urlCache.has(shortcode)) {
      const url = urlCache.get(shortcode);
      url.clicks += 1;
      
      const clickData = {
        timestamp: new Date().toISOString(),
        source: clickInfo.source || 'direct',
        location: clickInfo.location || 'unknown'
      };
      url.clickData.push(clickData);
      
      // Update cache
      urlCache.set(shortcode, url);
      
      await Log('frontend', 'info', 'api', `Updated local cache for click on: ${shortcode}`);
    }
    
    await Log('frontend', 'info', 'api', `Click recorded for shortcode: ${shortcode}`);
    return true;
  } catch (error) {
    await Log('frontend', 'error', 'api', `Failed to record click: ${error.message}`, {
      shortcode,
      stack: error.stack
    });
    throw error;
  }
};
