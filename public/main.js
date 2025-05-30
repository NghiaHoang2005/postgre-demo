// ======= SPA Routing & State =========
const sectionIds = [
  'loginPage', 'registerPage', 'productsPage', 'cartPage', 'ordersPage', 'adminPage'
];
const userPanel = document.getElementById('userPanel');
const adminNavLink = document.getElementById('adminNavLink');
const brandLogo = document.getElementById('brandLogo');
let currentUser = null; // {username, role, token}

// ----------- SPA Page Show/Hide -----------
function showPage(page) {
  // Ẩn hết
  sectionIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  // Hiện đúng section
  const el = document.getElementById(page + 'Page');
  if (el) el.style.display = 'block';

  // Điều chỉnh nav, admin link, user panel
  updateNav(page);

  // Load dữ liệu khi cần
  if (page === 'products') loadProducts();
  if (page === 'cart') loadCart();
  if (page === 'orders') loadOrders();
  if (page === 'admin') loadAdminProducts();
}
function updateNav(page) {
  // Chỉnh active nav
  document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
  if (page === 'products') document.querySelector('a[href="#products"]').classList.add('active');
  if (page === 'cart') document.querySelector('a[href="#cart"]').classList.add('active');
  if (page === 'orders') document.querySelector('a[href="#orders"]').classList.add('active');
  if (page === 'admin') document.querySelector('a[href="#admin"]').classList.add('active');

  // Admin link chỉ hiển thị nếu user là admin
  if (currentUser && currentUser.role === 'admin') adminNavLink.style.display = '';
  else adminNavLink.style.display = 'none';

  // User panel
  if (currentUser) {
    userPanel.innerHTML = `
      Xin chào, <b>${currentUser.username}</b> (${currentUser.role})
      <button onclick="logout()" class="btn">Đăng xuất</button>
    `;
  } else {
    userPanel.innerHTML = '';
  }
}

// --------- SPA Routing ----------
window.onhashchange = function() {
  let page = (window.location.hash || '#login').replace('#', '');
  if (!currentUser && (page !== 'login' && page !== 'register')) page = 'login';
  if (currentUser && (page === 'login' || page === 'register')) page = 'products';
  if (page === 'admin' && (!currentUser || currentUser.role !== 'admin')) page = 'products';
  showPage(page);
};
window.onhashchange();

brandLogo.onclick = () => {
  if (currentUser && currentUser.role === 'admin') location.hash = '#admin';
  else location.hash = '#products';
};

// --------- Ghi nhớ user khi reload ----------
if (localStorage.getItem('user')) {
  try {
    currentUser = JSON.parse(localStorage.getItem('user'));
  } catch {}
}

// --------- Đăng nhập ---------
document.getElementById('loginForm').onsubmit = async function(e) {
  e.preventDefault();
  const username = loginUsername.value.trim();
  const password = loginPassword.value;
  loginMsg.textContent = '';
  try {
    let res = await fetch('/api/users/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username, password})
    });
    let data = await res.json();
    if (res.ok) {
      currentUser = {username: data.username, role: data.role, token: data.token};
      localStorage.setItem('user', JSON.stringify(currentUser));
      window.location.hash = data.role === 'admin' ? '#admin' : '#products';
      loginUsername.value = loginPassword.value = '';
      loginMsg.textContent = '';
    } else {
      loginMsg.textContent = data.message || 'Sai tên đăng nhập hoặc mật khẩu!';
    }
  } catch {
    loginMsg.textContent = 'Không thể kết nối server!';
  }
};

// --------- Đăng ký ---------
document.getElementById('registerForm').onsubmit = async function(e) {
  e.preventDefault();
  const username = regUsername.value.trim();
  const password = regPassword.value;
  const role = regRole.value; // luôn là 'customer'
  registerMsg.textContent = '';
  try {
    let res = await fetch('/api/users/register', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username, password, role})
    });
    let data = await res.json();
    if (res.ok) {
      registerMsg.textContent = 'Đăng ký thành công! Đang chuyển sang đăng nhập...';
      registerMsg.classList.add('success');
      setTimeout(() => { window.location.hash = '#login'; registerMsg.textContent = ''; }, 1000);
      regUsername.value = regPassword.value = '';
    } else {
      registerMsg.textContent = data.message || 'Đăng ký thất bại!';
    }
  } catch {
    loginMsg.textContent = 'Không thể kết nối server: ';
  }
};

// --------- Đăng xuất ---------
function logout() {
  localStorage.removeItem('user');
  currentUser = null;
  window.location.hash = '#login';
}

// ========== SẢN PHẨM ==========
let allProducts = [];
async function loadProducts(keyword = '') {
  let url = '/api/products';
  if (keyword) url += '?q=' + encodeURIComponent(keyword);
  let res = await fetch(url);
  let data = await res.json();
  allProducts = Array.isArray(data) ? data : [];
  renderProducts();
}
function renderProducts() {
  const wrap = document.getElementById('products');
  wrap.innerHTML = '';
  if (!allProducts.length) {
    wrap.innerHTML = '<div style="text-align:center;color:#888;">Không có sản phẩm nào.</div>';
    return;
  }
  for (const p of allProducts) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${p.data.image || 'https://placehold.co/170x140'}" alt="Ảnh sản phẩm">
      <div class="prod-name">${p.data.name}</div>
      <div class="prod-price">${Number(p.data.price).toLocaleString()} đ</div>
      <div class="prod-desc">${p.data.description || ''}</div>
      <div class="prod-actions">
        <button class="btn accent" onclick="addToCart('${p.id}')">Thêm vào giỏ</button>
      </div>
    `;
    wrap.appendChild(card);
  }
}
document.getElementById('searchBtn').onclick = function() {
  loadProducts(searchInput.value);
};
document.getElementById('searchInput').onkeydown = function(e) {
  if (e.key === 'Enter') loadProducts(searchInput.value);
};

// ========== GIỎ HÀNG ==========
let cart = JSON.parse(localStorage.getItem('cart') || '{}');
function addToCart(productId) {
  cart[productId] = (cart[productId] || 0) + 1;
  localStorage.setItem('cart', JSON.stringify(cart));
  loadCart();
}
function loadCart() {
  const wrap = document.getElementById('cartItems');
  let total = 0;
  wrap.innerHTML = '';
  for (const pid in cart) {
    const prod = allProducts.find(p => p.id == pid);
    if (!prod) continue;
    total += prod.data.price * cart[pid];
    wrap.innerHTML += `
      <div>
        <b>${prod.data.name}</b> x ${cart[pid]}
        <span style="color:var(--secondary);font-weight:600;">${(prod.data.price * cart[pid]).toLocaleString()} đ</span>
        <button onclick="removeFromCart('${pid}')">Xóa</button>
      </div>
    `;
  }
  document.getElementById('cartTotal').textContent = `Tổng: ${total.toLocaleString()} đ`;
  if (total === 0) {
    wrap.innerHTML = '<i>Giỏ hàng trống.</i>';
    checkoutBtn.style.display = 'none';
  } else {
    checkoutBtn.style.display = '';
  }
}
function removeFromCart(pid) {
  delete cart[pid];
  localStorage.setItem('cart', JSON.stringify(cart));
  loadCart();
}
document.getElementById('checkoutBtn').onclick = async function() {
  cartMsg.textContent = '';
  if (!currentUser) {
    cartMsg.textContent = 'Bạn cần đăng nhập!';
    return;
  }
  if (!Object.keys(cart).length) {
    cartMsg.textContent = 'Giỏ hàng trống!';
    return;
  }
  try {
    let res = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': currentUser.token
      },
      body: JSON.stringify({items: cart})
    });
    let data = await res.json();
    if (res.ok) {
      cartMsg.textContent = 'Đặt hàng thành công!';
      cartMsg.classList.add('success');
      cart = {};
      localStorage.setItem('cart', '{}');
      loadCart();
      loadOrders();
      setTimeout(() => { cartMsg.textContent = ''; }, 1200);
    } else {
      cartMsg.textContent = data.message || 'Đặt hàng thất bại!';
    }
  } catch {
    cartMsg.textContent = 'Không thể kết nối server!';
  }
};

// ========== ĐƠN HÀNG ==========
async function loadOrders() {
  if (!currentUser) return;
  let res = await fetch('/api/orders', {
    headers: {'Authorization': currentUser.token}
  });
  let data = await res.json();
  const wrap = document.getElementById('ordersList');
  if (!Array.isArray(data) || !data.length) {
    wrap.innerHTML = '<i>Chưa có đơn hàng nào.</i>';
    return;
  }
  wrap.innerHTML = '';
  for (const order of data) {
    let items = '';
    for (const it of order.items) {
      items += `<div style="font-size:1em;">${it.product.data.name} x ${it.quantity} - <b>${(it.product.data.price*it.quantity).toLocaleString()} đ</b></div>`;
    }
    wrap.innerHTML += `
      <div>
        <div>Mã đơn: <b>#${order.id}</b> | Trạng thái: <b>${order.status}</b> | ${new Date(order.created_at).toLocaleDateString()}</div>
        ${items}
      </div>
    `;
  }
}

// ========== ADMIN ==========
document.getElementById('addProductForm').onsubmit = async function(e) {
  e.preventDefault();
  addProductMsg.textContent = '';
  const name = prodName.value.trim();
  const description = prodDesc.value.trim();
  const price = Number(prodPrice.value);
  let imageUrl = '';
  if (prodImage.files[0]) {
    imageUrl = await toBase64(prodImage.files[0]);
  }
  try {
    let res = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': currentUser.token
      },
      body: JSON.stringify({
        name, description, price, image: imageUrl
      })
    });
    let data = await res.json();
    if (res.ok) {
      addProductMsg.textContent = 'Thêm sản phẩm thành công!';
      addProductMsg.classList.add('success');
      prodName.value = prodDesc.value = prodPrice.value = '';
      prodImage.value = '';
      loadAdminProducts();
      setTimeout(() => { addProductMsg.textContent = ''; }, 1200);
    } else {
      addProductMsg.textContent = data.message || 'Thêm thất bại!';
    }
  } catch {
    addProductMsg.textContent = 'Không thể kết nối server!';
  }
};
function toBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}
async function loadAdminProducts() {
  let res = await fetch('/api/products');
  let data = await res.json();
  const wrap = document.getElementById('adminProducts');
  wrap.innerHTML = '';
  if (!Array.isArray(data) || !data.length) {
    wrap.innerHTML = '<div style="text-align:center;color:#888;">Không có sản phẩm nào.</div>';
    return;
  }
  for (const p of data) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${p.data.image || 'https://placehold.co/170x140'}" alt="Ảnh sản phẩm">
      <div class="prod-name">${p.data.name}</div>
      <div class="prod-price">${Number(p.data.price).toLocaleString()} đ</div>
      <div class="prod-desc">${p.data.description || ''}</div>
    `;
    wrap.appendChild(card);
  }
}

// ========== Khởi tạo ==========
window.addEventListener('DOMContentLoaded', () => {
  window.onhashchange();
});