/**
 * Tests for content/shared/dom-helpers.js
 */
const { loadScript } = require('../helpers/load-script');

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  delete window.Collabora;
  loadScript('content/shared/dom-helpers.js');
});

describe('Collabora.dom.create', () => {
  it('creates element with tag and attributes', () => {
    const el = Collabora.dom.create('div', { id: 'test', className: 'foo' });
    expect(el.tagName).toBe('DIV');
    expect(el.id).toBe('test');
    expect(el.className).toBe('foo');
  });

  it('creates element with textContent', () => {
    const el = Collabora.dom.create('span', { textContent: 'hello' });
    expect(el.textContent).toBe('hello');
  });

  it('creates element with children', () => {
    const child = document.createElement('span');
    const el = Collabora.dom.create('div', null, ['text', child]);
    expect(el.childNodes.length).toBe(2);
    expect(el.childNodes[0].textContent).toBe('text');
    expect(el.childNodes[1]).toBe(child);
  });

  it('attaches event handlers via on* attrs', () => {
    const handler = jest.fn();
    const el = Collabora.dom.create('button', { onClick: handler });
    el.click();
    expect(handler).toHaveBeenCalled();
  });
});

describe('Collabora.dom.addStyle and removeStyle', () => {
  it('injects style element and removes by id', () => {
    Collabora.dom.addStyle('test-id', 'body { color: red; }');
    const style = document.getElementById('collabora-style-test-id');
    expect(style).toBeTruthy();
    expect(style.textContent).toContain('color: red');
    Collabora.dom.removeStyle('test-id');
    expect(document.getElementById('collabora-style-test-id')).toBeNull();
  });

  it('deduplicates when adding same id', () => {
    Collabora.dom.addStyle('dup', 'a {}');
    Collabora.dom.addStyle('dup', 'b {}');
    const styles = document.querySelectorAll('#collabora-style-dup');
    expect(styles.length).toBe(1);
    expect(styles[0].textContent).toBe('b {}');
  });
});

describe('Collabora.dom.observeDOM and stopObserving', () => {
  it('fires callback for existing matching elements', () => {
    document.body.innerHTML = '<div class="target">x</div>';
    const callback = jest.fn();
    const id = Collabora.dom.observeDOM('.target', callback);
    expect(callback).toHaveBeenCalledTimes(1);
    Collabora.dom.stopObserving(id);
  });

  it('fires callback when new matching elements are added', (done) => {
    const callback = jest.fn();
    const id = Collabora.dom.observeDOM('.dynamic', callback);
    expect(callback).toHaveBeenCalledTimes(0);
    const div = document.createElement('div');
    div.className = 'dynamic';
    document.body.appendChild(div);
    setTimeout(() => {
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(div);
      Collabora.dom.stopObserving(id);
      done();
    }, 10);
  });

  it('stopObserving disconnects observer', () => {
    document.body.innerHTML = '<div class="obs">x</div>';
    const callback = jest.fn();
    const id = Collabora.dom.observeDOM('.obs', callback);
    Collabora.dom.stopObserving(id);
    const div = document.createElement('div');
    div.className = 'obs';
    document.body.appendChild(div);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe('Collabora.dom.getReadableContent', () => {
  it('returns article with sufficient text', () => {
    document.body.innerHTML = '<article>' + 'x '.repeat(150) + '</article>';
    const el = Collabora.dom.getReadableContent();
    expect(el.tagName).toBe('ARTICLE');
  });

  it('returns main with sufficient text', () => {
    document.body.innerHTML = '<main>' + 'x '.repeat(150) + '</main>';
    const el = Collabora.dom.getReadableContent();
    expect(el.tagName).toBe('MAIN');
  });

  it('falls back to body when no semantic element has enough text', () => {
    document.body.innerHTML = '<article>short</article><div>' + 'x '.repeat(150) + '</div>';
    const el = Collabora.dom.getReadableContent();
    expect(el).toBe(document.body);
  });
});

describe('Collabora.dom.estimateReadTime', () => {
  it('estimates read time in minutes', () => {
    const text = 'word '.repeat(400);
    expect(Collabora.dom.estimateReadTime(text, 200)).toBe(2);
  });

  it('returns at least 1 minute', () => {
    expect(Collabora.dom.estimateReadTime('few words', 200)).toBe(1);
  });

  it('uses custom wpm', () => {
    const text = 'word '.repeat(100);
    expect(Collabora.dom.estimateReadTime(text, 100)).toBe(1);
    expect(Collabora.dom.estimateReadTime(text, 50)).toBe(2);
  });
});
