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
#mlCartDrawer{position:fixed;top:0;right:0;height:100%;width:92%;max-width:400px;background:#fff;z-index:99999;transform:translateX(105%);transition:transform .28s ease;display:flex;flex-direction:column;font-family:Arial,Helvetica,sans-serif;box-shadow:-4px 0 18px rgba(0,0,0,.18)}\
#mlCartDrawer.open{transform:translateX(0)}\
#mlCartDrawer header{display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid #eee}\
#mlCartDrawer header h3{margin:0;font-size:17px;color:#333}\
#mlCartClose{background:none;border:0;font-size:24px;line-height:1;cursor:pointer;color:#666}\
#mlCartItems{flex:1;overflow-y:auto;padding:12px 16px}\
.ml-ci{display:flex;gap:10px;padding:12px 0;border-bottom:1px solid #f1f1f1;box-sizing:border-box}\
.ml-ci>div{min-width:0;overflow-wrap:anywhere}\
.ml-ci img{width:64px;height:64px;object-fit:contain;border-radius:8px;background:#fafafa}\
.ml-ci .n{font-size:13px;color:#333;margin:0 0 4px;line-height:1.25}\
.ml-ci .p{font-size:15px;color:#00a650;font-weight:700}\
.ml-qty{display:flex;align-items:center;gap:10px;margin-top:6px}\
.ml-qty button{width:26px;height:26px;border:1px solid #ddd;background:#fff;border-radius:6px;cursor:pointer;font-size:15px;color:#3483fa}\
.ml-rm{background:none;border:0;color:#999;font-size:12px;text-decoration:underline;cursor:pointer;padding:0;margin-left:auto;flex:none}\
#mlCartFooter{border-top:1px solid #eee;padding:16px}\
#mlCartFooter .tot{display:flex;justify-content:space-between;font-size:16px;margin-bottom:12px;color:#333}\
#mlCartFooter .tot b{color:#00a650}\
.ml-btn{display:block;width:100%;text-align:center;padding:13px;border-radius:8px;border:0;font-size:15px;cursor:pointer;text-decoration:none;margin-bottom:8px}\
.ml-btn.pri{background:#3483fa;color:#fff}\
.ml-btn.sec{background:#fff;color:#3483fa;border:1px solid #3483fa}\
#mlCartFab{position:fixed;right:14px;bottom:16px;width:54px;height:54px;border-radius:50%;background:#3483fa;color:#fff;border:0;box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:99990;cursor:pointer;font-size:24px;display:flex;align-items:center;justify-content:center}\
#mlCartFabBadge{position:absolute;top:-4px;right:-4px;background:#e60023;color:#fff;border-radius:50%;min-width:20px;height:20px;font-size:11px;display:none;align-items:center;justify-content:center;padding:0 4px}\
#mlAddCart{display:flex;align-items:center;justify-content:center;gap:8px;width:92%;margin:10px auto 0;padding:14px;border-radius:8px;background:#fff;color:#3483fa;border:1px solid #3483fa;font-size:16px;cursor:pointer}\
.ml-empty{text-align:center;color:#999;font-size:14px;padding:40px 0}';

  function render() {
    var box = document.getElementById('mlCartItems');
    if (!box) return;
    var items = get();
    if (!items.length) {
      box.innerHTML = '<div class="ml-empty">Seu carrinho está vazio</div>';
    } else {
      box.innerHTML = items.map(function (i, idx) {
        return '<div class="ml-ci"><img src="' + (i.image || '') + '" alt=""><div style="flex:1">' +
          '<p class="n">' + i.title + '</p><div class="p">' + BRL(i.price) + '</div>' +
          '<div class="ml-qty"><button data-a="dec" data-i="' + idx + '">−</button><span>' + i.quantity + '</span>' +
          '<button data-a="inc" data-i="' + idx + '">+</button>' +
          '<button class="ml-rm" data-a="rm" data-i="' + idx + '">remover</button></div></div></div>';
      }).join('');
    }
    var t = document.getElementById('mlCartTotal');
    if (t) t.textContent = BRL(total());
    var b = document.getElementById('mlCartFabBadge');
    if (b) { var c = count(); b.textContent = c; b.style.display = c ? 'flex' : 'none'; }
    var legacy = document.getElementById('cartBadge');
    if (legacy) { var c2 = count(); legacy.textContent = c2; legacy.style.display = c2 ? 'flex' : 'none'; }
  }

  function open() { document.getElementById('mlCartDrawer').classList.add('open'); document.getElementById('mlCartOverlay').classList.add('open'); render(); }
  function close() { document.getElementById('mlCartDrawer').classList.remove('open'); document.getElementById('mlCartOverlay').classList.remove('open'); }

  function build() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    var wrap = document.createElement('div');
    wrap.innerHTML = '<div id="mlCartOverlay"></div>' +
      '<aside id="mlCartDrawer" aria-label="Carrinho"><header><h3>Meu carrinho</h3><button id="mlCartClose" aria-label="Fechar">×</button></header>' +
      '<div id="mlCartItems"></div>' +
      '<div id="mlCartFooter"><div class="tot"><span>Total</span><b id="mlCartTotal">R$ 0,00</b></div>' +
      '<button class="ml-btn pri" id="mlCheckout">Finalizar compra</button>' +
      '<button class="ml-btn sec" id="mlKeep">Continuar comprando</button></div></aside>' +
      '<button id="mlCartFab" aria-label="Abrir carrinho"><span class="material-symbols-outlined">shopping_cart</span><span id="mlCartFabBadge">0</span></button>';
    document.body.appendChild(wrap);

    document.getElementById('mlCartOverlay').onclick = close;
    document.getElementById('mlCartClose').onclick = close;
    document.getElementById('mlKeep').onclick = close;
    document.getElementById('mlCartFab').onclick = open;
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
        addItem(currentProduct());
        add.innerHTML = '<span class="material-symbols-outlined">check</span> Adicionado!';
        setTimeout(function () { add.innerHTML = '<span class="material-symbols-outlined">add_shopping_cart</span> Adicionar ao carrinho'; }, 1500);
        open();
      };
      if (buy && buy.parentNode) buy.parentNode.insertBefore(add, buy.nextSibling);
      else document.body.appendChild(add);

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
