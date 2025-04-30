/**
 * Jest setup file - runs before tests
 * Sets up environment variables and mocks
 */

// Ensure all required environment variables are set for tests
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/marketplace_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.PORT = process.env.PORT || 3001;

// Handle canvas module that might cause issues in CI
try {
  require('canvas');
} catch (error) {
  console.warn('Canvas module not available, some tests may be skipped');
  // Create mock for canvas if needed
  jest.mock('canvas', () => ({
    createCanvas: jest.fn(() => ({
      getContext: jest.fn(() => ({
        measureText: jest.fn(() => ({ width: 10 })),
        fillText: jest.fn(),
        fillRect: jest.fn(),
      })),
    })),
    loadImage: jest.fn(() => Promise.resolve({})),
  }));
}

// Setup console output for CI - reduce noise
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// In CI environment, limit console output to keep logs cleaner
if (process.env.CI === 'true') {
  console.error = (...args) => {
    if (args[0] && args[0].includes('Critical dependency')) {
      return; // Suppress critical dependency warnings in CI
    }
    originalConsoleError(...args);
  };
  
  console.warn = (...args) => {
    if (args[0] && (
      args[0].includes('deprecated') || 
      args[0].includes('experimental')
    )) {
      return; // Suppress deprecation warnings in CI
    }
    originalConsoleWarn(...args);
  };
}

// Reset console after tests
afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});