import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Paper, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Accordion, 
  AccordionSummary, AccordionDetails, Chip, Card, CardContent,
  Grid, Alert, CircularProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getAllUrls } from '../services/urlService.jsx';
import Log from '../utils/logger.jsx';

const StatisticsPage = () => {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUrls = async () => {
      try {
        await Log('frontend', 'info', 'page', 'Fetching URLs for statistics page', {
          timestamp: new Date().toISOString(),
          operation: 'fetchUrls',
          status: 'start'
        });
        
        setLoading(true);
        const urlData = await getAllUrls();
        setUrls(urlData);
        
        await Log('frontend', 'info', 'page', `Fetched ${urlData.length} URLs for statistics`, {
          timestamp: new Date().toISOString(),
          operation: 'fetchUrls',
          status: 'complete',
          urlCount: urlData.length,
          activeUrls: urlData.filter(url => new Date(url.expiresAt) > new Date()).length,
          totalClicks: urlData.reduce((sum, url) => sum + url.clicks, 0)
        });
      } catch (err) {
        setError(err.message);
        await Log('frontend', 'error', 'page', `Failed to fetch URLs: ${err.message}`, {
          timestamp: new Date().toISOString(),
          operation: 'fetchUrls',
          status: 'error',
          errorMessage: err.message,
          stack: err.stack
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUrls();

    const intervalId = setInterval(fetchUrls, 30000);
    
    Log('frontend', 'info', 'page', 'Statistics page refresh interval set', {
      timestamp: new Date().toISOString(),
      refreshInterval: '30s'
    });
    
    return () => {
      clearInterval(intervalId);
      Log('frontend', 'info', 'page', 'Statistics page unmounted, cleared refresh interval', {
        timestamp: new Date().toISOString()
      });
    };
  }, []);

  const isExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date();
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getClicksBySource = (clickData) => {
    const sourceMap = {};
    clickData.forEach(click => {
      const source = click.source || 'unknown';
      sourceMap[source] = (sourceMap[source] || 0) + 1;
    });
    return sourceMap;
  };

  const getClicksByLocation = (clickData) => {
    const locationMap = {};
    clickData.forEach(click => {
      const location = click.location || 'unknown';
      locationMap[location] = (locationMap[location] || 0) + 1;
    });
    return locationMap;
  };

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          URL Statistics
        </Typography>
        <Typography variant="body1" paragraph align="center">
          View detailed statistics for all your shortened URLs
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : urls.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6">No shortened URLs found</Typography>
            <Typography variant="body2" color="textSecondary">
              Create some shortened URLs first
            </Typography>
          </Paper>
        ) : (
          <Box>
            {/* Summary Statistics Card */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Summary Statistics
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={4}>
                    <Typography variant="subtitle2">Total URLs</Typography>
                    <Typography variant="h4">{urls.length}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="subtitle2">Active URLs</Typography>
                    <Typography variant="h4">
                      {urls.filter(url => !isExpired(url.expiresAt)).length}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="subtitle2">Total Clicks</Typography>
                    <Typography variant="h4">
                      {urls.reduce((sum, url) => sum + url.clicks, 0)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* URLs Table */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Short URL</TableCell>
                    <TableCell>Original URL</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Expires</TableCell>
                    <TableCell>Clicks</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {urls.map((url) => (
                    <React.Fragment key={url.id}>
                      <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell component="th" scope="row">
                          {url.shortUrl}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {url.originalUrl}
                        </TableCell>
                        <TableCell>{formatDateTime(url.createdAt)}</TableCell>
                        <TableCell>{formatDateTime(url.expiresAt)}</TableCell>
                        <TableCell>{url.clicks}</TableCell>
                        <TableCell>
                          <Chip 
                            label={isExpired(url.expiresAt) ? "Expired" : "Active"} 
                            color={isExpired(url.expiresAt) ? "error" : "success"}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                      
                      {/* Expandable Click Data */}
                      <TableRow>
                        <TableCell colSpan={6} sx={{ pb: 0, pt: 0 }}>
                          <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Typography variant="subtitle2">Click Details</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                              {url.clicks > 0 ? (
                                <Grid container spacing={3}>
                                  {/* Click Sources */}
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" gutterBottom>
                                      Click Sources
                                    </Typography>
                                    <TableContainer>
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow>
                                            <TableCell>Source</TableCell>
                                            <TableCell>Count</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {Object.entries(getClicksBySource(url.clickData)).map(([source, count]) => (
                                            <TableRow key={source}>
                                              <TableCell>{source}</TableCell>
                                              <TableCell>{count}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </TableContainer>
                                  </Grid>
                                  
                                  {/* Click Locations */}
                                  <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" gutterBottom>
                                      Click Locations
                                    </Typography>
                                    <TableContainer>
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow>
                                            <TableCell>Location</TableCell>
                                            <TableCell>Count</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {Object.entries(getClicksByLocation(url.clickData)).map(([location, count]) => (
                                            <TableRow key={location}>
                                              <TableCell>{location}</TableCell>
                                              <TableCell>{count}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </TableContainer>
                                  </Grid>
                                  
                                  {/* Click Timeline */}
                                  <Grid item xs={12}>
                                    <Typography variant="subtitle2" gutterBottom>
                                      Click Timeline
                                    </Typography>
                                    <TableContainer>
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow>
                                            <TableCell>Timestamp</TableCell>
                                            <TableCell>Source</TableCell>
                                            <TableCell>Location</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {url.clickData.map((click, i) => (
                                            <TableRow key={i}>
                                              <TableCell>{formatDateTime(click.timestamp)}</TableCell>
                                              <TableCell>{click.source || 'unknown'}</TableCell>
                                              <TableCell>{click.location || 'unknown'}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </TableContainer>
                                  </Grid>
                                </Grid>
                              ) : (
                                <Typography variant="body2">No clicks recorded yet</Typography>
                              )}
                            </AccordionDetails>
                          </Accordion>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default StatisticsPage;
