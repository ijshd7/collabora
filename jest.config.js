/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['**/tests/unit/**/*.test.js'],
  moduleFileExtensions: ['js'],
  collectCoverageFrom: [
    'content/shared/**/*.js',
    'content/features/**/*.js',
    'background/**/*.js',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage'
};
