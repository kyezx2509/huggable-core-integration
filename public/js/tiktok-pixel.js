// TikTok Pixel
// PageView no carregamento; Purchase e disparado APENAS quando o Pix e pago,
// junto com o fbPurchase (mesmo transactionId como event_id para dedup).
(function () {
  var PIXEL_ID = 'DABKVF3C77UDHLL3BGMG';

  !(function (w, d, t) {
    w.TiktokAnalyticsObject = t;
    var ttq = (w[t] = w[t] || []);
    ttq.methods = [
      'page', 'track', 'identify', 'instances', 'debug', 'on', 'off',
      'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie',
    ];
    ttq.setAndDefer = function (t, e) {
      t[e] = function () {
        t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = function (t) {
      for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++)
        ttq.setAndDefer(e, ttq.methods[n]);
      return e;
    };
    ttq.load = function (e, n) {
      var i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      ttq._i = ttq._i || {};
      ttq._i[e] = [];
      ttq._i[e]._u = i;
      ttq._t = ttq._t || {};
      ttq._t[e] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[e] = n || {};
      var o = d.createElement('script');
      o.type = 'text/javascript';
      o.async = !0;
      o.src = i + '?sdkid=' + e + '&lib=' + t;
      var a = d.getElementsByTagName('script')[0];
      a.parentNode.insertBefore(o, a);
    };
    ttq.load(PIXEL_ID);
    ttq.page();
  })(window, document, 'ttq');

  // Purchase somente para pedidos pagos
  window.ttPurchase = function (value, transactionId) {
    try {
      ttq.track('CompletePayment', {
        value: Number(value) || 0,
        currency: 'MXN',
        content_type: 'product',
        content_name: 'KIT CELIMAX',
        event_id: String(transactionId || ''),
      });
    } catch (e) {}
  };
})();
