/**
 * Script para paginas de produtos
 * Extrai dados do produto e integra com o sistema de carrinho
 */

/**
 * Extrai dados do produto da pagina atual
 * @returns {Object} Dados do produto
 */
function getProductData() {
    // ID baseado no path da pagina
    const pathParts = window.location.pathname.split('/');
    const productFolder = pathParts[pathParts.length - 2] || pathParts[pathParts.length - 1];
    const productId = productFolder.replace(/\//g, '') || 'produto-' + Date.now();

    // Titulo do produto
    const titleElement = document.querySelector('.title');
    const title = titleElement ? titleElement.textContent.trim() : 'Produto';

    // Preco do produto (remove R$, pontos e virgulas)
    const priceElement = document.querySelector('.new-price2');
    let price = 0;
    if (priceElement) {
        const priceText = priceElement.textContent.trim();
        // Remove "R$", espacos, e converte virgula para ponto
        price = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;
    }

    // Imagem do produto
    const mainImage = document.querySelector('.main-image');
    const thumbnailImage = document.querySelector('.thumbnails img');
    let image = '';
    
    if (mainImage && mainImage.src) {
        image = mainImage.src;
    } else if (thumbnailImage && thumbnailImage.src) {
        image = thumbnailImage.src;
    }

    // Se a imagem já é uma URL completa (absoluta), não precisa ajustar
    // Caso contrário, será ajustada quando exibida no carrinho
    // Não fazemos nenhuma transformação aqui para evitar problemas

    return {
        id: productId,
        title: title,
        price: price,
        image: image
    };
}

/**
 * Adiciona o produto atual ao carrinho
 * @param {HTMLElement} triggerBtn - O botão que acionou a ação
 */
function addCurrentProductToCart(triggerBtn) {
    const product = getProductData();
    
    if (product.price <= 0) {
        console.warn('Preco do produto invalido');
        return false;
    }

    // Anima TODOS os botões de adicionar ao carrinho para consistência
    setAllButtonsLoading(true);

    // Pequeno delay para melhor UX
    setTimeout(() => {
        Cart.addItem(product);
        setAllButtonsSuccess();
    }, 800);
    
    return true;
}

/**
 * Define estado de loading para todos os botões de carrinho
 */
function setAllButtonsLoading(isLoading) {
    const buttons = document.querySelectorAll('.pergunta-botao, .styled-button, .floating-add-cart');
    
    buttons.forEach(button => {
        if (isLoading) {
            // Salva estado original se ainda não salvou
            if (!button.getAttribute('data-original-text')) {
                button.setAttribute('data-original-text', button.innerHTML);
                button.setAttribute('data-original-bg', button.style.backgroundColor);
                button.style.width = button.offsetWidth + 'px'; // Fixa largura
            }
            
            button.disabled = true;
            // Limpa tudo e põe só o spinner
            button.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
                    <svg class="spinner" viewBox="0 0 50 50" style="width: 24px; height: 24px; animation: rotate 2s linear infinite;">
                        <circle class="path" cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5" style="stroke: white; stroke-linecap: round; animation: dash 1.5s ease-in-out infinite;"></circle>
                    </svg>
                </div>
            `;
        }
    });
}

/**
 * Define estado de sucesso para todos os botões
 */
function setAllButtonsSuccess() {
    const buttons = document.querySelectorAll('.pergunta-botao, .styled-button, .floating-add-cart');
    
    buttons.forEach(button => {
        button.style.backgroundColor = '#00a650';
        button.style.color = '#fff';
        button.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span class="material-symbols-outlined" style="font-size: 24px; animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">check</span>
                <span style="animation: fadeIn 0.3s ease;">Adicionado!</span>
            </div>
        `;
        
        // Volta ao normal após 2 segundos
        setTimeout(() => {
            button.style.transition = 'all 0.3s ease';
            button.style.backgroundColor = button.getAttribute('data-original-bg') || '';
            button.style.color = '';
            button.style.width = ''; 
            button.innerHTML = button.getAttribute('data-original-text') || 'Adicionar ao Carrinho';
            button.disabled = false;
        }, 2000);
    });

    // Anima badge
    const cartBadge = document.getElementById('cartBadge');
    if (cartBadge) {
        cartBadge.style.animation = 'none';
        cartBadge.offsetHeight; 
        cartBadge.style.animation = 'badgeBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    }

    // Adiciona estilos globais se necessário
    if (!document.getElementById('cartAnimationStyles')) {
        const style = document.createElement('style');
        style.id = 'cartAnimationStyles';
        style.textContent = `
            @keyframes rotate { 100% { transform: rotate(360deg); } }
            @keyframes dash {
                0% { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
                50% { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
                100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
            }
            @keyframes popIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes badgeBounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.4); background-color: #ff3333; } }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Adiciona o produto e redireciona para o carrinho
 */
function addToCartAndRedirect() {
    if (addCurrentProductToCart()) {
        window.location.href = '/loja/carrinho/';
    }
}

/**
 * Inicializa os botoes de adicionar ao carrinho
 * Substitui os onclick de checkout existentes
 */
function initCartButtons() {
    // Botão principal
    const buyButton = document.getElementById('addToCartBtn');
    
    if (buyButton) {
        buyButton.removeAttribute('onclick');
        buyButton.removeAttribute('redirect-link');
        buyButton.addEventListener('click', function(e) {
            e.preventDefault();
            addCurrentProductToCart(this);
        });
        buyButton.textContent = 'Adicionar ao Carrinho';
    }

    // Botões .pergunta-botao
    const allBuyButtons = document.querySelectorAll('.pergunta-botao');
    allBuyButtons.forEach(button => {
        button.removeAttribute('onclick');
        button.removeAttribute('redirect-link');
        button.addEventListener('click', function(e) {
            e.preventDefault();
            addCurrentProductToCart(this);
        });
        if (!button.id) {
            button.textContent = 'Adicionar ao Carrinho';
        }
    });

    // Configura botão secundário (.styled-button)
    const secondaryButtons = document.querySelectorAll('.styled-button');
    secondaryButtons.forEach(button => {
        const parentDiv = button.closest('.button-container');
        if (parentDiv) {
            parentDiv.removeAttribute('onclick');
            parentDiv.removeAttribute('href');
        }
        
        button.removeAttribute('onclick');
        button.addEventListener('click', function(e) {
            e.preventDefault();
            addCurrentProductToCart(this);
        });
        
        // Atualiza o texto do botão secundário
        const titleSpan = button.querySelector('.button-title');
        const subtitleSpan = button.querySelector('.button-subtitle');
        if (titleSpan) titleSpan.textContent = 'ADICIONAR AO CARRINHO';
        if (subtitleSpan) subtitleSpan.textContent = 'Compre agora com desconto';
    });

    // Descomentar seções de promoção que estejam comentadas
    ensureSecondButtonExists();

    // Configura o icone do carrinho no header
    setupCartIcon();
}

/**
 * Garante que exista o segundo botão em todas as páginas (Floating Action Bar)
 */
function ensureSecondButtonExists() {
    const existingFloatingBtn = document.getElementById('floatingCartBar');
    
    if (!existingFloatingBtn) {
        // Encontra o preço
        const priceElement = document.querySelector('.new-price2');
        const priceText = priceElement ? priceElement.textContent.trim() : '$9';
        
        const floatingBar = document.createElement('div');
        floatingBar.id = 'floatingCartBar';
        floatingBar.innerHTML = `
            <div class="floating-content">
                <div class="product-info-mini">
                    <span class="price-label">Total:</span>
                    <span class="price-value">${priceText}</span>
                </div>
                <button class="floating-add-cart">
                    <span class="btn-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor"><path d="M440-600v-120H320v-80h120v-120h80v120h120v80H520v120h-80ZM280-80q-33 0-56.5-23.5T200-160q0-33 23.5-56.5T280-240q33 0 56.5 23.5T360-160q0 33-23.5 56.5T280-80Zm400 0q-33 0-56.5-23.5T600-160q0-33 23.5-56.5T660-240q33 0 56.5 23.5T740-160q0 33-23.5 56.5T660-80ZM246-720l96 200h280l110-200H246Zm-38-80h590q23 0 35 20.5t1 41.5L692-402q-11 20-29 32t-39 12H324l-52 96h488v80H272q-33 0-49.5-27.5T242-260l70-128-90-192H80v-80h128Zm128 200h280-280Z"/></svg>
                    </span>
                    <span class="btn-text">Adicionar ao Carrinho</span>
                </button>
            </div>
        `;
        
        document.body.appendChild(floatingBar);
        
        // Estilos modernos
        if (!document.getElementById('floatingBarStyles')) {
            const style = document.createElement('style');
            style.id = 'floatingBarStyles';
            style.textContent = `
                #floatingCartBar {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(12px);
                    box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
                    z-index: 1000;
                    padding: 12px 20px;
                    border-top: 1px solid rgba(0,0,0,0.05);
                    transform: translateY(100%);
                    animation: slideUpBar 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    animation-delay: 0.2s;
                }
                
                .floating-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .product-info-mini {
                    display: flex;
                    flex-direction: column;
                }

                .price-label {
                    font-size: 12px;
                    color: #666;
                    font-family: 'GellixRegular', sans-serif;
                }

                .price-value {
                    font-size: 20px;
                    color: #333;
                    font-family: 'GellixSemiBold', sans-serif;
                    line-height: 1;
                }

                .floating-add-cart {
                    background: #3483FA;
                    color: white;
                    border: none;
                    height: 48px;
                    padding: 0 32px;
                    border-radius: 24px;
                    font-family: 'GellixSemiBold', sans-serif;
                    font-size: 16px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 12px rgba(52, 131, 250, 0.25);
                    overflow: hidden;
                    position: relative;
                }

                .floating-add-cart:active {
                    transform: scale(0.96);
                }

                .btn-icon video, .btn-icon svg {
                    display: block;
                }

                @media (max-width: 480px) {
                    .floating-add-cart {
                        padding: 0 24px;
                    }
                    .btn-text {
                        font-size: 14px;
                    }
                    .price-value {
                        font-size: 18px;
                    }
                }
                
                @keyframes slideUpBar {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Evento
        const btn = floatingBar.querySelector('.floating-add-cart');
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            addCurrentProductToCart(this);
        });
    }
}

/**
 * Adiciona badge de quantidade no icone do carrinho
 */
function addCartBadge() {
    const cartIconContainer = document.querySelector('.menu-icon:last-child');
    if (!cartIconContainer) return;

    // Verifica se ja tem badge
    if (document.getElementById('cartBadge')) return;

    // Cria o badge
    const badge = document.createElement('span');
    badge.id = 'cartBadge';
    badge.style.cssText = `
        position: absolute;
        top: -5px;
        right: -5px;
        background-color: #ff3b3b;
        color: white;
        font-size: 10px;
        font-family: 'GellixMedium', sans-serif;
        padding: 2px 6px;
        border-radius: 10px;
        display: none;
        align-items: center;
        justify-content: center;
        min-width: 16px;
    `;
    badge.textContent = '0';

    // Ajusta container para position relative
    cartIconContainer.style.position = 'relative';
    cartIconContainer.appendChild(badge);

    // Atualiza badge
    Cart.updateCartBadge();
}

/**
 * Configura o icone do carrinho no header
 */
function setupCartIcon() {
    // Procura por icones de carrinho na pagina
    const allIcons = document.querySelectorAll('.material-symbols-outlined');
    allIcons.forEach(icon => {
        if (icon.textContent.trim() === 'shopping_cart') {
            const parent = icon.parentElement;
            parent.style.cursor = 'pointer';
            parent.onclick = function() {
                window.location.href = '/loja/carrinho/';
            };
        }
    });
}

// Inicializa quando a pagina carregar
document.addEventListener('DOMContentLoaded', function() {
    initCartButtons();
    addCartBadge();
    setupCartIcon();
});
