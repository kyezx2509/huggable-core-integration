/* Filtro de tráfego desativado: todos os dispositivos e IPs acessam normalmente. */
(function () {
  try {
    var s = document.createElement('style');
    s.textContent = 'html, body { overflow-x: hidden !important; width: 100% !important; max-width: 100vw !important; }';
    document.head.appendChild(s);
  } catch (e) {}
})();
