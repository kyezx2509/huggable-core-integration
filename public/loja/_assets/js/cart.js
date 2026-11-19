/**
 * Sistema de Carrinho de Compras
 * Gerencia adicao, remocao e persistencia de itens no localStorage
 */

const Cart = {
    STORAGE_KEY: 'mercado_cart',

    /**
     * Obtem todos os itens do carrinho
     * @returns {Array} Lista de itens no carrinho
     */
    getItems: function() {
        const cart = localStorage.getItem(this.STORAGE_KEY);
        return cart ? JSON.parse(cart) : [];
    },

    /**
     * Salva os itens no localStorage
     * @param {Array} items - Lista de itens
     */
    saveItems: function(items) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
        this.updateCartBadge();
    },

    /**
     * Adiciona um item ao carrinho
     * @param {Object} product - Objeto com dados do produto
     * @param {string} product.id - ID unico do produto
     * @param {string} product.title - Nome do produto
     * @param {number} product.price - Preco do produto
     * @param {string} product.image - URL da imagem
     * @param {number} product.quantity - Quantidade (default: 1)
     */
    addItem: function(product) {
        const items = this.getItems();
        const existingIndex = items.findIndex(item => item.id === product.id);

        if (existingIndex > -1) {
            // Produto ja existe, incrementa quantidade
            items[existingIndex].quantity += product.quantity || 1;
        } else {
            // Novo produto
            items.push({
                id: product.id,
                title: product.title,
                price: product.price,
                image: product.image,
                quantity: product.quantity || 1
            });
        }

        this.saveItems(items);
        // Notificação removida a pedido (agora feedback é no botão)
        // this.showNotification('Produto adicionado ao carrinho!');
        return true;
    },

    /**
     * Remove um item do carrinho
     * @param {string} productId - ID do produto a remover
     */
    removeItem: function(productId) {
        let items = this.getItems();
        items = items.filter(item => item.id !== productId);
        this.saveItems(items);
    },

    /**
     * Atualiza a quantidade de um item
     * @param {string} productId - ID do produto
     * @param {number} quantity - Nova quantidade
     */
    updateQuantity: function(productId, quantity) {
        const items = this.getItems();
        const index = items.findIndex(item => item.id === productId);

        if (index > -1) {
            if (quantity <= 0) {
                items.splice(index, 1);
            } else {
                items[index].quantity = quantity;
            }
            this.saveItems(items);
        }
    },

    /**
     * Limpa todo o carrinho
     */
    clear: function() {
        localStorage.removeItem(this.STORAGE_KEY);
        this.updateCartBadge();
    },

    /**
     * Calcula o total do carrinho
     * @returns {number} Valor total
     */
    getTotal: function() {
        const items = this.getItems();
        return items.reduce((total, item) => total + (item.price * item.quantity), 0);
    },

    /**
     * Conta o numero total de itens
     * @returns {number} Quantidade total de itens
     */
    getItemCount: function() {
        const items = this.getItems();
        return items.reduce((count, item) => count + item.quantity, 0);
    },

    /**
     * Atualiza o badge do carrinho no header (se existir)
     */
    updateCartBadge: function() {
        const badge = document.getElementById('cartBadge');
        const count = this.getItemCount();
        
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    },

    /**
     * Mostra notificacao de sucesso
     * @param {string} message - Mensagem a exibir
     */
    showNotification: function(message) {
        // Remove notificacao anterior se existir
        const existingNotif = document.getElementById('cartNotification');
        if (existingNotif) {
            existingNotif.remove();
        }

        // Cria nova notificacao
        const notification = document.createElement('div');
        notification.id = 'cartNotification';
        notification.innerHTML = `
            <span class="material-symbols-outlined" style="margin-right: 8px; font-size: 20px;">check_circle</span>
            ${message}
        `;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #00a650;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-family: 'GellixMedium', sans-serif;
            font-size: 14px;
            z-index: 9999;
            display: flex;
            align-items: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideUp 0.3s ease;
        `;

        // Adiciona animacao CSS
        if (!document.getElementById('cartNotifStyles')) {
            const style = document.createElement('style');
            style.id = 'cartNotifStyles';
            style.textContent = `
                @keyframes slideUp {
                    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Remove apos 3 segundos
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    /**
     * Formata valor para moeda brasileira
     * @param {number} value - Valor a formatar
     * @returns {string} Valor formatado
     */
    formatPrice: function(value) {
        return '$' + Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 });
    }
};

// Atualiza badge ao carregar a pagina
document.addEventListener('DOMContentLoaded', function() {
    Cart.updateCartBadge();
});
