(function () {
  try {
    var path = window.location.pathname || '/';
    // Rotas isentas do filtro: artigo (white page), painel admin e APIs
    if (/^\/(artigo|acessar|api)(\/|$)/.test(path)) return;
    if (window.__cloakChecked) return;
    window.__cloakChecked = true;

    var qs = window.location.search || '';
    function go() {
      window.location.replace('/artigo/' + qs);
    }

    // Bloqueio de bots (Facebook/Meta crawlers e afins) -> white page
    var BOT_RE = /facebookexternalhit|facebookcatalog|facebookbot|meta-externalagent|meta-externalfetcher|facebookexternalua|WhatsApp|Twitterbot|Slackbot|TelegramBot|Discordbot|LinkedInBot|Pinterest|SkypeUriPreview|bingbot|Googlebot|AdsBot|APIs-Google|Applebot|YandexBot|DuckDuckBot|Baiduspider|SemrushBot|AhrefsBot|PetalBot|crawler|spider|headlesschrome|phantomjs|puppeteer|playwright|python-requests|curl\/|wget|Go-http-client|axios|node-fetch/i;
    var ua = navigator.userAgent || '';
    if (BOT_RE.test(ua) || navigator.webdriver === true) {
      go();
      return;
    }
    var isMobile =
      /Android|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua) ||
      (/iPad|Macintosh/.test(ua) && 'ontouchend' in document);

    if (!isMobile) {
      go();
      return;
    }

    var tz = '';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch (e) {}
    var lang = (navigator.language || '').toLowerCase();
    var brHints =
      /America\/(Sao_Paulo|Bahia|Fortaleza|Recife|Belem|Manaus|Cuiaba|Campo_Grande|Porto_Velho|Boa_Vista|Rio_Branco|Maceio|Araguaina|Santarem|Noronha|Eirunepe)/.test(
        tz
      ) || lang.indexOf('pt') === 0;

    var done = false;
    function decide(country) {
      if (done) return;
      done = true;
      var isBR = country === 'BR' || (!country && brHints);
      if (!isBR) go();
    }

    var t = setTimeout(function () {
      decide(null);
    }, 2500);
    fetch('/api/public/geo', { cache: 'no-store' })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        clearTimeout(t);
        decide(d && d.country ? String(d.country).toUpperCase() : null);
      })
      .catch(function () {
        clearTimeout(t);
        decide(null);
      });
  } catch (e) {}
})();
