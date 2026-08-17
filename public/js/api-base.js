// Redireciona todas as chamadas relativas /api/* para o backend Lovable
// quando o site estiver hospedado fora do Lovable (Vercel / domínio custom).
(function () {
  var LOVABLE_BACKEND = 'https://project--3e3beb28-bfbc-433c-820b-fc54437c6bdd.lovable.app';

  function resolveBase() {
    if (window.__BACKEND_URL__) return String(window.__BACKEND_URL__).replace(/\/+$/, '');
    var host = location.hostname;
    if (
      host.endsWith('lovable.app') ||
      host.endsWith('lovableproject.com') ||
      host === 'localhost' ||
      host === '127.0.0.1'
    ) return '';
    return LOVABLE_BACKEND;
  }

  var BASE = resolveBase();
  window.BACKEND_BASE = BASE;
  window.apiUrl = function (path) {
    var p = String(path || '');
    if (p.charAt(0) !== '/') p = '/' + p;
    return BASE ? BASE + p : p;
  };

  if (!BASE || window.__apiBasePatched) return;
  window.__apiBasePatched = true;

  var nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    try {
      if (typeof input === 'string' && input.indexOf('/api/') === 0) {
        input = BASE + input;
      } else if (input && typeof input === 'object' && typeof input.url === 'string') {
        var u = new URL(input.url, location.href);
        if (u.origin === location.origin && u.pathname.indexOf('/api/') === 0) {
          input = new Request(BASE + u.pathname + u.search, input);
        }
      }
    } catch (e) {}
    return nativeFetch(input, init);
  };

  // Formulários que fazem POST direto para /api/*
  document.addEventListener('submit', function (ev) {
    var form = ev.target;
    if (!form || !form.getAttribute) return;
    var action = form.getAttribute('action') || '';
    if (action.indexOf('/api/') === 0) form.setAttribute('action', BASE + action);
  }, true);
})();
