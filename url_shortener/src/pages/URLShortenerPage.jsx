import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, TextField, Button, 
  Paper, Grid, Alert, Snackbar, Card, CardContent, 
  Divider, IconButton, Tooltip
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import { shortenUrl } from '../services/urlService.jsx';
import Log from '../utils/logger.jsx';

const URLShortenerPage = () => {
  const initialUrlForm = {
    originalUrl: '',
    validityMinutes: 30,
    customShortcode: ''
  };

  const [urlForms, setUrlForms] = useState([{ ...initialUrlForm }]);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: ''
  });
  
  useEffect(() => {
    const logPageVisit = async () => {
      await Log('frontend', 'info', 'page', 'URL Shortener Page visited', {
        timestamp: new Date().toISOString(),
        urlFormsCount: urlForms.length,
        resultsCount: results.length,
        viewportSize: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      });
    };
    
    logPageVisit();
    
    return () => {
      const logPageExit = async () => {
        await Log('frontend', 'info', 'page', 'User left URL Shortener Page', {
          timestamp: new Date().toISOString(),
          sessionDuration: `${(new Date() - new Date(performance.timing.navigationStart)) / 1000}s`,
          urlsShortened: results.length
        });
      };
      logPageExit();
    };
  }, [urlForms.length, results.length]);

  const handleInputChange = (index, field, value) => {
    const newUrlForms = [...urlForms];
    newUrlForms[index] = { ...newUrlForms[index], [field]: value };
    setUrlForms(newUrlForms);
    Log('frontend', 'debug', 'page', `URL form ${index + 1} updated: ${field}`);
  };

  const addUrlForm = () => {
    if (urlForms.length < 5) {
      setUrlForms([...urlForms, { ...initialUrlForm }]);
      Log('frontend', 'info', 'page', 'Added new URL form');
    } else {
      setError('Maximum of 5 URLs allowed');
      Log('frontend', 'warn', 'page', 'Attempted to add more than 5 URL forms');
    }
  };

  const removeUrlForm = (index) => {
    const newUrlForms = urlForms.filter((_, i) => i !== index);
    setUrlForms(newUrlForms);
    Log('frontend', 'info', 'page', `Removed URL form ${index + 1}`);
  };

  const handleShortenUrl = async (index) => {
    try {
      const form = urlForms[index];
      Log('frontend', 'info', 'page', `Shortening URL ${index + 1}: ${form.originalUrl}`);

      if (!form.originalUrl) {
        await Log('frontend', 'error', 'validation', 'Empty URL validation error', { formIndex: index });
        throw new Error('URL cannot be empty');
      }

      if (!/^https?:\/\/.+/.test(form.originalUrl)) {
        await Log('frontend', 'error', 'validation', 'Invalid URL format', { 
          formIndex: index, 
          url: form.originalUrl 
        });
        throw new Error('Invalid URL format. Must start with http:// or https://');
      }

      if (form.customShortcode && !/^[a-zA-Z0-9]+$/.test(form.customShortcode)) {
        await Log('frontend', 'error', 'validation', 'Invalid shortcode format', { 
          formIndex: index, 
          shortcode: form.customShortcode 
        });
        throw new Error('Invalid shortcode format. Only alphanumeric characters are allowed');
      }

      await Log('frontend', 'info', 'process', 'URL validation passed', { 
        formIndex: index,
        validityMinutes: form.validityMinutes,
        hasCustomShortcode: !!form.customShortcode
      });
      const shortenedUrl = await shortenUrl(
        form.originalUrl,
        form.validityMinutes,
        form.customShortcode || null
      );

      setResults(prevResults => {
        const existingIndex = prevResults.findIndex(r => 
          r.originalUrl === form.originalUrl && r.index === index
        );

        if (existingIndex >= 0) {
          const newResults = [...prevResults];
          newResults[existingIndex] = { ...shortenedUrl, index };
          Log('frontend', 'info', 'results', 'Updated existing result', { 
            resultIndex: existingIndex,
            shortUrl: shortenedUrl.shortUrl
          });
          return newResults;
        }

        Log('frontend', 'info', 'results', 'Added new result', {
          resultCount: prevResults.length + 1,
          shortUrl: shortenedUrl.shortUrl
        });
        return [...prevResults, { ...shortenedUrl, index }];
      });

      // Reset form values
      const newUrlForms = [...urlForms];
      newUrlForms[index] = { ...initialUrlForm };
      setUrlForms(newUrlForms);

      setSnackbar({
        open: true,
        message: 'URL shortened successfully!'
      });
    } catch (error) {
      setError(error.message);
      Log('frontend', 'error', 'page', `URL shortening failed: ${error.message}`);
    }
  };

  const handleShortenAll = async () => {
    Log('frontend', 'info', 'page', 'Attempting to shorten all URLs');
    let hasError = false;
    
    for (let i = 0; i < urlForms.length; i++) {
      if (urlForms[i].originalUrl) {
        try {
          await handleShortenUrl(i);
        } catch (error) {
          hasError = true;
          Log('frontend', 'error', 'page', `Failed to shorten URL ${i + 1}: ${error.message}`);
        }
      }
    }

    if (!hasError) {
      setSnackbar({
        open: true,
        message: 'All URLs shortened successfully!'
      });
      Log('frontend', 'info', 'page', 'All URLs shortened successfully');
    }
  };

  const handleCopyToClipboard = async (shortUrl) => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setSnackbar({
        open: true,
        message: 'Copied to clipboard!'
      });
      Log('frontend', 'info', 'page', `Short URL copied to clipboard: ${shortUrl}`);
    } catch (error) {
      setError('Failed to copy to clipboard');
      Log('frontend', 'error', 'page', `Failed to copy to clipboard: ${error.message}`);
    }
  };

  const handleDeleteResult = (id) => {
    setResults(results.filter(result => result.id !== id));
    Log('frontend', 'info', 'page', `Deleted result with ID: ${id}`);
  };

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          URL Shortener
        </Typography>
        <Typography variant="body1" paragraph align="center">
          Shorten up to 5 URLs simultaneously
        </Typography>

        <Box my={3}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {urlForms.map((form, index) => (
            <Paper key={index} elevation={2} sx={{ p: 2, mb: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12}>
                  <Typography variant="h6">URL {index + 1}</Typography>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Original URL"
                    variant="outlined"
                    value={form.originalUrl}
                    onChange={(e) => handleInputChange(index, 'originalUrl', e.target.value)}
                    placeholder="https://example.com/very-long-url"
                    required
                    error={form.originalUrl && !/^https?:\/\/.+/.test(form.originalUrl)}
                    helperText={
                      form.originalUrl && !/^https?:\/\/.+/.test(form.originalUrl)
                        ? "URL must start with http:// or https://"
                        : ""
                    }
                  />
                </Grid>

                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Validity Period (minutes)"
                    variant="outlined"
                    type="number"
                    value={form.validityMinutes}
                    onChange={(e) => handleInputChange(index, 'validityMinutes', e.target.value)}
                    inputProps={{ min: 1 }}
                  />
                </Grid>

                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Custom Shortcode (optional)"
                    variant="outlined"
                    value={form.customShortcode}
                    onChange={(e) => handleInputChange(index, 'customShortcode', e.target.value)}
                    placeholder="mycode"
                    error={form.customShortcode && !/^[a-zA-Z0-9]+$/.test(form.customShortcode)}
                    helperText={
                      form.customShortcode && !/^[a-zA-Z0-9]+$/.test(form.customShortcode)
                        ? "Only alphanumeric characters allowed"
                        : ""
                    }
                  />
                </Grid>

                <Grid item xs={6}>
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={() => handleShortenUrl(index)}
                    disabled={!form.originalUrl || (form.customShortcode && !/^[a-zA-Z0-9]+$/.test(form.customShortcode))}
                  >
                    Shorten URL {index + 1}
                  </Button>
                </Grid>

                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    color="error"
                    fullWidth
                    onClick={() => removeUrlForm(index)}
                    disabled={urlForms.length === 1}
                  >
                    Remove
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          ))}

          <Box mt={2} display="flex" justifyContent="space-between">
            <Button
              variant="outlined"
              onClick={addUrlForm}
              disabled={urlForms.length >= 5}
            >
              Add Another URL
            </Button>

            <Button
              variant="contained"
              color="secondary"
              onClick={handleShortenAll}
              disabled={urlForms.every(form => !form.originalUrl)}
            >
              Shorten All URLs
            </Button>
          </Box>
        </Box>

        {/* Results section */}
        {results.length > 0 && (
          <Box mt={4}>
            <Typography variant="h5" gutterBottom>
              Your Shortened URLs
            </Typography>
            
            {results.map(result => {
              // Calculate expiry date from ISO string
              const expiryDate = new Date(result.expiresAt);
              
              return (
                <Card key={result.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={10}>
                        <Typography variant="subtitle1" noWrap>
                          Original: {result.originalUrl}
                        </Typography>
                      </Grid>
                      <Grid item xs={2} textAlign="right">
                        <IconButton size="small" onClick={() => handleDeleteResult(result.id)}>
                          <DeleteIcon color="error" />
                        </IconButton>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Divider />
                      </Grid>
                      
                      <Grid item xs={9}>
                        <Typography variant="h6" color="primary">
                          {result.shortUrl}
                        </Typography>
                      </Grid>
                      <Grid item xs={3} textAlign="right">
                        <Tooltip title="Copy to clipboard">
                          <IconButton onClick={() => handleCopyToClipboard(result.shortUrl)}>
                            <ContentCopyIcon />
                          </IconButton>
                        </Tooltip>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Typography variant="body2" color="textSecondary">
                          Expires: {expiryDate.toLocaleString()}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          message={snackbar.message}
        />
      </Box>
    </Container>
  );
};

export default URLShortenerPage;
