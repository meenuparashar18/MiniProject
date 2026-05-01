// client/src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './index.css'; // We'll keep the base styles for now
import App from './App';
import { registerServiceWorker } from './registerServiceWorker';

// This is the core logic that tells React where to render the application.
// It finds the HTML element with the id of 'root' in your public/index.html file.
const root = ReactDOM.createRoot(document.getElementById('root'));

// It then renders your main <App /> component inside that root element.
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);

registerServiceWorker();
