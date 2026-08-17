(function () {
  window.gadsPurchase = function (value, transactionId) {
    if (typeof gtag !== 'function') return;

    // Conversoes do Google Ads
    const pixels = [
      { id: 'AW-18369248251', label: 'Il4pCO7co9scEPv3kbdE' },
      { id: 'AW-18369247531', label: 'f-zsCLfeo9scEKvykbdE' },
      { id: 'AW-18348850938', label: 'FCiHCO2WgtwcEPr9tK1E' },
      { id: 'AW-18348895768', label: '4BFACMfngdwcEJjct61E' },
      { id: 'AW-18371107315', label: 'FGR9CNnC6dscEPOzg7hE' },
      { id: 'AW-18371057370', label: 'pickCIW26dscENqtgLhE' },
      { id: 'AW-18374564295', label: 'hkejCIfJmd0cEMez1rlE' },
      { id: 'AW-18374632237', label: 'WM76CKSdrN0cEK3G2rlE' },
      { id: 'AW-18374632948', label: 'bpaYCMmkrN0cEPTL2rlE' },
      { id: 'AW-18374513153', label: 'veLbCJbJmd0cEIGk07lE' },
      { id: 'AW-18348711176', label: 'bsLhCNzBmd0cEIi6rK1E' },
      { id: 'AW-18382089936', label: 'Y12bCK28tN8cENDdob1E' },
      { id: 'AW-18382160716', label: 'pBzDCK37pN8cEMyGpr1E' },
      { id: 'AW-18382090167', label: 'ZmBmCMy6tN8cELffob1E' },
      { id: 'AW-18382040279', label: 'CRUzCMittN8cENfZnr1E' },
      { id: 'AW-18382099779', label: 'zmSPCMeatN8cEMOqor1E' },
      { id: 'AW-18382099830', label: 'KhMjCLattN8cEPaqor1E' },
      { id: 'AW-18375006530', label: 'hI-wCJ_qyd8cEMKy8blE' },
      { id: 'AW-18375195731', label: 'ED0VCIr1zt8cENP4_LlE' }
    ];

    pixels.forEach(p => {
      gtag('event', 'conversion', {
        'send_to': p.id + '/' + p.label,
        'value': Number(value) || 0,
        'currency': 'BRL',
        'transaction_id': String(transactionId || '')
      });
    });
  };
})();