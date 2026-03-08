/**
 * Load and execute a content script in the test environment.
 */
const fs = require('fs');
const path = require('path');

function loadScript(relativePath) {
  const fullPath = path.resolve(__dirname, '../..', relativePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const fn = new Function('window', 'document', 'location', 'chrome', content);
  fn(window, document, window.location, global.chrome);
}

module.exports = { loadScript };
