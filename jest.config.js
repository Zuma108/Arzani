/**
 * Jest configuration for the main project
 */
module.exports = {
  // Common configuration for all tests
  testEnvironment: 'node',
  collectCoverage: false,
  coverageReporters: ['text', 'lcov'],
  // Increase timeout for tests to avoid CI failures
  testTimeout: 30000,
  // Ignore some problematic node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(canvas|konva|other-esm-packages)/)'
  ],
  // Setup files - helps with environment variables
  setupFiles: ['<rootDir>/tests/setup.js'],
  
  // Use different configurations based on test path
  projects: [
    // Default configuration for CommonJS tests
    {
      displayName: {
        name: 'MAIN',
        color: 'blue'
      },
      testMatch: [
        '<rootDir>/tests/**/*.test.js',
        '<rootDir>/backend/tests/**/*.test.js',
        '!<rootDir>/arzani-ai/**/*.test.js'
      ],
      testEnvironment: 'node'
    },
    
    // Configuration for ES Modules in arzani-ai directory
    {
      displayName: {
        name: 'ARZANI',
        color: 'yellow'
      },
      rootDir: './arzani-ai',
      transform: {},
      extensionsToTreatAsEsm: ['.js'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
      },
      testEnvironment: 'node',
      transformIgnorePatterns: [
        'node_modules/(?!(uuid|openai|chai|canvas|other-esm-packages)/)'
      ],
      testMatch: [
        '<rootDir>/backend/tests/**/*.test.js'
      ]
    }
  ]
};
