/**
 * Jest configuration for the main project
 */
module.exports = {
  // Common configuration for all tests
  testEnvironment: 'node',
  collectCoverage: false,
  coverageReporters: ['text', 'lcov'],
  
  // Use different configurations based on test path
  projects: [
    // Default configuration for CommonJS tests
    {
      displayName: 'Main',
      testMatch: [
        '<rootDir>/tests/**/*.test.js',
        '<rootDir>/backend/tests/**/*.test.js',
        '!<rootDir>/arzani-ai/**/*.test.js'
      ],
      testEnvironment: 'node'
    },
    
    // Configuration for ES Modules in arzani-ai directory
    {
      displayName: 'ArzaniAI',
      rootDir: './arzani-ai',
      transform: {},
      extensionsToTreatAsEsm: ['.js'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
      },
      testEnvironment: 'node',
      transformIgnorePatterns: [
        'node_modules/(?!(uuid|openai|chai|other-esm-packages)/)'
      ],
      testMatch: [
        '<rootDir>/backend/tests/**/*.test.js'
      ]
    }
  ]
};
