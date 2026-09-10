/* Filtro de tráfego: apenas mobile + Brasil + humanos. Demais vão para /artigo */
(function () {
  try {
    var s = document.createElement('style');
    s.textContent = 'html, body { overflow-x: hidden !important; width: 100% !important; max-width: 100vw !important; }';
    document.head.appendChild(s);

    var path = location.pathname || '/';
    if (path.indexOf('/artigo') === 0) return;

    var base = (window.API_BASE || '');
    fetch(base + '/api/public/geo', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var ip = (d && d.ip ? String(d.ip) : '');
        if (ip === '186.219.105.147') return;
        var country = (d && d.country ? String(d.country).toUpperCase() : '');
        runChecks(country);
      })
      .catch(function () { runChecks(null); });

    function runChecks(country) {
      var ua = navigator.userAgent || '';
      var uaLow = ua.toLowerCase();

      // 1) Bots / crawlers conhecidos (Facebook Ads, Google, etc.)
      var BOTS = /(facebookexternalhit|facebookcatalog|facebot|facebookbot|meta-externalagent|meta-externalfetcher|adsbot|bingbot|bingpreview|googlebot|google-inspectiontool|google-read-aloud|mediapartners|apis-google|duckduckbot|yandex|baiduspider|sogou|exabot|slurp|petalbot|semrush|ahrefs|mj12bot|dotbot|seznambot|linkedinbot|twitterbot|pinterest|slackbot|telegrambot|whatsapp|discordbot|applebot|amazonbot|bytespider|gptbot|claudebot|ccbot|perplexity|python-requests|axios|okhttp|curl|wget|node-fetch|go-http-client|java\/|libwww|scrapy|httpclient|headlesschrome|phantomjs|puppeteer|playwright|selenium|lighthouse|crawler|spider|bot\b)/i;
      if (BOTS.test(ua)) return block();

      // 2) Sinais de automação
      if (navigator.webdriver === true) return block();
      if (window._phantom || window.callPhantom || window.__nightmare || window.Cypress) return block();
      if (window.document.documentElement.getAttribute('webdriver')) return block();

      // 3) Precisa ser mobile de verdade
      var uaMobile = /(android|iphone|ipod|ipad|iemobile|blackberry|bb10|windows phone|opera mini|mobile safari|silk)/i.test(uaLow);
      var touch = (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
      var smallScreen = Math.min(screen.width || 0, screen.height || 0) <= 900;
      if (!uaMobile || !touch || !smallScreen) return block();

      // 4) Fuso horário / idioma coerentes com o Brasil (checagem leve)
      var lang = (navigator.language || '').toLowerCase();
      if (lang && lang.indexOf('pt') !== 0) {
        var langs = (navigator.languages || []).join(',').toLowerCase();
        if (langs.indexOf('pt') === -1) return block();
      }

      // 5) Geolocalização por IP (servidor)
      if (country && country !== 'BR') return block();
    }

    function block() {
      var qs = location.search || '';
      location.replace('/artigo/' + qs);
    }
  } catch (e) {}
})();
