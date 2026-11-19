(function () {
  const PRODUCTS = {
    "2906947154796": { name: "Celimax Retinal Collagen Lifting Cream - 1 pieza", price: 229, img: "https://sweet-install-fairy.lovable.app/celimax/co/f6e92234.png" },
    "2906958297659": { name: "Celimax Retinal Collagen Lifting Cream - 3 piezas", price: 329, img: "https://sweet-install-fairy.lovable.app/celimax/co/f6e92234.png" },
    "2906929863847": { name: "Celimax Retinal Collagen Lifting Cream - 5 piezas", price: 429, img: "https://sweet-install-fairy.lovable.app/celimax/co/f6e92234.png" },
    "2906912000012": { name: "Celimax Retinal Collagen Lifting Cream - Kit de tratamiento (6 piezas)", price: 499, img: "https://sweet-install-fairy.lovable.app/__l5e/assets-v1/8b2467af-688e-4c40-a37e-00fb72a45992/kit-12-tubes-new.jpeg" },

  };
  const REVIEWS = [
    { n: "Mariana G. · CDMX", t: "Producto original y muy bien empacado. Llegó antes de lo prometido, ¡súper recomendable!", a: "/celimax/co/4bd232d9.png" },
    { n: "Daniela R. · Guadalajara", t: "Me daba desconfianza por la promoción, pero todo llegó completo y funcionando perfecto.", a: "/celimax/co/4dfa34de.png" },
    { n: "Fernanda L. · Monterrey", t: "Excelente atención y envío rapidísimo. Ya es mi segunda compra aquí.", a: "/celimax/co/73626f59.png" },
    { n: "Ana Sofía M. · Puebla", t: "Precio muy por debajo de lo normal y el producto es idéntico al anuncio. ¡Me encantó!", a: "/celimax/co/75ae5e55.png" },
    { n: "Valeria T. · Querétaro", t: "Pagué por SPEI, se confirmó en minutos y el mismo día me llegó la guía de rastreo.", a: "/celimax/co/d3167525.png" },
  ];

  const UPSELLS = {
    up1: { name: "Crema unificadora de tono - Celimax", price: 129 },
    up2: { name: "Crema reafirmante para cuello - YCZ", price: 99 },
  };

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const money = (v) => "$" + Number(v || 0).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: Number(v) % 1 ? 2 : 0 });
  const digits = (v) => (v || "").replace(/\D/g, "");

  const params = new URLSearchParams(location.search);
  let pid = params.get("product") || params.get("id") || "2906958297659";
  let product = PRODUCTS[pid] || PRODUCTS["2906958297659"];

  // ---- Integração com o carrinho da loja (localStorage: mercado_cart)
  let cartItems = [];
  try { cartItems = JSON.parse(localStorage.getItem("mercado_cart") || "[]") || []; } catch (e) { cartItems = []; }
  let cartCount = 0;
  const isCart = Array.isArray(cartItems) && cartItems.length > 0;
  if (isCart) {
    const totalCart = cartItems.reduce((s, it) => s + Number(it.price || 0) * Number(it.quantity || 1), 0);
    cartCount = cartItems.reduce((s, it) => s + Number(it.quantity || 1), 0);
    pid = "carrinho";
    product = {
      name: cartItems[0].title,
      price: totalCart,
      img: cartItems[0].image || "/celimax/co/f6e92234.png",
    };
  }


  const ANNUAL_PID = "2906912000012";
  const ANNUAL_BUMP_PRICE = 499;
  const ANNUAL_IMG = "https://sweet-install-fairy.lovable.app/__l5e/assets-v1/8b2467af-688e-4c40-a37e-00fb72a45992/kit-12-tubes-new.jpeg";

  const state = { qty: Math.max(1, parseInt(params.get("qty") || "1", 10)), shipping: 0, upsells: {}, freeShipping: false };


  function totals() {
    let sub = product.price * state.qty;
    Object.keys(state.upsells).forEach((k) => { if (state.upsells[k]) sub += UPSELLS[k].price; });
    return { sub: sub, freight: state.shipping, total: sub + state.shipping };
  }

  // InitiateCheckout - uma unica vez por lead (dedupe de 24h no fb-pixel.js).
  // Reload, voltar do Pix ou reabrir o checkout NAO geram novo evento.
  (function fireInitiateCheckout(tries) {
    tries = tries || 0;
    try {
      if (window.fbInitiateCheckoutSent && window.fbInitiateCheckoutSent()) return;
    } catch (e) {}
    var value = totals().total;
    var prod = { id: pid, name: product.name, qty: state.qty };
    if (window.fbInitiateCheckout) {
      try { window.fbInitiateCheckout(value, prod); } catch (e) {}
      try { if (window.utmifyTrack) window.utmifyTrack("InitiateCheckout", { value: value, currency: "MXN", product: product.name }); } catch (e) {}
      return;
    }
    // pixel ainda carregando: aguarda em vez de disparar um fbq solto (que duplicava)
    if (tries < 20) setTimeout(function () { fireInitiateCheckout(tries + 1); }, 400);
  })(0);




  function render() {
    const t = totals();
    $$(".js-prod-name").forEach((e) => (e.textContent = product.name));
    $$(".js-prod-img").forEach((e) => (e.src = product.img));
    $$(".js-prod-price").forEach((e) => (e.textContent = money(isCart ? Number(cartItems[0].price || 0) * (Number(cartItems[0].quantity) || 1) : product.price * state.qty)));
    $$(".js-qty").forEach((e) => (e.value = isCart ? cartCount : state.qty));
    $$(".js-prod-price").forEach((e) => { const w = e.closest(".flex-col.items-end"); if (w) w.style.display = "none"; });
    $$(".js-prod-name").forEach((e) => {
      let q = e.parentElement.querySelector(".js-qty-label");
      if (!q) { q = document.createElement("span"); q.className = "js-qty-label text-[12px] text-slate-500"; e.parentElement.appendChild(q); }
      q.textContent = "Cantidad: " + (isCart ? (Number(cartItems[0].quantity) || 1) : state.qty);
    });
    $$(".js-count").forEach((e) => (e.textContent = isCart ? cartCount : state.qty));

    $$(".js-subtotal").forEach((e) => (e.textContent = money(t.sub)));
    $$(".js-total").forEach((e) => (e.textContent = money(t.total)));
    $$(".js-freight").forEach((e) => { e.textContent = t.freight ? money(t.freight) : "Gratis"; e.style.color = t.freight ? "" : "#00a650"; });
    const offers = 2 - Object.keys(state.upsells).filter((k) => state.upsells[k]).length;
    if ($("#offers-count")) $("#offers-count").textContent = offers;
  }

  // ---- Resumo do carrinho: mostra 1 produto + botao "Ver todos"
  if (isCart) {
    $$(".js-prod-name").forEach((nameEl) => {
      const li = nameEl.closest("li");
      if (!li || li.dataset.cartUi) return;
      li.dataset.cartUi = "1";

      // esconde o seletor de quantidade (o carrinho define as quantidades)
      const stepper = li.querySelector("[data-qty]");
      if (stepper && stepper.parentElement) stepper.parentElement.style.display = "none";


      if (cartItems.length < 2) return;

      const extra = document.createElement("li");
      extra.className = "py-2";
      const rest = cartItems.slice(1).map((it) =>
        '<div class="flex items-center gap-3 py-2">' +
        '<img src="' + (it.image || "") + '" alt="" class="w-10 h-10 rounded-lg object-cover border border-slate-200 bg-white">' +
        '<span class="text-[12px] text-black flex-1 min-w-0 break-words leading-tight">' + (it.title || "Producto") + '</span>' +
        '<span class="text-[12px] text-slate-500 whitespace-nowrap">' + (Number(it.quantity) || 1) + "x</span>" +
        '<span class="text-[12px] text-black whitespace-nowrap">' + money(Number(it.price || 0) * (Number(it.quantity) || 1)) + "</span>" +
        "</div>"
      ).join("");
      extra.innerHTML =
        '<button type="button" class="js-see-all w-full text-[13px] font-medium text-[#3483FA] py-1 text-left">Ver todos los productos (' + cartItems.length + ")</button>" +
        '<div class="js-all-items hide mt-1 divide-y divide-slate-100">' + rest + "</div>";
      li.parentElement.appendChild(extra);

      const btnAll = extra.querySelector(".js-see-all");
      const listAll = extra.querySelector(".js-all-items");
      btnAll.addEventListener("click", () => {
        const hidden = listAll.classList.toggle("hide");
        btnAll.textContent = hidden
          ? "Ver todos los productos (" + cartItems.length + ")"
          : "Ocultar productos";
      });
    });
  }



  // ---- mascaras (Mexico)
  function maskPhone(v) {
    v = digits(v).slice(0, 10);
    return v.replace(/^(\d{2})(\d)/, "$1 $2").replace(/^(\d{2}) (\d{4})(\d)/, "$1 $2 $3");
  }
  $("#phone").addEventListener("input", (e) => (e.target.value = maskPhone(e.target.value)));
  $("#zipcode").addEventListener("input", (e) => { e.target.value = digits(e.target.value).slice(0, 5); if (e.target.value.length === 5) lookupCep(); });

  function err(id, msg) { const el = $(id); el.textContent = msg || ""; el.classList.toggle("hide", !msg); }

  // ---- quantity
  $$("[data-qty]").forEach((b) => b.addEventListener("click", () => {
    if (isCart) return;
    state.qty = Math.min(20, Math.max(1, state.qty + parseInt(b.dataset.qty, 10)));
    render();
  }));


  // ---- summary collapse (mobile)
  let open = true;
  $("#summary-toggle").addEventListener("click", () => {
    open = !open;
    $("#summary-body").className = "grid transition-[grid-template-rows] duration-500 ease-in-out " + (open ? "grid-rows-[1fr]" : "grid-rows-[0fr]");
    $("#summary-caret").style.transform = open ? "" : "rotate(180deg)";
    $("#summary-head-total").classList.toggle("hide", open);
  });

  // ---- step 1
  $("#next-button-dados-pessoais").addEventListener("click", () => {
    const name = $("#name").value.trim(), email = $("#email").value.trim();
    if (name.split(" ").filter(Boolean).length < 2) return err("#err-1", "Escribe tu nombre y apellidos.");
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return err("#err-1", "Escribe un correo electrónico válido.");
    if (digits($("#phone").value).length !== 10) return err("#err-1", "Escribe un celular de 10 dígitos.");
    err("#err-1", "");
    $("#account-fields").classList.add("hide");
    $("#account-open-head").classList.add("hide");
    $("#account-done-head").classList.remove("hide");
    $("#sum-name").textContent = name;
    $("#sum-email").textContent = email;
    $("#sum-phone").textContent = "+52 " + $("#phone").value;
    $("#address-idle-head").classList.add("hide");
    $("#address-open-head").classList.remove("hide");
    $("#address-fields").classList.remove("hide");
    $("#zipcode").focus();
    $("#address").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $("#account-done-head").addEventListener("click", () => {
    $("#account-done-head").classList.add("hide");
    $("#account-open-head").classList.remove("hide");
    $("#account-fields").classList.remove("hide");
  });

  // ---- Codigo postal (Mexico): autocompleta estado/municipio/colonias quando possivel
  async function lookupCep() {
    const cp = digits($("#zipcode").value);
    $("#address-rest").classList.remove("hide");
    $("#shipping-wrap").classList.remove("hide");
    render();
    try {
      const r = await fetch("https://api.zippopotam.us/mx/" + cp);
      if (!r.ok) { $("#zip-check").classList.add("hide"); return; }
      const d = await r.json();
      const list = (d && d.places) || [];
      if (!list.length) { $("#zip-check").classList.add("hide"); return; }
      $("#zip-check").classList.remove("hide");
      const st = String(list[0].state || "");
      const map = { "México": "Estado de México", "Mexico": "Estado de México", "Distrito Federal": "Ciudad de México", "Coahuila de Zaragoza": "Coahuila", "Michoacán de Ocampo": "Michoacán", "Veracruz de Ignacio de la Llave": "Veracruz" };
      const stName = map[st] || st;
      if ([...$("#uf").options].some((o) => o.value === stName)) $("#uf").value = stName;
      $("#zip-city").textContent = stName;
      $("#zip-city").classList.remove("hide");
      const cols = [...new Set(list.map((x) => x["place name"]).filter(Boolean))];
      $("#colonias").innerHTML = cols.map((c) => '<option value="' + c + '">').join("");
      if (cols.length === 1) $("#neighborhood").value = cols[0];
      // Municipio/alcaldía a partir das coordenadas do CP
      try {
        const lat = list[0].latitude, lon = list[0].longitude;
        if (lat && lon && !$("#city").value) {
          const g = await fetch("https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&accept-language=es&lat=" + lat + "&lon=" + lon);
          const a = ((await g.json()) || {}).address || {};
          const mun = a.borough || a.county || a.city || a.town || a.municipality || "";
          if (mun && !$("#city").value) $("#city").value = mun;
        }
      } catch (e) {}
      (cols.length === 1 ? $("#street") : $("#neighborhood")).focus();
    } catch (e) { $("#zip-check").classList.add("hide"); }
  }

  // ---- shipping
  $$(".ship-opt").forEach((opt) => opt.addEventListener("click", () => {
    $$(".ship-opt").forEach((o) => {
      const on = o === opt;
      o.style.borderColor = on ? "rgb(43,111,255)" : "rgb(229,231,235)";
      o.classList.toggle("bg-slate-100", on);
      o.classList.toggle("bg-white", !on);
      $(".ship-radio", o).innerHTML = on
        ? '<rect x="0.5" y="0.5" width="21" height="21" rx="10.5" stroke="#2b6fff"></rect><circle cx="11" cy="11" r="5" fill="#2b6fff"></circle>'
        : '<rect x="0.5" y="0.5" width="21" height="21" rx="10.5" stroke="#E5E7EB"></rect>';
    });
    state.shipping = state.freeShipping ? 0 : parseFloat(opt.dataset.price);
    render();
  }));


  // ---- step 2
  $("#next-button-frete").addEventListener("click", () => {
    if (digits($("#zipcode").value).length !== 5) return err("#err-2", "Escribe un código postal de 5 dígitos.");
    if (!$("#uf").value) return err("#err-2", "Selecciona tu estado.");
    if (!$("#city").value.trim()) return err("#err-2", "Escribe tu municipio o alcaldía.");
    if (!$("#neighborhood").value.trim()) return err("#err-2", "Escribe tu colonia.");
    if (!$("#street").value.trim()) return err("#err-2", "Escribe tu calle.");
    if (!$("#number").value.trim()) return err("#err-2", "Escribe el número exterior.");
    err("#err-2", "");
    $("#address-fields").classList.add("hide");
    $("#address-open-head").classList.add("hide");
    $("#address-done-head").classList.remove("hide");
    $("#sum-addr1").textContent = $("#street").value + " " + $("#number").value + ($("#complement").value ? " Int. " + $("#complement").value : "") + ", Col. " + $("#neighborhood").value;
    $("#sum-addr2").textContent = $("#city").value + ", " + $("#uf").value + ", C.P. " + $("#zipcode").value;
    $("#sum-frete").textContent = state.shipping ? "Envío express - " + money(state.shipping) : "Envío estándar - Gratis";
    $("#pay-h2").style.color = "rgb(0,0,0)";
    $("#pay-h2").querySelectorAll("span").forEach((s) => (s.style.color = "rgb(0,0,0)"));
    $("#pay-sub").textContent = "Elige cómo quieres pagar";
    $("#pay-fields").classList.remove("hide");
    $("#payment").scrollIntoView({ behavior: "smooth", block: "start" });
    render();
  });
  $("#address-done-head").addEventListener("click", () => {
    $("#address-done-head").classList.add("hide");
    $("#address-open-head").classList.remove("hide");
    $("#address-fields").classList.remove("hide");
  });

  // ---- upsells
  $$(".js-upsell").forEach((wrap) => {
    const id = wrap.dataset.id;
    $(".js-upsell-btn", wrap).addEventListener("click", () => {
      state.upsells[id] = !state.upsells[id];
      const on = state.upsells[id];
      $(".js-dot", wrap).className = "js-dot size-2 rounded-full transition-opacity " + (on ? "opacity-100" : "opacity-0");
      // Buscamos o span que contém o texto (que agora é o segundo span dentro do span principal)
      const textSpan = $(".js-upsell-btn > span > span:last-child", wrap);
      if (textSpan) {
        textSpan.textContent = on ? "✓ AGREGADO A TU PEDIDO" : "+ ¡SÍ! QUIERO AGREGARLO";
      }
      render();
    });
  });


  // ---- order bump: upgrade para Tratamento de 1 Ano ($509 + frete grátis)
  (function annualBump() {
    if (pid === ANNUAL_PID || pid === "carrinho") return;
    if (!/celimax/i.test(product.name || "")) return;
    const bump = $("#annual-bump");
    if (!bump) return;

    bump.classList.remove("hide");
    // move o bump para uma área sempre visível (acima dos dados pessoais)
    var acc = $("#account");
    if (acc && acc.parentNode) acc.parentNode.insertBefore(bump, acc);

    let accepted = false;

    function accept() {
      if (accepted) return;
      accepted = true;
      pid = ANNUAL_PID;
      product = Object.assign({}, PRODUCTS[ANNUAL_PID], { price: ANNUAL_BUMP_PRICE, img: ANNUAL_IMG });
      state.qty = 1;
      state.freeShipping = true;
      state.shipping = 0;

      const btnBump = $("#annual-bump-btn");
      if (btnBump) {
        btnBump.textContent = "✓ KIT DE 6 PIEZAS AGREGADO";
        btnBump.style.background = "#009ee3";
        btnBump.disabled = true;
      }
      render();
    }

    $("#annual-bump-btn").addEventListener("click", accept);
  })();



  // ---- reviews
  function reviewCard(r) {
    return (
      '<div class="min-w-0 shrink-0 grow-0 basis-full pl-3">' +
      '<div class="border border-[#E2E8F0] rounded-[0.5rem] bg-white p-4">' +
      '<div class="flex items-center gap-3">' +
      '<img src="' + r.a + '" alt="' + r.n + '" class="w-10 h-10 rounded-full object-cover">' +
      '<div><p class="text-[13px] font-semibold text-black">' + r.n + '</p>' +
      '<div class="flex gap-0.5 text-[#F5A623] text-[12px]">★★★★★</div></div></div>' +
      '<p class="text-[13px] text-slate-600 mt-3">' + r.t + '</p></div></div>'
    );
  }
  const track = $("#carousel-track");
  track.innerHTML = REVIEWS.map(reviewCard).join("");
  const dots = $("#carousel-dots");
  dots.innerHTML = REVIEWS.map((_, i) => '<button class="size-1.5 rounded-full bg-slate-300" data-dot="' + i + '"></button>').join("");
  let idx = 0;
  function goto(i) {
    idx = (i + REVIEWS.length) % REVIEWS.length;
    track.style.transform = "translateX(-" + idx * 100 + "%)";
    $$("[data-dot]").forEach((d, k) => (d.className = "size-1.5 rounded-full " + (k === idx ? "bg-slate-600" : "bg-slate-300")));
  }
  $$("[data-dot]").forEach((d) => d.addEventListener("click", () => goto(parseInt(d.dataset.dot, 10))));
  goto(0);
  setInterval(() => goto(idx + 1), 5000);
  $("#reviews-desktop").innerHTML =
    '<h2 class="text-black font-medium text-[15px] mb-3">Opiniones de clientes</h2>' +
    '<div class="flex flex-col gap-3">' + REVIEWS.map((r) =>
      '<div class="flex items-start gap-3"><img src="' + r.a + '" class="w-9 h-9 rounded-full object-cover" alt="' + r.n + '">' +
      '<div><p class="text-[13px] font-semibold text-black">' + r.n + '</p>' +
      '<div class="flex gap-0.5 text-[#F5A623] text-[11px]">★★★★★</div>' +
      '<p class="text-[12px] text-slate-600 mt-1">' + r.t + '</p></div></div>').join("") + "</div>";

  // ---- metodo de pago (SPEI / OXXO)
  state.method = "spei";
  function paintMethods() {
    $$(".pay-opt").forEach((o) => {
      const on = o.dataset.method === state.method;
      const c = on ? "rgb(43,111,255)" : "rgb(229,231,235)";
      o.style.borderColor = c;
      const r = $(".pay-radio", o); r.style.borderColor = c; r.firstElementChild.style.background = on ? c : "transparent";
    });
    const h = $("#pay-hint");
    if (h) h.textContent = state.method === "oxxo"
      ? "Al finalizar recibirás una referencia para pagar en efectivo en cualquier OXXO. Tienes hasta 12 días; tu pedido se confirma al pagar."
      : "Al finalizar te daremos una CLABE para transferir desde tu banco. Tu pedido se confirma automáticamente en minutos.";
  }
  $$(".pay-opt").forEach((o) => o.addEventListener("click", () => { state.method = o.dataset.method; paintMethods(); }));
  paintMethods();

  // ---- finalizar -> XPag
  const btn = $("#btn-finalizar");
  btn.addEventListener("click", async () => {
    const t = totals();
    btn.disabled = true;
    btn.innerHTML = "<span>Generando tu pago...</span>";
    // El gateway SIEMPRE recibe el nombre generico "KIT CELIMAX"
    const GATEWAY_ITEM_NAME = "KIT CELIMAX";
    const realItems = isCart
      ? cartItems.map((it) => ({ name: it.title, price: Number(it.price || 0), quantity: Number(it.quantity || 1) }))
      : [{ name: product.name, price: product.price, quantity: state.qty }];
    const payload = {
      amount: Math.round(t.total * 100),
      method: state.method,
      productName: GATEWAY_ITEM_NAME,
      customer: { name: $("#name").value.trim(), email: $("#email").value.trim(), phone: digits($("#phone").value) },
      address: {
        zipcode: digits($("#zipcode").value), state: $("#uf").value, municipality: $("#city").value.trim(),
        colonia: $("#neighborhood").value.trim(), street: $("#street").value.trim(), exterior: $("#number").value.trim(),
        interior: $("#complement").value.trim(), reference: ($("#reference") ? $("#reference").value.trim() : ""),
        shipping: state.shipping ? "express" : "estandar", shipping_price: state.shipping, country: "MX",
      },
      items: realItems,
      tracking: Object.assign(
        { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null, src: null, sck: null },
        (window.getStoredUtms ? window.getStoredUtms() : {}),
        Object.fromEntries(new URLSearchParams(location.search).entries()),
        (window.fbTracking ? window.fbTracking() : {}),
        { visitor_session_id: localStorage.getItem('_lv_sid') || null }
      ),
    };
    try {
      const r = await fetch("/api/public/xpag-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      const p = d.data || {};
      if (!r.ok || !p.id) throw new Error(d.error || "No pudimos generar tu pago");
      showPayment(p, t.total);
      startTimer();
      setupComprovante(p.id);
      pollStatus(p.id);
    } catch (e) {
      err("#err-3", e.message || "No pudimos generar tu pago. Inténtalo de nuevo.");
      btn.disabled = false;
      btn.innerHTML = "<span>Finalizar compra</span>";
    }
  });

  function showPayment(p, total) {
    const exp = p.expires_at ? new Date(p.expires_at) : null;
    const expTxt = exp ? exp.toLocaleString("es-MX", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "";
    const steps = (arr) => arr.map((x, i) => '<li class="flex items-start gap-3"><span class="size-6 shrink-0 text-[13px] font-semibold flex justify-center items-center rounded-full bg-primary text-white">' + (i + 1) + '</span><span class="text-[#3e3e3e]">' + x + '</span></li>').join("");
    $$(".js-total").forEach((e) => (e.textContent = money(total)));
    if (p.method === "oxxo") {
      $("#oxxo-box").classList.remove("hide");
      $("#oxxo-ref").textContent = String(p.reference).replace(/(\d{4})(?=\d)/g, "$1 ");
      if (p.barcode_url) $("#oxxo-barcode").src = p.barcode_url; else $("#oxxo-barcode").classList.add("hide");
      $("#pix-code").value = p.reference;
      $("#pix-copy").textContent = "Copiar referencia";
      $("#pay-lead").textContent = "Paga en efectivo en cualquier tienda OXXO para confirmar tu pedido.";
      $("#pay-expiry").textContent = expTxt ? "Tu referencia vence el " + expTxt : "";
      $("#how-title").textContent = "Cómo pagar en OXXO";
      $("#how-steps").innerHTML = steps(["Acude a cualquier tienda <strong>OXXO</strong>.", "Dile al cajero que quieres hacer un pago de <strong>OXXO Pay</strong>.", "Muestra el código de barras o dicta la <strong>referencia</strong>.", "Paga el monto exacto en efectivo y conserva tu ticket.", "Tu pedido se confirma automáticamente; te avisaremos por correo."]);
    } else {
      $("#spei-box").classList.remove("hide");
      $("#spei-clabe").textContent = String(p.clabe).replace(/(\d{3})(\d{3})(\d{11})(\d)/, "$1 $2 $3 $4");
      $("#spei-bank").textContent = p.bank_name || "STP";
      $("#spei-benef").textContent = p.beneficiary || "";
      if (p.reference) { $("#spei-ref-row").classList.remove("hide"); $("#spei-ref").textContent = p.reference; }
      $("#pix-code").value = p.clabe;
      $("#pix-copy").textContent = "Copiar CLABE";
      $("#pay-lead").innerHTML = "Transfiere por SPEI en los próximos <strong><span id=\"pix-timer\">30:00</span></strong> minutos para asegurar tu pedido.";
      $("#pay-expiry").textContent = expTxt ? "Esta CLABE es válida para un solo pago hasta el " + expTxt : "";
      $("#how-title").textContent = "Cómo pagar por SPEI";
      $("#how-steps").innerHTML = steps(["Toca <strong>Copiar CLABE</strong>.", "Abre la app o banca en línea de tu banco.", "Elige <strong>Transferir</strong> y agrega la CLABE como nuevo destinatario.", "Envía <strong>exactamente " + money(total) + "</strong> (un monto distinto se devuelve).", "Listo: tu pedido se confirma automáticamente en minutos."]);
    }
    $("#view-checkout").classList.add("hide");
    $("#view-pix").classList.remove("hide");
    window.scrollTo(0, 0);
  }

  function startTimer() {
    let left = 30 * 60;
    setInterval(() => {
      const el = $("#pix-timer");
      if (!el || left <= 0) return;
      left--;
      el.textContent = String(Math.floor(left / 60)).padStart(2, "0") + ":" + String(left % 60).padStart(2, "0");
    }, 1000);
  }

  function pollStatus(id) {
    const iv = setInterval(async () => {
      try {
        const r = await fetch("/api/public/payment-status?transaction_id=" + encodeURIComponent(id));
        const d = await r.json();
        if (d.status === "paid" || d.status === "approved") {
          clearInterval(iv);
          try { if (window.fbPurchase) window.fbPurchase(totals().total, id); } catch (e) {}
          try { if (window.ttPurchase) window.ttPurchase(totals().total, id); } catch (e) {}
          try { if (window.gadsPurchase) window.gadsPurchase(totals().total, id); } catch (e) {}
          setTimeout(() => { location.href = "/celimax/upsell.html?step=1&" + customerQuery(); }, 600);
        }
      } catch (e) {}
    }, 5000);
  }


  function customerQuery() {
    const p = new URLSearchParams();
    p.set("nome", $("#name").value.trim());
    p.set("email", $("#email").value.trim());
        p.set("phone", digits($("#phone").value));
    return p.toString();
  }

  function setupComprovante(txId) {
    const box = $("#comp-box");
    const input = $("#comp-file");
    const status = $("#comp-status");
    if (!box || !input || !txId) return;
    setTimeout(() => box.classList.remove("hide"), 20000);
    input.addEventListener("change", async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      status.style.color = "#0f9c74";
      status.textContent = "Enviando comprobante...";
      const fd = new FormData();
      fd.append("file", f);
      fd.append("transaction_id", String(txId));
      try {
        const r = await fetch("/api/public/upload-comprovante", { method: "POST", body: fd });
        const d = await r.json();
        if (d && d.success) {
          status.style.color = "#0f9c74";
          status.textContent = "\u2713 ¡Comprobante recibido! Nuestro equipo confirmará tu pedido en unos minutos.";
        } else {
          status.style.color = "#c0392b";
          status.textContent = "Error al enviar: " + ((d && d.message) || "inténtalo de nuevo");
        }
      } catch (err) {
        status.style.color = "#c0392b";
        status.textContent = "Error de conexión, inténtalo de nuevo.";
      }
    });
  }

  function legacyCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "0";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      var sel = document.getSelection();
      var saved = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length); // iOS
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (saved && sel) { sel.removeAllRanges(); sel.addRange(saved); }
      return ok;
    } catch (e) { return false; }
  }

  function copyFeedback(ok, text) {
    var btn = $("#pix-copy");
    if (!btn) return;
    if (ok) {
      var lbl = btn.innerHTML; btn.innerHTML = "¡Copiado!";
      setTimeout(function () { btn.innerHTML = lbl; }, 2000);
    } else {
      var lbl2 = btn.innerHTML; btn.innerHTML = "Mantén presionado el número para copiarlo";
      var inp = $("#pix-code");
      if (inp) {
        inp.removeAttribute("readonly");
        inp.focus();
        try { inp.setSelectionRange(0, String(text).length); } catch (e) {}
        inp.select();
      }
      setTimeout(function () { btn.innerHTML = lbl2; }, 4000);
    }
  }

  $("#pix-copy").addEventListener("click", function () {
    var inp = $("#pix-code");
    var text = (inp && inp.value) || "";
    if (!text) return;
    // 1) fallback sincrono primeiro (funciona em WebViews do Facebook/Instagram)
    var ok = legacyCopy(text);
    if (ok) { copyFeedback(true, text); return; }
    // 2) Clipboard API moderna (precisa de contexto seguro)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { copyFeedback(true, text); },
        function () { copyFeedback(false, text); }
      );
    } else {
      copyFeedback(false, text);
    }
  });


  render();
})();
