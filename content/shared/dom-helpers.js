/**
 * Collabora — DOM helper utilities
 */
(function () {
  'use strict';

  window.Collabora = window.Collabora || {};

  var observerCounter = 0;
  var observers = {};

  var dom = {};

  /**
   * Create an element with attributes and children.
   */
  dom.create = function (tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === 'className') {
          el.className = attrs[key];
        } else if (key === 'textContent') {
          el.textContent = attrs[key];
        } else if (key.startsWith('on')) {
          el.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
        } else {
          el.setAttribute(key, attrs[key]);
        }
      });
    }
    if (children) {
      children.forEach(function (child) {
        if (typeof child === 'string') {
          el.appendChild(document.createTextNode(child));
        } else if (child) {
          el.appendChild(child);
        }
      });
    }
    return el;
  };

  /**
   * Inject a <style> element with deduplication by id.
   */
  dom.addStyle = function (id, cssText) {
    dom.removeStyle(id);
    var style = document.createElement('style');
    style.id = 'collabora-style-' + id;
    style.setAttribute('data-collabora', 'true');
    style.textContent = cssText;
    (document.head || document.documentElement).appendChild(style);
    return style;
  };

  /**
   * Remove an injected style by id.
   */
  dom.removeStyle = function (id) {
    var existing = document.getElementById('collabora-style-' + id);
    if (existing) {
      existing.remove();
    }
  };

  /**
   * Observe the DOM for new elements matching a selector.
   * Calls callback for each matching element (existing and new).
   * Returns an observer ID for cleanup.
   */
  dom.observeDOM = function (selector, callback, root) {
    var id = ++observerCounter;
    root = root || document.body;

    // Process existing elements
    root.querySelectorAll(selector).forEach(callback);

    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          if (node.matches && node.matches(selector)) {
            callback(node);
          }
          if (node.querySelectorAll) {
            node.querySelectorAll(selector).forEach(callback);
          }
        });
      });
    });

    observer.observe(root, { childList: true, subtree: true });
    observers[id] = observer;
    return id;
  };

  /**
   * Stop a DOM observer by ID.
   */
  dom.stopObserving = function (observerId) {
    if (observers[observerId]) {
      observers[observerId].disconnect();
      delete observers[observerId];
    }
  };

  /**
   * Find the main readable content area on the page.
   */
  dom.getReadableContent = function () {
    // Try semantic elements first
    var candidates = ['article', 'main', '[role="main"]', '.post-content', '.article-body', '.entry-content'];
    for (var i = 0; i < candidates.length; i++) {
      var el = document.querySelector(candidates[i]);
      if (el && el.textContent.trim().length > 200) {
        return el;
      }
    }

    // Fallback: find the element with the most text
    var best = document.body;
    var bestLen = 0;
    var blocks = document.querySelectorAll('div, section');
    blocks.forEach(function (block) {
      var text = block.textContent.trim();
      if (text.length > bestLen && text.length > 200) {
        // Prefer elements that aren't wrapping the entire page
        var ratio = text.length / document.body.textContent.trim().length;
        if (ratio < 0.95) {
          bestLen = text.length;
          best = block;
        }
      }
    });
    return best;
  };

  /**
   * Estimate read time in minutes.
   */
  dom.estimateReadTime = function (textContent, wpm) {
    wpm = wpm || 200;
    var words = textContent.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / wpm));
  };

  window.Collabora.dom = dom;
})();
