import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Box, Typography, CircularProgress, Button, Paper } from '@mui/material';
import { getUrlByShortcode, recordClick } from '../services/urlService.jsx';
import Log from '../utils/logger.jsx';

const RedirectPage = () => {
  const { shortcode } = useParams();
  const [status, setStatus] = useState('loading'); // loading, redirecting, error, expired
  const [url, setUrl] = useState(null);

  useEffect(() => {
    const loadAndRedirect = async () => {
      try {
        await Log('frontend', 'info', 'page', `Redirect page loaded for shortcode: ${shortcode}`, {
          timestamp: new Date().toISOString(),
          shortcode: shortcode,
          referrer: document.referrer || 'direct',
          userAgent: navigator.userAgent,
          action: 'redirect_start'
        });
        
        const urlInfo = await getUrlByShortcode(shortcode);
        
        if (!urlInfo) {
          setStatus('error');
          await Log('frontend', 'error', 'page', `Shortcode not found: ${shortcode}`, {
            timestamp: new Date().toISOString(),
            shortcode: shortcode,
            action: 'redirect_error',
            errorType: 'not_found'
          });
          return;
        }
        
        setUrl(urlInfo);
        
        if (urlInfo.isExpired) {
          setStatus('expired');
          await Log('frontend', 'warn', 'page', `Expired shortcode accessed: ${shortcode}`, {
            timestamp: new Date().toISOString(),
            shortcode: shortcode,
            action: 'redirect_error',
            errorType: 'expired',
            expiryDate: urlInfo.expiresAt
          });
          return;
        }
        
        const clickInfo = {
          source: document.referrer || 'direct',
          location: 'browser',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          screenSize: `${window.screen.width}x${window.screen.height}`
        };
        
        await recordClick(shortcode, clickInfo);
        await Log('frontend', 'info', 'page', `Recorded click for ${shortcode}, redirecting to destination`, {
          timestamp: new Date().toISOString(),
          shortcode: shortcode,
          originalUrl: urlInfo.originalUrl,
          action: 'redirect_success',
          clickInfo: clickInfo
        });
        
        setStatus('redirecting');
        
        setTimeout(() => {
          window.location.href = urlInfo.originalUrl;
          Log('frontend', 'info', 'page', `User redirected from ${shortcode}`, {
            timestamp: new Date().toISOString(),
            shortcode: shortcode,
            destinationUrl: urlInfo.originalUrl,
            action: 'redirect_complete'
          });
        }, 1500);
      } catch (error) {
        setStatus('error');
        await Log('frontend', 'error', 'page', `Redirect failed: ${error.message}`, {
          timestamp: new Date().toISOString(),
          shortcode: shortcode,
          action: 'redirect_error',
          errorType: 'exception',
          errorMessage: error.message,
          stack: error.stack
        });
      }
    };
    
    loadAndRedirect();
  }, [shortcode]);

  // Render appropriate UI based on status
  return (
    <Container maxWidth="sm">
      <Box my={4} textAlign="center">
        {status === 'loading' && (
          <>
            <CircularProgress size={60} />
            <Typography variant="h5" component="h1" gutterBottom mt={2}>
              Loading URL...
            </Typography>
          </>
        )}
        
        {status === 'redirecting' && (
          <>
            <CircularProgress size={60} color="success" />
            <Typography variant="h5" component="h1" gutterBottom mt={2}>
              Redirecting...
            </Typography>
            <Typography variant="body1">
              You are being redirected to: {url?.originalUrl}
            </Typography>
          </>
        )}
        
        {status === 'expired' && (
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" component="h1" gutterBottom color="error">
              Link Expired
            </Typography>
            <Typography variant="body1" paragraph>
              The shortened URL you're trying to access has expired.
            </Typography>
            <Button component={Link} to="/" variant="contained">
              Go to Homepage
            </Button>
          </Paper>
        )}
        
        {status === 'error' && (
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h5" component="h1" gutterBottom color="error">
              Link Not Found
            </Typography>
            <Typography variant="body1" paragraph>
              The shortened URL you're trying to access doesn't exist or has been removed.
            </Typography>
            <Button component={Link} to="/" variant="contained">
              Go to Homepage
            </Button>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default RedirectPage;
