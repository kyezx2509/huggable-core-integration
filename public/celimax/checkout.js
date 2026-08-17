(function () {
  const PRODUCTS = {
    "2906947154796": { name: "Celimax Retinal Collagen Lifting Cream - 1 Unidade", price: 67, img: "https://sweet-install-fairy.lovable.app/celimax/co/f6e92234.png" },
    "2906958297659": { name: "Celimax Retinal Collagen Lifting Cream - 3 Unidades", price: 97, img: "https://sweet-install-fairy.lovable.app/celimax/co/f6e92234.png" },
    "2906929863847": { name: "Celimax Retinal Collagen Lifting Cream - 5 Unidades", price: 127, img: "https://sweet-install-fairy.lovable.app/celimax/co/f6e92234.png" },
    "2906912000012": { name: "Celimax Retinal Collagen Lifting Cream - 12 Unidades (Tratamento de 1 Ano)", price: 189.9, img: "https://sweet-install-fairy.lovable.app/__l5e/assets-v1/8b2467af-688e-4c40-a37e-00fb72a45992/kit-12-tubes-new.jpeg" },

  };
  const REVIEWS = [
    { n: "Juliana M.", t: "Produto original e bem embalado. Chegou antes do prazo, super recomendo a loja!", a: "/celimax/co/4bd232d9.png" },
    { n: "Patrícia S.", t: "Comprei com medo por ser promoção, mas veio tudo certinho e funcionando perfeitamente.", a: "/celimax/co/4dfa34de.png" },
    { n: "Camila R.", t: "Atendimento ótimo e entrega rápida. Já é a segunda compra que faço por aqui.", a: "/celimax/co/73626f59.png" },
    { n: "Fernanda L.", t: "Preço muito abaixo do mercado e o produto é exatamente igual ao anúncio. Amei!", a: "/celimax/co/75ae5e55.png" },
    { n: "Aline T.", t: "Pagamento no Pix aprovado na hora e o rastreio chegou no mesmo dia. Confiável.", a: "/celimax/co/d3167525.png" },
  ];

  const UPSELLS = {
    up1: { name: "Creme Uniformizador da Pele - Celimax", price: 37.83 },
    up2: { name: "Creme Anti-Flacidez para Pescoço - YCZ", price: 28.81 },
  };

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const money = (v) => "R$\u00a0" + v.toFixed(2).replace(".", ",");
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
  const ANNUAL_BUMP_PRICE = 149.9;
  const ANNUAL_IMG = "https://sweet-install-fairy.lovable.app/__l5e/assets-v1/8b2467af-688e-4c40-a37e-00fb72a45992/kit-12-tubes-new.jpeg";

  const state = { qty: Math.max(1, parseInt(params.get("qty") || "1", 10)), shipping: 0, upsells: {}, freeShipping: false };


  function totals() {
    let sub = product.price * state.qty;
    Object.keys(state.upsells).forEach((k) => { if (state.upsells[k]) sub += UPSELLS[k].price; });
    return { sub: sub, freight: state.shipping, total: sub + state.shipping };
  }

  // InitiateCheckout - dispara sempre que o lead entra no checkout (independente de venda)
  (function fireInitiateCheckout(tries) {
    tries = tries || 0;
    var value = totals().total;
    var prod = { id: pid, name: product.name, qty: state.qty };
    var sent = false;
    try {
      if (window.fbInitiateCheckout) { window.fbInitiateCheckout(value, prod); sent = true; }
      else if (window.fbq) { window.fbq("track", "InitiateCheckout", { value: value, currency: "BRL", content_name: product.name, content_ids: [pid], num_items: state.qty }); sent = true; }
    } catch (e) {}
    try {
      if (window.utmifyTrack) window.utmifyTrack("InitiateCheckout", { value: value, currency: "BRL", product: product.name });
      if (window.utmify && typeof window.utmify.track === "function") window.utmify.track("InitiateCheckout", { value: value, currency: "BRL" });
    } catch (e) {}
    if (!sent && tries < 20) setTimeout(function () { fireInitiateCheckout(tries + 1); }, 400);
  })(0);



  function render() {
    const t = totals();
    $$(".js-prod-name").forEach((e) => (e.textContent = product.name));
    $$(".js-prod-img").forEach((e) => (e.src = product.img));
    $$(".js-prod-price").forEach((e) => (e.textContent = money(isCart ? Number(cartItems[0].price || 0) * (Number(cartItems[0].quantity) || 1) : product.price * state.qty)));
    $$(".js-qty").forEach((e) => (e.value = isCart ? cartCount : state.qty));
    $$(".js-count").forEach((e) => (e.textContent = isCart ? cartCount : state.qty));

    $$(".js-subtotal").forEach((e) => (e.textContent = money(t.sub)));
    $$(".js-total").forEach((e) => (e.textContent = money(t.total)));
    $$(".js-freight").forEach((e) => (e.textContent = t.freight ? money(t.freight) : "Grátis"));
    $$(".js-freight-row").forEach((e) => e.classList.toggle("hide", !$("#shipping-wrap") || $("#shipping-wrap").classList.contains("hide")));
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

      const qtyTag = document.createElement("span");
      qtyTag.className = "text-[12px] text-slate-500 whitespace-nowrap";
      qtyTag.textContent = (Number(cartItems[0].quantity) || 1) + "x";
      const priceCol = li.querySelector(".js-prod-price");
      if (priceCol && priceCol.parentElement && priceCol.parentElement.parentElement) {
        priceCol.parentElement.parentElement.appendChild(qtyTag);
      }

      if (cartItems.length < 2) return;

      const extra = document.createElement("li");
      extra.className = "py-2";
      const rest = cartItems.slice(1).map((it) =>
        '<div class="flex items-center gap-3 py-2">' +
        '<img src="' + (it.image || "") + '" alt="" class="w-10 h-10 rounded-lg object-cover border border-slate-200 bg-white">' +
        '<span class="text-[12px] text-black flex-1 min-w-0 break-words leading-tight">' + (it.title || "Produto") + '</span>' +
        '<span class="text-[12px] text-slate-500 whitespace-nowrap">' + (Number(it.quantity) || 1) + "x</span>" +
        '<span class="text-[12px] text-black whitespace-nowrap">' + money(Number(it.price || 0) * (Number(it.quantity) || 1)) + "</span>" +
        "</div>"
      ).join("");
      extra.innerHTML =
        '<button type="button" class="js-see-all w-full text-[13px] font-medium text-[#3483FA] py-1 text-left">Ver todos os produtos (' + cartItems.length + ")</button>" +
        '<div class="js-all-items hide mt-1 divide-y divide-slate-100">' + rest + "</div>";
      li.parentElement.appendChild(extra);

      const btnAll = extra.querySelector(".js-see-all");
      const listAll = extra.querySelector(".js-all-items");
      btnAll.addEventListener("click", () => {
        const hidden = listAll.classList.toggle("hide");
        btnAll.textContent = hidden
          ? "Ver todos os produtos (" + cartItems.length + ")"
          : "Ocultar produtos";
      });
    });
  }



  // ---- masks
  function maskCPF(v) {
    v = digits(v).slice(0, 11);
    return v.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }
  function maskPhone(v) {
    v = digits(v).slice(0, 11);
    if (v.length <= 10) return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  }
  function maskCEP(v) { v = digits(v).slice(0, 8); return v.replace(/(\d{5})(\d)/, "$1-$2"); }
  function validCPF(v) {
    const c = digits(v);
    if (c.length !== 11) return false;
    let s = 0;
    for (let i = 0; i < 9; i++) s += parseInt(c[i]) * (10 - i);
    let d1 = ((s * 10) % 11) % 10;
    s = 0;
    for (let i = 0; i < 10; i++) s += parseInt(c[i]) * (11 - i);
    let d2 = ((s * 10) % 11) % 10;
    return d1 === parseInt(c[9]) && d2 === parseInt(c[10]);
  }

  $("#document").addEventListener("input", (e) => (e.target.value = maskCPF(e.target.value)));
  $("#phone").addEventListener("input", (e) => (e.target.value = maskPhone(e.target.value)));
  $("#zipcode").addEventListener("input", (e) => { e.target.value = maskCEP(e.target.value); if (digits(e.target.value).length === 8) lookupCep(); });

  function err(id, msg) { const el = $(id); el.textContent = msg || ""; el.classList.toggle("hide", !msg); }

  // ---- quantity
  $$("[data-qty]").forEach((b) => b.addEventListener("click", () => {
    state.qty = Math.min(20, Math.max(1, state.qty + parseInt(b.dataset.qty, 10)));
    render();
  }));

  // ---- summary collapse (mobile)
  let open = true;
  $("#summary-toggle").addEventListener("click", () => {
    open = !open;
    $("#summary-body").className = "grid transition-[grid-template-rows] duration-500 ease-in-out " + (open ? "grid-rows-[1fr]" : "grid-rows-[0fr]");
    $("#summary-caret").style.transform = open ? "" : "rotate(180deg)";
  });

  // ---- step 1
  $("#next-button-dados-pessoais").addEventListener("click", () => {
    const name = $("#name").value.trim(), email = $("#email").value.trim();
    if (name.split(" ").filter(Boolean).length < 2) return err("#err-1", "Informe seu nome completo.");
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return err("#err-1", "Informe um e-mail válido.");
    if (!validCPF($("#document").value)) return err("#err-1", "CPF inválido.");
    if (digits($("#phone").value).length < 10) return err("#err-1", "Informe um celular válido.");
    err("#err-1", "");
    $("#account-fields").classList.add("hide");
    $("#account-open-head").classList.add("hide");
    $("#account-done-head").classList.remove("hide");
    $("#sum-name").textContent = name;
    $("#sum-email").textContent = email;
    $("#sum-phone").textContent = "+55 " + $("#phone").value;
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

  // ---- CEP
  async function lookupCep() {
    const cep = digits($("#zipcode").value);
    try {
      const r = await fetch("https://viacep.com.br/ws/" + cep + "/json/");
      const d = await r.json();
      
      // Sempre libera o restante dos campos, mesmo se houver erro ou CEP de cidade única
      $("#address-rest").classList.remove("hide");
      $("#shipping-wrap").classList.remove("hide");
      
      if (!d.erro) {
        $("#zip-check").classList.remove("hide");
        $("#zip-city").textContent = d.localidade + " - " + d.uf;
        if (d.logradouro) $("#street").value = d.logradouro;
        if (d.bairro) $("#neighborhood").value = d.bairro;
        if (d.localidade) $("#city").value = d.localidade;
        if (d.uf) $("#uf").value = d.uf.toUpperCase();
        state.city = d.localidade; 
        state.uf = d.uf;
        if (d.logradouro) $("#number").focus();
      } else {
        $("#zip-check").classList.add("hide");
        // Se for erro, apenas limpa a indicação visual, mas deixa os campos abertos
      }
      render();
    } catch (e) {
      $("#address-rest").classList.remove("hide");
      $("#shipping-wrap").classList.remove("hide");
      $("#zip-check").classList.add("hide");
    }
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
    if (digits($("#zipcode").value).length !== 8) return err("#err-2", "Informe um CEP válido.");
    if (!$("#street").value.trim()) return err("#err-2", "Informe o endereço.");
    if (!$("#number").value.trim()) return err("#err-2", "Informe o número.");
    if (!$("#neighborhood").value.trim()) return err("#err-2", "Informe o bairro.");
    if (!$("#city").value.trim()) return err("#err-2", "Informe a cidade.");
    if (!$("#uf").value) return err("#err-2", "Selecione o estado.");
    err("#err-2", "");
    $("#address-fields").classList.add("hide");
    $("#address-open-head").classList.add("hide");
    $("#address-done-head").classList.remove("hide");
    $("#sum-addr1").textContent = $("#street").value + ", " + $("#number").value + ($("#complement").value ? " - " + $("#complement").value : "");
    $("#sum-addr2").textContent = $("#neighborhood").value + ", " + ($("#city").value || state.city || "") + " - " + ($("#uf").value || state.uf || "") + ", " + $("#zipcode").value;
    $("#sum-frete").textContent = state.shipping ? "SEDEX - " + money(state.shipping) : "CORREIOS - Grátis";
    $("#pay-h2").style.color = "rgb(0,0,0)";
    $("#pay-h2").querySelectorAll("span").forEach((s) => (s.style.color = "rgb(0,0,0)"));
    $("#pay-sub").textContent = "Selecione a forma de pagamento";
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
        textSpan.textContent = on ? "✓ ADICIONADO AO PEDIDO" : "+ SIM! QUERO ADICIONAR";
      }
      render();
    });
  });


  // ---- order bump: upgrade para Tratamento de 1 Ano (R$ 149,90 + frete grátis)
  (function annualBump() {
    if (pid === ANNUAL_PID || pid === "carrinho") return;
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
        btnBump.textContent = "✓ TRATAMENTO DE 1 ANO ADICIONADO";
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
    '<h2 class="text-black font-medium text-[15px] mb-3">Avaliações dos clientes</h2>' +
    '<div class="flex flex-col gap-3">' + REVIEWS.map((r) =>
      '<div class="flex items-start gap-3"><img src="' + r.a + '" class="w-9 h-9 rounded-full object-cover" alt="' + r.n + '">' +
      '<div><p class="text-[13px] font-semibold text-black">' + r.n + '</p>' +
      '<div class="flex gap-0.5 text-[#F5A623] text-[11px]">★★★★★</div>' +
      '<p class="text-[12px] text-slate-600 mt-1">' + r.t + '</p></div></div>').join("") + "</div>";

  // ---- finalizar -> FreePay
  const btn = $("#btn-finalizar");
  btn.addEventListener("click", async () => {
    const t = totals();
    btn.disabled = true;
    btn.innerHTML = "<span>Gerando Pix...</span>";
    // O gateway recebe SEMPRE o nome generico "KIT CELIMAX" (sem nome da loja/produto real)
    const GATEWAY_ITEM_NAME = "KIT CELIMAX";
    const items = [{ title: GATEWAY_ITEM_NAME, name: GATEWAY_ITEM_NAME, unitPrice: Math.round(t.total * 100), price: t.total, quantity: 1 }];
    const payload = {
      amount: Math.round(t.total * 100),
      productName: GATEWAY_ITEM_NAME,
      customer: {
        name: $("#name").value.trim(),
        email: $("#email").value.trim(),
        document: digits($("#document").value),
        phone: digits($("#phone").value),
      },
      shipping: {
        zipcode: digits($("#zipcode").value),
        street: $("#street").value.trim(),
        number: $("#number").value.trim(),
        neighborhood: $("#neighborhood").value.trim(),
        complement: $("#complement").value.trim(),
        city: $("#city").value.trim() || state.city || "",
        state: $("#uf").value || state.uf || "",
        method: state.shipping ? "SEDEX" : "CORREIOS",
        price: Math.round(state.shipping * 100),
      },
      items: items,
      tracking: Object.assign(
        { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null, src: null, sck: null },
        (window.getStoredUtms ? window.getStoredUtms() : {}),
        Object.fromEntries(new URLSearchParams(location.search).entries()),
        (window.fbTracking ? window.fbTracking() : {}),
        { visitor_session_id: localStorage.getItem('_lv_sid') || null }
      ),


    };
    try {
      const r = await fetch("/api/public/freepay-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      const pix = d.data?.pix || d.pix || {};
      const code = pix.copy_paste || pix.qr_code || d.pixCode || d.pix_code;
      const txId = d.data?.id || pix.id || d.transactionId || d.id;
      if (!r.ok || !code) throw new Error(d.error || "Falha ao gerar Pix");
      $("#pix-code").value = code;
      let qrSrc = pix.qr_code_base64;
      if (qrSrc && !String(qrSrc).startsWith("data:")) qrSrc = "data:image/png;base64," + qrSrc;
      $("#pix-qr").src = qrSrc || ("https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&data=" + encodeURIComponent(code));
      $$(".js-total").forEach((e) => (e.textContent = money(t.total)));
      $("#view-checkout").classList.add("hide");
      $("#view-pix").classList.remove("hide");
      window.scrollTo(0, 0);
      startTimer();
      setupComprovante(txId);
      if (txId) pollStatus(txId);
    } catch (e) {
      err("#err-3", e.message || "Não foi possível gerar o Pix. Tente novamente.");
      btn.disabled = false;
      btn.innerHTML = "<span>Finalizar Compra</span>";
    }
  });

  function startTimer() {
    let left = 30 * 60;
    const el = $("#pix-timer");
    setInterval(() => {
      if (left <= 0) return;
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
    p.set("cpf", digits($("#document").value));
    p.set("phone", digits($("#phone").value));
    return p.toString();
  }

  function setupComprovante(txId) {
    const box = $("#comp-box");
    const input = $("#comp-file");
    const status = $("#comp-status");
    if (!box || !input || !txId) return;
    setTimeout(() => box.classList.remove("hide"), 60000);
    input.addEventListener("change", async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      status.style.color = "#0f9c74";
      status.textContent = "Enviando comprovante...";
      const fd = new FormData();
      fd.append("file", f);
      fd.append("transaction_id", String(txId));
      try {
        const r = await fetch("/api/public/upload-comprovante", { method: "POST", body: fd });
        const d = await r.json();
        if (d && d.success) {
          status.style.color = "#0f9c74";
          status.textContent = "✓ Comprovante enviado! Nossa equipe já foi notificada.";
        } else {
          status.style.color = "#c0392b";
          status.textContent = "Erro ao enviar: " + ((d && d.message) || "tente novamente");
        }
      } catch (err) {
        status.style.color = "#c0392b";
        status.textContent = "Erro de conexão, tente novamente.";
      }
    });
  }

  $("#pix-copy").addEventListener("click", () => {
    const inp = $("#pix-code");
    inp.select();
    navigator.clipboard ? navigator.clipboard.writeText(inp.value) : document.execCommand("copy");
    $("#pix-copy").innerHTML = "Código copiado!";
    setTimeout(() => ($("#pix-copy").innerHTML = "Copiar código"), 2000);
  });

  render();
})();
