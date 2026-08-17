(function() {
  // Pixel Utmify (padrao oficial: window.pixelId definido ANTES do script)
  window.pixelId = "6a6c8f5848d1a0168eb04e98";

  var pixel = document.createElement("script");
  pixel.setAttribute("async", "");
  pixel.setAttribute("defer", "");
  pixel.setAttribute("src", "https://cdn.utmify.com.br/scripts/pixel/pixel.js");
  (document.head || document.documentElement).appendChild(pixel);

  // Script de UTMs da Utmify (atribuicao de campanha)
  var utms = document.createElement("script");
  utms.setAttribute("src", "https://cdn.utmify.com.br/scripts/utms/latest.js");
  utms.setAttribute("data-utmify-prevent-xcod-sck", "");
  utms.setAttribute("data-utmify-prevent-subids", "");
  utms.setAttribute("async", "");
  utms.setAttribute("defer", "");
  (document.head || document.documentElement).appendChild(utms);


  // Persiste UTMs da primeira visita para atribuir a venda no checkout
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id", "ad_id", "adgroup_id", "campaign_id", "gad_campaignid", "gad_source", "src", "sck", "gclid", "gbraid", "wbraid", "fbclid"];
  var STORE_KEY = "_utm_store";
  try {
    var qs = new URLSearchParams(location.search);
    var incoming = {};
    UTM_KEYS.forEach(function (k) { var v = qs.get(k); if (v) incoming[k] = v; });
    if (Object.keys(incoming).length) {
      var existing = {};
      try { existing = JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch (e) {}
      var isGoogleVisit = !!(incoming.gad_campaignid || incoming.gclid || incoming.gbraid || incoming.wbraid || incoming.gad_source);
      var incomingSource = String(incoming.utm_source || "").toLowerCase();
      var isFacebookVisit = !!(incoming.fbclid || incomingSource.indexOf("facebook") >= 0 || incomingSource.indexOf("instagram") >= 0 || incomingSource === "fb" || incomingSource === "ig");
      // Uma nova origem paga substitui a atribuição anterior para não misturar Meta e Google.
      if (isGoogleVisit) {
        delete existing.fbclid;
        delete existing.utm_id;
        delete existing.ad_id;
        delete existing.adgroup_id;
        delete existing.utm_campaign;
        delete existing.utm_content;
        delete existing.utm_term;
        delete existing.utm_source;
        delete existing.utm_medium;
      } else if (isFacebookVisit) {
        delete existing.gad_campaignid;
        delete existing.gad_source;
        delete existing.gclid;
        delete existing.gbraid;
        delete existing.wbraid;
        delete existing.campaign_id;
      }
      var merged = Object.assign({}, existing, incoming);
      localStorage.setItem(STORE_KEY, JSON.stringify(merged));
    }
  } catch (e) {}
  window.getStoredUtms = function () {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch (e) { return {}; }
  };

  // Helper para eventos suportados pelo pixel da Utmify.
  // Eventos customizados (ex: InitiateCheckout) sao rejeitados com 400 pela API
  // de tracking do pixel, entao ficam apenas no Facebook/GA.
  var UTMIFY_SUPPORTED = { PageView: 1, Purchase: 1 };
  window.utmifyTrack = function(eventName, data = {}) {
    if (!UTMIFY_SUPPORTED[eventName]) return;
    if (window.utmify && typeof window.utmify.track === 'function') {
      window.utmify.track(eventName, data);
    }
  };

})();

