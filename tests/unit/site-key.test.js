/**
 * Tests for content/shared/site-key.js
 */
const { loadScript } = require('../helpers/load-script');

function loadWithLocation(hostname) {
  delete window.Collabora;
  const mockLocation = { hostname: hostname };
  const fn = new Function(
    'window',
    'document',
    'location',
    'chrome',
    require('fs').readFileSync(require('path').resolve(__dirname, '../../content/shared/site-key.js'), 'utf8')
  );
  fn(window, document, mockLocation, global.chrome);
}

describe('Collabora.getSiteKey', () => {
  it('strips www. prefix from hostname', () => {
    loadWithLocation('www.example.com');
    expect(Collabora.getSiteKey()).toBe('example.com');
  });

  it('returns hostname unchanged when no www prefix', () => {
    loadWithLocation('example.com');
    expect(Collabora.getSiteKey()).toBe('example.com');
  });

  it('returns local when hostname is empty', () => {
    loadWithLocation('');
    expect(Collabora.getSiteKey()).toBe('local');
  });

  it('returns local on error', () => {
    loadWithLocation('example.com');
    const getSiteKey = Collabora.getSiteKey;
    const mockLocation = {
      get hostname() {
        throw new Error('access denied');
      }
    };
    const fn = new Function(
      'window',
      'document',
      'location',
      'chrome',
      require('fs').readFileSync(require('path').resolve(__dirname, '../../content/shared/site-key.js'), 'utf8')
    );
    fn(window, document, mockLocation, global.chrome);
    expect(Collabora.getSiteKey()).toBe('local');
  });
});
