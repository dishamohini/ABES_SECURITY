import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { API_BASE_URL } from './config'

// Dynamically redirect local API URLs to the deployed production host in production environments
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  if (typeof input === 'string' && input.startsWith('http://localhost:5000')) {
    input = input.replace('http://localhost:5000', API_BASE_URL);
  } else if (input instanceof URL && input.href.startsWith('http://localhost:5000')) {
    const newUrl = input.href.replace('http://localhost:5000', API_BASE_URL);
    input = new URL(newUrl);
  }
  return originalFetch(input, init);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
