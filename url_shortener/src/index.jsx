import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import reportWebVitals from './reportWebVitals';


window.process = window.process || {};
window.process.env = window.process.env || {};
window.process.env.REACT_APP_ACCESS_TOKEN = 'your_access_token_here';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);


reportWebVitals();
