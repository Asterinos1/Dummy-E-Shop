let allProducts = [];
let cart = {};

// -------------------------------------------------------------------
// 1. KEYCLOAK CONFIGURATION & INIT
// -------------------------------------------------------------------
const keycloak = new Keycloak({
    url: 'http://localhost:8080',
    realm: 'eshop',
    clientId: 'eshop-client', // Ensure this matches 'eshop-realm.json'
});

// Initialize Keycloak
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const authenticated = await keycloak.init({
            onLoad: 'login-required',
            checkLoginIframe: false 
        });

        if (authenticated) {
            console.log('✅ User authenticated:', keycloak.tokenParsed.preferred_username);
            setupRoleBasedUI();
            
            // Initial Data Load based on Page
            loadCartFromLocalStorage();
            updateCartCount();

            const pageId = document.body.id;
            if (pageId === 'homepage') loadProducts();
            else if (pageId === 'cart-page') loadCartDisplay();
            else if (pageId === 'orders-page') loadOrders();
            else if (pageId === 'my-products-page') loadSellerProducts(); // New function for sellers

        } else {
            window.location.reload();
        }
    } catch (error) {
        console.error('Failed to initialize Keycloak:', error);
    }
});

// Periodic Token Refresh (every 30s)
setInterval(() => {
    keycloak.updateToken(70).then((refreshed) => {
        if (refreshed) console.log('Token refreshed');
    }).catch(() => {
        console.error('Failed to refresh token');
        keycloak.logout();
    });
}, 30000);

// -------------------------------------------------------------------
// 2. AUTHENTICATED FETCH WRAPPER (The "Industry Standard" Way)
// -------------------------------------------------------------------
async function authFetch(url, options = {}) {
    // 1. Refresh token if expired
    if (keycloak.isTokenExpired()) {
        try {
            await keycloak.updateToken(30);
        } catch (error) {
            keycloak.login();
            return null;
        }
    }

    // 2. Append Headers
    const headers = options.headers || {};
    headers['Authorization'] = 'Bearer ' + keycloak.token;
    headers['Content-Type'] = 'application/json';

    try {
        const response = await fetch(url, { ...options, headers });
        
        if (response.status === 401 || response.status === 403) {
            alert("⛔ Access Denied: You do not have permission.");
            return null;
        }
        return response;
    } catch (err) {
        console.error("Network Error:", err);
        alert("Server Unreachable");
        return null;
    }
}

// -------------------------------------------------------------------
// 3. UI HELPERS
// -------------------------------------------------------------------
function setupRoleBasedUI() {
    const roles = keycloak.tokenParsed.realm_access?.roles || [];
    const isSeller = roles.includes('seller');
    const isCustomer = roles.includes('customer');

    document.getElementById('my-products-btn').style.display = isSeller ? 'block' : 'none';
    document.getElementById('cart-btn').style.display = isCustomer ? 'block' : 'none';
    document.getElementById('orders-btn').style.display = isCustomer ? 'block' : 'none';
    
    // Hide "Add to Cart" buttons if not a customer (optional refinement)
    // document.body.classList.add(isSeller ? 'role-seller' : 'role-customer');
}

window.logout = () => keycloak.logout({ redirectUri: 'http://localhost:3000' });

// -------------------------------------------------------------------
// 4. PRODUCT LOGIC (Public / Customer)
// -------------------------------------------------------------------
async function loadProducts() {
    // Note: Public GET does not strictly require auth, but good to include if API allows it
    const response = await fetch('http://localhost:5000/api/products'); 
    if (response.ok) {
        allProducts = await response.json();
        displayProducts(allProducts);
    }
}

function displayProducts(products) {
    const list = document.getElementById('product-list');
    list.innerHTML = '';
    products.forEach(p => {
        const li = document.createElement('li');
        li.className = 'product-item';
        li.innerHTML = `
            <img src="${p.image_url}" alt="${p.name}" style="max-width:200px">
            <h3>${p.name}</h3>
            <p>${p.description}</p>
            <p><strong>$${p.price}</strong> | Stock: ${p.quantity}</p>
            <div class="cart-controls">
                <button onclick="updateCartItem(${p.id}, '${p.name}', ${p.price}, -1)">-</button>
                <span id="qty-${p.id}">${cart[p.id]?.quantity || 0}</span>
                <button onclick="updateCartItem(${p.id}, '${p.name}', ${p.price}, 1)">+</button>
            </div>
        `;
        list.appendChild(li);
    });
}

window.searchProducts = () => {
    const term = document.getElementById('search-bar').value.toLowerCase();
    const filtered = allProducts.filter(p => p.name.toLowerCase().includes(term));
    displayProducts(filtered);
};

// -------------------------------------------------------------------
// 5. CART LOGIC
// -------------------------------------------------------------------
window.updateCartItem = (id, name, price, change) => {
    if (!cart[id]) cart[id] = { id, name, price, quantity: 0 };
    cart[id].quantity += change;
    if (cart[id].quantity <= 0) delete cart[id];
    
    // Update UI
    const span = document.getElementById(`qty-${id}`);
    if (span) span.innerText = cart[id]?.quantity || 0;
    
    saveCartToLocalStorage();
    updateCartCount();
    if (document.body.id === 'cart-page') loadCartDisplay();
};

function saveCartToLocalStorage() { localStorage.setItem('cart', JSON.stringify(cart)); }
function loadCartFromLocalStorage() { cart = JSON.parse(localStorage.getItem('cart')) || {}; }
function updateCartCount() {
    const total = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-count');
    if (badge) badge.innerText = total;
}

function loadCartDisplay() {
    const list = document.getElementById('cart-list');
    const totalEl = document.getElementById('total-price');
    list.innerHTML = '';
    let total = 0;

    Object.values(cart).forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `${item.name} x ${item.quantity} = <strong>$${(item.price * item.quantity).toFixed(2)}</strong>`;
        list.appendChild(li);
        total += item.price * item.quantity;
    });
    totalEl.innerText = total.toFixed(2);
}

window.placeOrder = async () => {
    const items = Object.values(cart);
    if (items.length === 0) return alert("Cart is empty!");

    const orderPayload = {
        products: items.map(i => ({ product_id: i.id, title: i.name, amount: i.quantity })),
        total_price: items.reduce((sum, i) => sum + (i.price * i.quantity), 0)
    };

    const response = await authFetch('http://localhost:5001/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderPayload)
    });

    if (response && response.ok) {
        const order = await response.json();
        alert(`✅ Order #${order.id} Placed! Status: ${order.status}.\nCheck 'Orders' page for updates.`);
        cart = {};
        saveCartToLocalStorage();
        window.location.href = 'orders.html';
    }
};

// -------------------------------------------------------------------
// 6. ORDERS LOGIC
// -------------------------------------------------------------------
async function loadOrders() {
    const response = await authFetch('http://localhost:5001/api/orders');
    if (response && response.ok) {
        const orders = await response.json();
        const list = document.getElementById('orders-list');
        list.innerHTML = orders.length ? '' : '<p>No orders found.</p>';
        
        orders.forEach(o => {
            const li = document.createElement('li');
            li.innerHTML = `
                <h3>Order #${o.id} - <span class="status-${o.status.toLowerCase()}">${o.status}</span></h3>
                <p>Total: $${o.total_price}</p>
                <ul>${o.products.map(p => `<li>${p.title} x${p.amount}</li>`).join('')}</ul>
            `;
            list.appendChild(li);
        });
    }
}

// -------------------------------------------------------------------
// 7. SELLER LOGIC (New!)
// -------------------------------------------------------------------
async function loadSellerProducts() {
    // We reuse the public API but filter in UI or create a specific 'my-products' endpoint. 
    // Ideally, backend should have GET /api/my-products. 
    // For now, let's fetch all and filter by username if the backend supports it, 
    // or just fetch all and let the user see what they can edit.
    
    // Better approach: Let's assume GET /api/products returns everything, 
    // and we only show "Delete" buttons if the current user owns it? 
    // No, cleaner to fetch all.
    
    const response = await fetch('http://localhost:5000/api/products'); 
    if (response.ok) {
        const products = await response.json();
        // Since we didn't implement a specific "GET /my-products" endpoint in backend,
        // we display all. Real-world would filter by seller_username here or in API.
        displaySellerDashboard(products);
    }
}

function displaySellerDashboard(products) {
    const list = document.getElementById('product-list');
    list.innerHTML = '';
    
    // Get current username
    const myUsername = keycloak.tokenParsed.preferred_username;

    products.forEach(p => {
        // Only show products belonging to me
        if (p.seller_username !== myUsername) return;

        const li = document.createElement('li');
        li.className = 'product-item';
        li.innerHTML = `
            <h3>${p.name}</h3>
            <p>Stock: ${p.quantity}</p>
            <button onclick="deleteProduct(${p.id})">Delete</button>
        `;
        list.appendChild(li);
    });
}

window.addProduct = async (e) => {
    e.preventDefault();
    const data = {
        name: document.getElementById('name').value,
        description: document.getElementById('description').value,
        price: parseFloat(document.getElementById('price').value),
        image_url: document.getElementById('image_url').value,
        quantity: parseInt(document.getElementById('quantity').value)
    };

    const response = await authFetch('http://localhost:5000/api/products', {
        method: 'POST',
        body: JSON.stringify(data)
    });

    if (response && response.ok) {
        alert("Product Added!");
        document.getElementById('add-product-form').reset();
        loadSellerProducts();
    }
};

window.deleteProduct = async (id) => {
    if(!confirm("Delete this product?")) return;
    const response = await authFetch(`http://localhost:5000/api/products/${id}`, { method: 'DELETE' });
    if (response && response.ok) loadSellerProducts();
};

// Bind form submit for sellers
const addForm = document.getElementById('add-product-form');
if (addForm) addForm.onsubmit = window.addProduct;