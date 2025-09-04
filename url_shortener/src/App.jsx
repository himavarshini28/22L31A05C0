import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { 
  AppBar, Toolbar, Typography, Container, Box, 
  CssBaseline, Button, IconButton, Drawer, 
  List, ListItem, ListItemText, useMediaQuery, Divider 
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import URLShortenerPage from './pages/URLShortenerPage.jsx';
import StatisticsPage from './pages/StatisticsPage.jsx';
import RedirectPage from './pages/RedirectPage.jsx';
import Log from './utils/logger.jsx';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

function App() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const logAppInit = async () => {
      await Log('frontend', 'info', 'page', 'Application initialized', {
        timestamp: new Date().toISOString(),
        appVersion: '1.0.0',
        theme: theme.palette.mode,
        viewport: {
          isMobile: isMobile,
          width: window.innerWidth,
          height: window.innerHeight
        }
      });
    };
    
    logAppInit();
  }, [isMobile]);

  const handleDrawerToggle = async () => {
    const newState = !mobileOpen;
    setMobileOpen(newState);
    await Log('frontend', 'info', 'interaction', 'Mobile drawer toggled', {
      action: 'toggleDrawer',
      newState: newState ? 'open' : 'closed',
      isMobile: isMobile
    });
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        URL Shortener
      </Typography>
      <Divider />
      <List>
        <ListItem button component={Link} to="/">
          <ListItemText primary="Shorten URLs" />
        </ListItem>
        <ListItem button component={Link} to="/statistics">
          <ListItemText primary="Statistics" />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <AppBar position="static">
            <Toolbar>
              {isMobile && (
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="start"
                  onClick={handleDrawerToggle}
                  sx={{ mr: 2 }}
                >
                  <MenuIcon />
                </IconButton>
              )}
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                URL Shortener
              </Typography>
              {!isMobile && (
                <Box>
                  <Button color="inherit" component={Link} to="/">
                    Shorten URLs
                  </Button>
                  <Button color="inherit" component={Link} to="/statistics">
                    Statistics
                  </Button>
                </Box>
              )}
            </Toolbar>
          </AppBar>
          
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
          >
            {drawer}
          </Drawer>
          
          <Container component="main" sx={{ flexGrow: 1, py: 3 }}>
            <Routes>
              <Route path="/" element={<URLShortenerPage />} />
              <Route path="/statistics" element={<StatisticsPage />} />
              <Route path="/:shortcode" element={<RedirectPage />} />
            </Routes>
          </Container>
          
          <Box component="footer" sx={{ py: 3, bgcolor: 'background.paper', mt: 'auto' }}>
            <Container maxWidth="sm">
              <Typography variant="body2" color="text.secondary" align="center">
                URL Shortener © {new Date().getFullYear()}
              </Typography>
            </Container>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
