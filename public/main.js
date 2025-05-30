// ======= SPA Routing & State =========
const sectionIds = [
  'loginPage', 'registerPage', 'productsPage', 'cartPage', 'ordersPage', 'adminPage', 'orderDetailPage'
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
      currentUser = {
        username: data.user.username,
        role: data.user.role,
        token: data.token,
        id: data.user.id
      };
      localStorage.setItem('user', JSON.stringify(currentUser));
      window.location.hash = data.role === 'admin' ? '#admin' : '#products';
      loginUsername.value = loginPassword.value = '';
      loginMsg.textContent = '';
      console.log(currentUser);
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
async function loadProducts(keyword = '', maxPrice = '') {
  let url = '/api/products';
  const params = new URLSearchParams();
  if (keyword) params.append('q', keyword);
  if (maxPrice) params.append('price', maxPrice);

  if ([...params].length > 0) {
    url += '?' + params.toString();
  }

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
  const keyword = document.getElementById('searchInput').value.trim();
  const maxPrice = document.getElementById('maxPriceInput').value.trim();
  loadProducts(keyword, maxPrice);
};
document.getElementById('searchInput').onkeydown = function(e) {
  if (e.key === 'Enter') {
    const keyword = document.getElementById('searchInput').value.trim();
    const maxPrice = document.getElementById('maxPriceInput').value.trim();
    loadProducts(keyword, maxPrice);
  }
};

// ========== GIỎ HÀNG ==========
let cart = JSON.parse(localStorage.getItem('cart') || '{}');
async function addToCart(productId) {
  if (!currentUser || !currentUser.token) {
    alert('Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng.');
    return;
  }

  try {
    const res = await fetch('/api/orders/cart/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + currentUser.token
      },
      body: JSON.stringify({
        product_id: productId,
        quantity: 1
      })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Thêm sản phẩm thất bại');
    }

    const data = await res.json();
    console.log('Đã thêm vào giỏ:', data);
    await loadCart(); // cập nhật lại giao diện giỏ hàng

  } catch (err) {
    console.error(err);
    alert('Lỗi khi thêm sản phẩm vào giỏ hàng: ' + err.message);
  }
}

async function loadCart() {
  const wrap = document.getElementById('cartItems');
  const cartTotal = document.getElementById('cartTotal');
  const checkoutBtn = document.getElementById('checkoutBtn');
  wrap.innerHTML = '<i>Đang tải...</i>';

  try {
    const res = await fetch('/api/orders/cart', {
      headers: {
        'Authorization': 'Bearer ' + currentUser.token
      }
    });

    const data = await res.json();
    const items = data.items || [];
    let total = 0;

    if (items.length === 0) {
      wrap.innerHTML = '<i>Giỏ hàng trống.</i>';
      cartTotal.textContent = '';
      checkoutBtn.style.display = 'none';
      return;
    }

    wrap.innerHTML = `
      <div class="cart-header">
        <span class="cart-col img"></span>
        <span class="cart-col name">Sản phẩm</span>
        <span class="cart-col qty">Số lượng</span>
        <span class="cart-col price">Giá</span>
        <span class="cart-col action"></span>
      </div>
    `;

    for (const item of items) {
      const { id: itemId, quantity, data: productData } = item;
      const { name, price, image } = productData;
      const subTotal = quantity * price;
      total += subTotal;

      wrap.innerHTML += `
        <div class="cart-row">
          <span class="cart-col img">
            <img class="cart-prod-img" src="${image || 'https://placehold.co/56x56'}" alt="Ảnh sản phẩm">
          </span>
          <span class="cart-col name">${name}</span>
          <span class="cart-col qty">${quantity}</span>
          <span class="cart-col price">${subTotal.toLocaleString('vi-VN')} đ</span>
          <span class="cart-col action"><button onclick="removeFromCart(${itemId})">Xóa</button></span>
        </div>
      `;
    }

    cartTotal.textContent = `Tổng: ${total.toLocaleString('vi-VN')} đ`;
    checkoutBtn.style.display = '';
  } catch (err) {
    console.error('Lỗi khi tải giỏ hàng:', err);
    wrap.innerHTML = '<i>Lỗi tải giỏ hàng.</i>';
    cartTotal.textContent = '';
    checkoutBtn.style.display = 'none';
  }
}

async function removeFromCart(item_id) {
  try {
    // Gọi API xoá item trên server
    const res = await fetch(`/api/orders/cart/item/${item_id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        // Nếu cần token:
        'Authorization': 'Bearer ' + currentUser.token
      }
    });
    const result = await res.json();

    if (result.success) {
      // Xoá khỏi cart trên localStorage (nếu bạn vẫn lưu local)
      delete cart[item_id];
      localStorage.setItem('cart', JSON.stringify(cart));
      loadCart();
    } else {
      alert('Xoá sản phẩm thất bại!');
    }
  } catch (error) {
    alert('Có lỗi xảy ra khi xoá sản phẩm!');
    console.error(error);
  }
}
document.getElementById('checkoutBtn').onclick = async function () {
  cartMsg.textContent = '';

  // Kiểm tra đăng nhập
  if (!currentUser) {
    cartMsg.textContent = 'Bạn cần đăng nhập!';
    return;
  }

  // Tính tổng số lượng sản phẩm
  let totalQuantity = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);

  try {
    let res = await fetch('/api/orders/cart/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + currentUser.token
      },
      body: JSON.stringify({
        items: cart,
        quantity: totalQuantity // nếu server cần tổng số lượng
      })
    });

    let data = await res.json();

    if (res.ok) {
      console.log("Đặt hàng thành công:", data);

      cartMsg.textContent = 'Đặt hàng thành công!';
      cartMsg.classList.add('success');

      // Reset giỏ hàng
      cart = {};
      localStorage.setItem('cart', '{}');

      loadCart();
      loadOrders();

      setTimeout(() => { cartMsg.textContent = ''; }, 1200);
    } else {
      cartMsg.textContent = data.message || 'Đặt hàng thất bại!';
    }

  } catch (err) {
    console.error("Lỗi kết nối:", err);
    cartMsg.textContent = 'Không thể kết nối server!';
  }
};


// ========== LỊCH SỬ ĐƠN HÀNG ==========
async function loadOrders() {
  if (!currentUser) return;
  let res = await fetch('/api/orders', {
    headers: { 'Authorization': 'Bearer ' + currentUser.token }
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
      items += `
        <div style="margin-bottom:4px;font-size:1em;">
          ${it.product.data.name} x ${it.quantity} -
          <b style="color:#28a745;">${(it.product.data.price * it.quantity).toLocaleString('vi-VN')} đ</b>
        </div>
      `;
    }

    wrap.innerHTML += `
      <div class="order-box" style="background:#f8f9fc;padding:15px;margin-bottom:12px;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <div style="font-weight:500;margin-bottom:10px;">
          Mã đơn: <b>#${order.id}</b> |
          Trạng thái: <span style="font-weight:bold;color:#007bff;">${order.status}</span> |
          <span>${new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
        </div>
        <div style="padding-left:10px;">
          ${items}
        </div>
        <button class="btn-detail" data-order='${JSON.stringify(order)}' style="margin-top:8px;background:#007bff;color:#fff;border:none;padding:6px 14px;border-radius:5px;cursor:pointer;">
          Xem chi tiết
        </button>
      </div>
    `;
  }

  // Thêm sự kiện click cho tất cả nút "Xem chi tiết"
  wrap.querySelectorAll('.btn-detail').forEach(btn => {
    btn.onclick = function() {
      const order = JSON.parse(this.dataset.order);
      showOrderDetailPage(order.id);
    }
  });
}

async function showOrderDetailPage(orderId) {
  // Hide all sections, show order detail page
  sectionIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  document.getElementById('orderDetailPage').style.display = 'block';

  const token = localStorage.getItem('user')
    ? JSON.parse(localStorage.getItem('user')).token
    : (window.currentUser && window.currentUser.token);

  let res = await fetch(`/api/orders/${orderId}`, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const wrap = document.getElementById('orderDetailContent');
  if (!res.ok) {
    wrap.innerHTML = '<b>Không thể lấy thông tin đơn hàng.</b>';
    return;
  }
  let data = await res.json();

  wrap.innerHTML = `
    <div style="max-width:700px;margin: 0 auto;">
      <div style="font-size:1.11em;margin-bottom:1.7em;">
        <div><b>Mã đơn:</b> <span style="color:#444">#${data.order.id}</span></div>
        <div><b>Trạng thái:</b> <span style="color:#1976d2;font-weight:600;">${data.order.status}</span></div>
        <div><b>Ngày đặt:</b> <span style="color:#444">${new Date(data.order.created_at).toLocaleString('vi-VN')}</span></div>
        <div><b>Ghi chú:</b> <span style="color:#666;font-style:italic;">${data.order.note ? data.order.note : "Không có"}</span></div>
      </div>
      <hr>
      <div style="font-weight:700;font-size:1.08em;margin:1.5em 0 0.5em 0;">Sản phẩm:</div>
      <div class="product-list">
        ${data.items.map(it => `
          <div class="product-card" style="min-height:auto;">
            <img src="${it.data.image || 'https://placehold.co/170x140'}" alt="Ảnh sản phẩm">
            <div class="prod-name">${it.data.name}</div>
            <div>
              <span class="prod-qty">x${it.quantity}</span>
              <span class="prod-price" style="margin-left:10px;">${Number(it.data.price).toLocaleString('vi-VN')} đ</span>
            </div>
          </div>
        `).join('')}
      </div>
      <hr>
      <div style="display:flex;justify-content:flex-end;align-items:center;font-size:1.15em;font-weight:bold;">
        <span style="margin-right:9px;">Tổng tiền:</span>
        <span style="color:#e53935;">
          ${data.items.reduce((t, it) => t + it.data.price * it.quantity, 0).toLocaleString('vi-VN')} đ
        </span>
      </div>
    </div>
  `;
}
// Nút quay lại lịch sử
document.getElementById('backToOrdersBtn').onclick = function() {
  showPage('orders');
};


// ========== ADMIN ==========
document.getElementById('addProductForm').onsubmit = async function(e) {
  e.preventDefault();
  addProductMsg.textContent = '';
  
  const formData = new FormData();
  formData.append('name', prodName.value.trim());
  formData.append('description', prodDesc.value.trim());
  formData.append('price', prodPrice.value.trim());
  if (prodImage.files[0]) {
    formData.append('image', prodImage.files[0]);
  }

  try {
    let res = await fetch('/api/products', {
      method: 'POST',
      headers: {
        // ❌ KHÔNG cần 'Content-Type': multipart/form-data sẽ được thiết lập tự động
        'Authorization': 'Bearer ' + currentUser.token
      },
      body: formData
    });

    let data = await res.json().catch(() => ({}));
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