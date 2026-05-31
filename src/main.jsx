import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import RouteScroller from './components/RouteScroller.jsx';

import './styles.css';
import './addons.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <RouteScroller />
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
