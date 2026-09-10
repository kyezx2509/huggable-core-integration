/* Carrinho lateral (drawer) da loja + botao "Adicionar ao carrinho" */
(function () {
  var BRL = function (v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  var KEY = 'mercado_cart';
  function get() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save(items) { localStorage.setItem(KEY, JSON.stringify(items)); render(); }
  function count() { return get().reduce(function (a, i) { return a + (i.quantity || 1); }, 0); }
  function total() { return get().reduce(function (a, i) { return a + i.price * (i.quantity || 1); }, 0); }

  function parsePrice(txt) {
    if (!txt) return 0;
    var m = String(txt).replace(/[^\d,\.]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    var v = parseFloat(m);
    return isNaN(v) ? 0 : v;
  }

  function currentProduct() {
    var priceEl = document.querySelector('.new-price2, .new-price, .price-current');
    if (!priceEl) return null;
    var titleEl = document.querySelector('p.title, h1.title, .product-title, .title');
    var imgEl = document.querySelector('img.main-image, .product-display img, .main-image');
    var slug = location.pathname.replace(/\/+$/, '').split('/').pop() || 'produto';
    return {
      id: slug,
      title: (titleEl ? titleEl.textContent : document.title).trim().replace(/\s+/g, ' ').slice(0, 90),
      price: parsePrice(priceEl.textContent),
      image: imgEl ? imgEl.getAttribute('src') : '',
      quantity: 1
    };
  }

  function addItem(p) {
    var items = get();
    var i = items.findIndex(function (x) { return x.id === p.id; });
    if (i > -1) items[i].quantity += 1; else items.push(p);
    save(items);
  }

  var css = '\
#mlCartOverlay{position:fixed;inset:0;background:rgba(0,0,0,.45);opacity:0;pointer-events:none;transition:.25s;z-index:99998}\
#mlCartOverlay.open{opacity:1;pointer-events:auto}\
#mlCartDrawer{position:fixed;top:0;right:0;height:100%;height:100dvh;width:92%;max-width:400px;background:#fff;z-index:99999;transform:translateX(105%);transition:transform .28s ease;display:flex;flex-direction:column;font-family:Arial,Helvetica,sans-serif;box-shadow:-4px 0 18px rgba(0,0,0,.18)}\
#mlCartDrawer.open{transform:translateX(0)}\
#mlCartDrawer *{box-sizing:border-box}\
#mlCartDrawer .ml-head{position:static!important;flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid #eee;background:#fff;width:auto;height:auto}\
#mlCartDrawer .ml-head h3{margin:0;font-size:17px;color:#333;font-weight:600;padding:0;line-height:1.2}\
#mlCartClose{background:none;border:0;font-size:26px;line-height:1;cursor:pointer;color:#888;padding:0 4px}\
#mlCartItems{flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:10px 14px 16px}\
.ml-ci{display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid #f1f1f1;box-sizing:border-box}\
.ml-ci .info{flex:1 1 auto;min-width:0;overflow-wrap:anywhere}\
.ml-ci img{flex:none;width:60px;height:60px;object-fit:contain;border-radius:8px;background:#fafafa;border:1px solid #f0f0f0}\
.ml-ci .n{font-size:13px;color:#333;margin:0 0 4px;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}\
.ml-ci .p{font-size:15px;color:#00a650;font-weight:700}\
.ml-qty{display:inline-flex;align-items:center;gap:2px;margin-top:8px;border:1px solid #e2e2e2;border-radius:8px;overflow:hidden}\
.ml-qty button{width:30px;height:30px;border:0;background:#fff;cursor:pointer;font-size:16px;color:#3483fa;line-height:1}\
.ml-qty button:active{background:#f2f7ff}\
.ml-qty span{min-width:26px;text-align:center;font-size:14px;color:#333}\
.ml-rm{flex:none;background:none;border:0;color:#b0b0b0;cursor:pointer;padding:2px;line-height:0;border-radius:6px}\
.ml-rm:hover{color:#e60023;background:#fdeef0}\
.ml-rm svg{width:18px;height:18px;display:block;pointer-events:none}\
#mlCartFooter{flex:none;border-top:1px solid #eee;padding:14px 16px calc(14px + env(safe-area-inset-bottom));background:#fff}\
#mlCartFooter .tot{display:flex;justify-content:space-between;align-items:center;font-size:16px;margin-bottom:12px;color:#333}\
#mlCartFooter .tot b{color:#00a650;font-size:19px}\
.ml-btn{display:block;width:100%;text-align:center;padding:13px;border-radius:8px;border:0;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;margin-bottom:8px}\
.ml-btn.pri{background:#3483fa;color:#fff}\
.ml-btn.sec{background:#fff;color:#3483fa;border:1px solid #3483fa}\
#mlCartFab{position:fixed;right:14px;bottom:16px;width:54px;height:54px;border-radius:50%;background:#3483fa;color:#fff;border:0;box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:99990;cursor:pointer;font-size:24px;display:flex;align-items:center;justify-content:center}\
#mlCartFabBadge{position:absolute;top:-4px;right:-4px;background:#e60023;color:#fff;border-radius:50%;min-width:20px;height:20px;font-size:11px;display:none;align-items:center;justify-content:center;padding:0 4px}\
#mlAddCart{display:flex;align-items:center;justify-content:center;gap:8px;box-sizing:border-box;width:92%;margin:10px auto 4px;padding:14px 12px;border-radius:6px;background:#eaf1fe;color:#3483fa;border:0;font-size:16px;font-weight:600;line-height:1;letter-spacing:.1px;cursor:pointer;transition:background .18s,color .18s;-webkit-tap-highlight-color:transparent}\
#mlAddCart:hover{background:#dbe7fd}\
#mlAddCart:active{transform:scale(.995)}\
#mlAddCart.ok{background:#e6f7ec;color:#00a650}\
#mlAddCart .material-symbols-outlined{font-size:20px;line-height:1}\
.ml-empty{text-align:center;color:#999;font-size:14px;padding:40px 0}';


  function render() {
    var box = document.getElementById('mlCartItems');
    if (!box) return;
    var items = get();
    if (!items.length) {
      box.innerHTML = '<div class="ml-empty">Seu carrinho está vazio</div>';
    } else {
      box.innerHTML = items.map(function (i, idx) {
        return '<div class="ml-ci"><img src="' + (i.image || '') + '" alt="">' +
          '<div class="info"><p class="n">' + i.title + '</p><div class="p">' + BRL(i.price * (i.quantity || 1)) + '</div>' +
          '<div class="ml-qty"><button type="button" data-a="dec" data-i="' + idx + '" aria-label="Diminuir">−</button><span>' + i.quantity + '</span>' +
          '<button type="button" data-a="inc" data-i="' + idx + '" aria-label="Aumentar">+</button></div></div>' +
          '<button type="button" class="ml-rm" data-a="rm" data-i="' + idx + '" aria-label="Remover">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button></div>';
      }).join('');

    }
    var t = document.getElementById('mlCartTotal');
    if (t) t.textContent = BRL(total());
    var b = document.getElementById('mlCartFabBadge');
    if (b) { var c = count(); b.textContent = c; b.style.display = c ? 'flex' : 'none'; }
    var legacy = document.getElementById('cartBadge');
    if (legacy) { var c2 = count(); legacy.textContent = c2; legacy.style.display = c2 ? 'flex' : 'none'; }
    var bar = document.getElementById('floatingCartBar');
    if (bar) {
      var pv = bar.querySelector('.price-value');
      if (pv) pv.textContent = BRL(total());
      bar.style.display = count() ? '' : 'none';
    }
  }

  function open() { document.getElementById('mlCartDrawer').classList.add('open'); document.getElementById('mlCartOverlay').classList.add('open'); render(); }
  function close() { document.getElementById('mlCartDrawer').classList.remove('open'); document.getElementById('mlCartOverlay').classList.remove('open'); }

  function isStoreHome() {
    var p = location.pathname.replace(/index\.html$/, '');
    return /\/loja\/?$/.test(p);
  }

  function build() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    var noFab = isStoreHome();
    var wrap = document.createElement('div');
    wrap.innerHTML = '<div id="mlCartOverlay"></div>' +
      '<aside id="mlCartDrawer" aria-label="Carrinho"><div class="ml-head"><h3>Meu carrinho</h3><button id="mlCartClose" aria-label="Fechar">×</button></div>' +
      '<div id="mlCartItems"></div>' +
      '<div id="mlCartFooter"><div class="tot"><span>Total</span><b id="mlCartTotal">R$ 0,00</b></div>' +
      '<button class="ml-btn pri" id="mlCheckout">Finalizar compra</button>' +
      '<button class="ml-btn sec" id="mlKeep">Continuar comprando</button></div></aside>' +
      (noFab ? '' : '<button id="mlCartFab" aria-label="Abrir carrinho"><span class="material-symbols-outlined">shopping_cart</span><span id="mlCartFabBadge">0</span></button>');
    document.body.appendChild(wrap);

    document.getElementById('mlCartOverlay').onclick = close;
    document.getElementById('mlCartClose').onclick = close;
    document.getElementById('mlKeep').onclick = close;
    var fab = document.getElementById('mlCartFab');
    if (fab) fab.onclick = open;

    // Na home da loja, a barra "Ver Carrinho" abre o drawer em vez de navegar
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('#floatingCartBar .floating-add-cart');
      if (!b) return;
      e.preventDefault();
      e.stopPropagation();
      open();
    }, true);

    document.getElementById('mlCheckout').onclick = function () {
      if (!get().length) return;
      window.location.href = '/checkout' + window.location.search;
    };
    document.getElementById('mlCartItems').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-a]');
      if (!btn) return;
      var items = get(), i = +btn.dataset.i;
      if (btn.dataset.a === 'inc') items[i].quantity++;
      else if (btn.dataset.a === 'dec') { items[i].quantity--; if (items[i].quantity < 1) items.splice(i, 1); }
      else items.splice(i, 1);
      save(items);
    });

    // Botao de adicionar ao carrinho na pagina de produto
    var prod = currentProduct();
    if (prod && prod.price > 0) {
      var buy = document.querySelector('a.pergunta-botao, button.pergunta-botao, .comprar-btn, .btn-comprar');
      var add = document.createElement('button');
      add.id = 'mlAddCart';
      add.innerHTML = '<span class="material-symbols-outlined">add_shopping_cart</span> Adicionar ao carrinho';
      add.onclick = function () {
        var items = get();
        if (!items.some(function (x) { return x.id === prod.id; })) addItem(currentProduct());
        window.location.href = '/checkout' + window.location.search;
      };
      if (buy && buy.parentNode) buy.parentNode.insertBefore(add, buy.nextSibling);
      else document.body.appendChild(add);

      // Alinha visualmente com o botao de compra da pagina
      if (buy) {
        try {
          var cs = window.getComputedStyle(buy);
          add.style.width = cs.width;
          add.style.marginLeft = cs.marginLeft === '0px' ? 'auto' : cs.marginLeft;
          add.style.marginRight = cs.marginRight === '0px' ? 'auto' : cs.marginRight;
          add.style.borderRadius = cs.borderRadius;
          add.style.fontFamily = cs.fontFamily;
          add.style.fontSize = cs.fontSize;
          if (parseFloat(cs.height) > 20) add.style.height = cs.height;
        } catch (e) {}
      }


      if (buy) {
        buy.setAttribute('href', 'javascript:void(0)');
        buy.addEventListener('click', function (e) {
          e.preventDefault();
          var items = get();
          if (!items.some(function (x) { return x.id === prod.id; })) addItem(currentProduct());
          window.location.href = '/checkout' + window.location.search;
        });
      }
    }
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
