/**
 * Collabora — Focus Reader (TTS)
 * Text-to-speech with word highlighting using the Web Speech API.
 */
(function () {
  'use strict';

  var ttsBar = null;
  var isPlaying = false;
  var isPaused = false;
  var utterances = [];
  var currentUtteranceIndex = 0;
  var textNodes = [];       // { node, start, end } — offset map
  var totalText = '';
  var currentHighlight = null;
  var rate = 1.0;
  var selectedVoice = null;

  /**
   * Build a flat text string and a map from character offsets to DOM text nodes.
   */
  function buildTextMap(root) {
    textNodes = [];
    totalText = '';

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        var tag = parent.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
        if (node.textContent.trim().length === 0) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    var node;
    while ((node = walker.nextNode())) {
      var start = totalText.length;
      totalText += node.textContent;
      textNodes.push({ node: node, start: start, end: totalText.length });
      totalText += ' ';
    }
  }

  /**
   * Split text into sentence-sized chunks (under ~200 chars each to stay well under Chrome's limit).
   */
  function chunkText(text) {
    var sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
    var chunks = [];
    var current = '';

    sentences.forEach(function (s) {
      if (current.length + s.length > 200) {
        if (current) chunks.push(current.trim());
        current = s;
      } else {
        current += s;
      }
    });
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }

  /**
   * Highlight a word at the given character offset in the flat text.
   */
  function highlightWord(charIndex, charLength) {
    removeHighlight();

    // Find the text node containing this offset
    var globalStart = 0;
    for (var c = 0; c < currentUtteranceIndex; c++) {
      globalStart += utterances[c].text.length + 1;
    }
    var absStart = globalStart + charIndex;
    var absEnd = absStart + charLength;

    for (var i = 0; i < textNodes.length; i++) {
      var tn = textNodes[i];
      if (tn.end <= absStart) continue;
      if (tn.start >= absEnd) break;

      // This text node contains (part of) the word
      var localStart = Math.max(0, absStart - tn.start);
      var localEnd = Math.min(tn.node.textContent.length, absEnd - tn.start);

      try {
        var range = document.createRange();
        range.setStart(tn.node, localStart);
        range.setEnd(tn.node, localEnd);

        var highlight = document.createElement('collabora-highlight');
        highlight.setAttribute('data-collabora', 'true');
        range.surroundContents(highlight);

        currentHighlight = highlight;

        // Scroll into view if needed
        highlight.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } catch (e) {
        // Range manipulation can fail on complex DOM
      }
      break;
    }
  }

  function removeHighlight() {
    if (currentHighlight) {
      var parent = currentHighlight.parentNode;
      if (parent) {
        while (currentHighlight.firstChild) {
          parent.insertBefore(currentHighlight.firstChild, currentHighlight);
        }
        parent.removeChild(currentHighlight);
        parent.normalize();
      }
      currentHighlight = null;
    }
  }

  function speakChunk(index) {
    if (index >= utterances.length) {
      stopSpeaking();
      return;
    }
    currentUtteranceIndex = index;
    var utt = utterances[index];

    utt.rate = rate;
    if (selectedVoice) utt.voice = selectedVoice;

    utt.onboundary = function (e) {
      if (e.name === 'word') {
        highlightWord(e.charIndex, e.charLength || 1);
      }
    };

    utt.onend = function () {
      removeHighlight();
      speakChunk(index + 1);
    };

    utt.onerror = function () {
      removeHighlight();
      speakChunk(index + 1);
    };

    speechSynthesis.speak(utt);
  }

  function startSpeaking() {
    if (isPaused) {
      speechSynthesis.resume();
      isPaused = false;
      isPlaying = true;
      updateButtonLabel();
      return;
    }

    var content = Collabora.dom.getReadableContent();
    if (!content) return;

    buildTextMap(content);
    var chunks = chunkText(totalText);

    utterances = chunks.map(function (text) {
      return new SpeechSynthesisUtterance(text);
    });

    currentUtteranceIndex = 0;
    isPlaying = true;
    updateButtonLabel();
    speakChunk(0);
  }

  function pauseSpeaking() {
    speechSynthesis.pause();
    isPaused = true;
    isPlaying = false;
    updateButtonLabel();
  }

  function stopSpeaking() {
    speechSynthesis.cancel();
    removeHighlight();
    isPlaying = false;
    isPaused = false;
    currentUtteranceIndex = 0;
    updateButtonLabel();
  }

  function updateButtonLabel() {
    var btn = ttsBar && ttsBar.querySelector('.collabora-tts-playpause');
    if (btn) {
      btn.textContent = isPlaying ? 'Pause' : 'Play';
    }
  }

  function populateVoices(select) {
    var voices = speechSynthesis.getVoices();
    select.innerHTML = '';

    voices.forEach(function (voice, i) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = voice.name + (voice.lang ? ' (' + voice.lang + ')' : '');
      if (voice.default) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener('change', function () {
      var voices = speechSynthesis.getVoices();
      selectedVoice = voices[parseInt(select.value, 10)] || null;
    });
  }

  function createTTSBar() {
    ttsBar = Collabora.dom.create('div', {
      className: 'collabora-tts-bar',
      'data-collabora': 'true'
    });

    // Play/Pause button
    var playBtn = Collabora.dom.create('button', {
      className: 'collabora-tts-playpause',
      textContent: 'Play',
      onClick: function () {
        if (isPlaying) {
          pauseSpeaking();
        } else {
          startSpeaking();
        }
      }
    });

    // Stop button
    var stopBtn = Collabora.dom.create('button', {
      textContent: 'Stop',
      onClick: stopSpeaking
    });

    // Speed control
    var speedLabel = Collabora.dom.create('label', {}, [
      'Speed: '
    ]);
    var speedSlider = Collabora.dom.create('input', {
      type: 'range',
      min: '0.5',
      max: '3',
      step: '0.25',
      value: String(rate)
    });
    var speedValue = Collabora.dom.create('span', { textContent: rate + 'x' });
    speedSlider.addEventListener('input', function () {
      rate = parseFloat(speedSlider.value);
      speedValue.textContent = rate + 'x';
    });
    speedLabel.appendChild(speedSlider);
    speedLabel.appendChild(speedValue);

    // Voice selector
    var voiceLabel = Collabora.dom.create('label', {}, ['Voice: ']);
    var voiceSelect = Collabora.dom.create('select', { className: 'collabora-tts-voice' });
    voiceLabel.appendChild(voiceSelect);

    // Populate voices (may need to wait for voiceschanged)
    populateVoices(voiceSelect);
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.addEventListener('voiceschanged', function () {
        populateVoices(voiceSelect);
      });
    }

    ttsBar.appendChild(playBtn);
    ttsBar.appendChild(stopBtn);
    ttsBar.appendChild(speedLabel);
    ttsBar.appendChild(voiceLabel);

    document.body.appendChild(ttsBar);
  }

  function removeTTSBar() {
    if (ttsBar) {
      ttsBar.remove();
      ttsBar = null;
    }
  }

  Collabora.features.register('focus-reader', {
    defaults: { enabled: false, rate: 1.0 },

    enable: function (settings) {
      rate = settings.rate || 1.0;
      createTTSBar();

      // Auto-disable reading ruler during TTS
      if (Collabora.features.isActive('reading-ruler')) {
        Collabora.features.disable('reading-ruler');
      }
    },

    disable: function () {
      stopSpeaking();
      removeTTSBar();
    },

    update: function (settings) {
      if (settings.rate !== undefined) {
        rate = settings.rate;
      }
    }
  });
})();
