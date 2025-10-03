// Environment configuration for SQLHelper
// This file provides environment variables to the renderer process

export const env = {
  NODE_ENV: 'development',
  RENDERER_URL: 'http://localhost:3000',
  VERSION: '0.1.0'
};

// Make env available globally if needed
if (typeof window !== 'undefined') {
  window.__ENV__ = env;
}