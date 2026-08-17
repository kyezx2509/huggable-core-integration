// Facebook Pixel - unico pixel do projeto
// PageView no carregamento; Purchase e disparado APENAS quando o Pix e pago
// (dedup com a Conversions API via event_id = transaction_id).
(function () {
  var PIXEL_ID = '2495926674152987';
  window.FB_PIXEL_ID = PIXEL_ID;

  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');

  function cookie(name) {
    var m = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[2]) : '';
  }

  window.fbTracking = function () {
    return {
      fbp: cookie('_fbp'),
      fbc: cookie('_fbc') || (new URLSearchParams(location.search).get('fbclid')
        ? 'fb.1.' + Date.now() + '.' + new URLSearchParams(location.search).get('fbclid')
        : ''),
      user_agent: navigator.userAgent,
      event_source_url: location.href,
    };
  };

  // InitiateCheckout - quando o lead entra no checkout (dispara uma vez por sessao de pagina)
  var _icSent = false;
  window.fbInitiateCheckout = function (value, product) {
    if (_icSent) return;
    _icSent = true;
    try {
      fbq('track', 'InitiateCheckout', {
        value: Number(value) || 0,
        currency: 'BRL',
        content_type: 'product',
        contents: product && product.id ? [{ id: String(product.id), quantity: Number(product.qty) || 1 }] : undefined,
        content_ids: product && product.id ? [String(product.id)] : undefined,
        content_name: (product && product.name) || undefined,
        num_items: (product && Number(product.qty)) || 1,
      });
    } catch (e) {}
  };

  // Purchase somente para pedidos pagos

  window.fbPurchase = function (value, transactionId) {
    try {
      fbq('track', 'Purchase', { value: Number(value) || 0, currency: 'BRL' }, { eventID: String(transactionId || '') });
    } catch (e) {}
  };
})();
