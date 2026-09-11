/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch:       ['**/tests/**/*.test.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/scripts/**',
  ],
  testTimeout: 15000,
  // Set env vars for all tests
  testEnvironmentOptions: {},
  setupFiles: ['<rootDir>/tests/jest.env.js'],
}
