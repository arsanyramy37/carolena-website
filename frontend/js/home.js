// ═══════════════════════════════════════════════════
// ⚙️  CONFIG – غيّري هذه القيم فقط
// ═══════════════════════════════════════════════════
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
const WHATSAPP_NUM = '201000000000';
const CURRENCY = 'ج.م';
const TABLE_NAME = 'products';
// ═══════════════════════════════════════════════════

/* ─── Supabase Init ─── */
let supabaseClient = null;
const isConfigured = SUPABASE_URL !== 'YOUR_SUPABASE_URL';
if (isConfigured) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

/* ─── State ─── */
let allProducts = [];
let cart = JSON.parse(localStorage.getItem('lb_cart') || '[]');
let currentFilter = 'الكل';
let modalProduct = null;

/* ─── DEMO DATA ─── */
const DEMO_PRODUCTS = [
  {
    id: 1,
    name: 'مرطب وردة الربيع',
    description:
      'مرطب يومي فاخر بخلاصة الورد وحمض الهيالورونيك للترطيب العميق.',
    price: 248,
    category: 'العناية بالبشرة',
    image_url:
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=75',
  },
  {
    id: 2,
    name: 'أحمر شفاه مخملي',
    description:
      'أحمر شفاه بتشطيب مخملي ثابت بظلال الورد الجميلة. غني بفيتامين E.',
    price: 145,
    category: 'مكياج',
    image_url:
      'https://images.unsplash.com/photo-1586495777744-4e6232bf2f8d?w=500&q=75',
  },
  {
    id: 3,
    name: 'بلوم روز او دو بارفان',
    description:
      'عطر زهري ساحر بنغمات الورد البلغاري والفاوانيا والمسك الأبيض.',
    price: 495,
    category: 'عطور',
    image_url:
      'https://images.unsplash.com/photo-1541643600914-78b084683702?w=500&q=75',
  },
  {
    id: 4,
    name: 'سيروم الحرير للشعر',
    description: 'سيروم خفيف يمنح اللمعان ويكافح التجعد دون إثقال الشعر.',
    price: 182,
    category: 'العناية بالشعر',
    image_url:
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&q=75',
  },
  {
    id: 5,
    name: 'زيت الجسم بجوز الهند',
    description: 'زيت جسم عضوي خفيف يُرطب البشرة ويمنحها نعومة استثنائية.',
    price: 128,
    category: 'العناية بالجسم',
    image_url:
      'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=500&q=75',
  },
  {
    id: 6,
    name: 'كريم الليل المضيء',
    description:
      'كريم ليلي مغذٍّ يجدد خلايا البشرة أثناء النوم لإشراقة صباحية.',
    price: 312,
    category: 'العناية بالبشرة',
    image_url:
      'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500&q=75',
  },
  {
    id: 7,
    name: 'بالت ظلال العيون',
    description: 'بالت من 24 درجة دافئة وعميقة لأنظار لا تُنسى طوال اليوم.',
    price: 225,
    category: 'مكياج',
    image_url:
      'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=500&q=75',
  },
  {
    id: 8,
    name: 'شامبو بزيت الأرغان',
    description:
      'شامبو مغذٍّ بزيت الأرغان المغربي يصلح الشعر التالف ويمنحه الحياة.',
    price: 148,
    category: 'العناية بالشعر',
    image_url:
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&q=75',
  },
];

/* ══════════════════════════════════════════
   PAGE LOAD
══════════════════════════════════════════ */
window.addEventListener('load', async () => {
  const footerWa = document.getElementById('footer-whatsapp');
  if (footerWa) footerWa.textContent = '+' + WHATSAPP_NUM;

  updateCartUI();

  if (isConfigured) {
    await fetchProducts();
  } else {
    allProducts = DEMO_PRODUCTS;
    renderProducts(allProducts);
  }

  setTimeout(() => {
    const loader = document.getElementById('page-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 400);
    }
  }, 800);
});

/* ══════════════════════════════════════════
   NAVBAR – إغلاق عند اللمس خارجه
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  /* ── إغلاق الناف بار لما تضغط برّا ── */
  document.addEventListener('click', (e) => {
    const navbar = document.querySelector('.navbar');
    const collapse = document.getElementById('navMenu');
    const toggler = document.querySelector('.navbar-toggler');

    if (!navbar) return;

    // لو القائمة مفتوحة والضغطة مش جوّاها ومش على الهامبرجر
    const isOpen = collapse && collapse.classList.contains('show');
    const clickedInside = navbar.contains(e.target);

    if (isOpen && !clickedInside) {
      const bsCollapse = bootstrap.Collapse.getInstance(collapse);
      if (bsCollapse) bsCollapse.hide();
    }
  });

  /* ── إغلاق الناف بار لما تضغط على لينك ── */
  document.querySelectorAll('#navMenu .nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      const collapse = document.getElementById('navMenu');
      if (collapse && collapse.classList.contains('show')) {
        const bsCollapse = bootstrap.Collapse.getInstance(collapse);
        if (bsCollapse) bsCollapse.hide();
      }
    });
  });

  /* ── Scroll Top ── */
  const scrollBtn = document.getElementById('scroll-top');
  if (scrollBtn) {
    scrollBtn.addEventListener('click', () =>
      window.scrollTo({ top: 0, behavior: 'smooth' }),
    );
  }

  /* ── إعادة رسم السلة عند فتح الـ offcanvas ── */
  const cartDrawer = document.getElementById('cartDrawer');
  if (cartDrawer)
    cartDrawer.addEventListener('show.bs.offcanvas', renderCartItems);
});

window.addEventListener('scroll', () => {
  const btn = document.getElementById('scroll-top');
  if (btn) btn.style.display = window.scrollY > 400 ? 'flex' : 'none';
});

/* ══════════════════════════════════════════
   SUPABASE
══════════════════════════════════════════ */
async function fetchProducts() {
  try {
    const { data, error } = await supabaseClient
      .from(TABLE_NAME)
      .select('*')
      .order('id', { ascending: false });
    if (error) throw error;
    allProducts = data || [];
    renderProducts(allProducts);
  } catch (err) {
    console.error('Supabase error:', err);
    allProducts = DEMO_PRODUCTS;
    renderProducts(allProducts);
    showToast('⚠️ تعذّر الاتصال بقاعدة البيانات، تُعرض بيانات تجريبية');
  }
}

/* ══════════════════════════════════════════
   RENDER PRODUCTS
══════════════════════════════════════════ */
function renderProducts(products) {
  const grid = document.getElementById('products-grid');
  const noResults = document.getElementById('no-results');

  ['sk1', 'sk2', 'sk3', 'sk4'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });

  if (!products || products.length === 0) {
    grid.innerHTML = '';
    noResults.style.display = 'block';
    return;
  }
  noResults.style.display = 'none';

  grid.innerHTML = products
    .map(
      (p, i) => `
    <div class="col-lg-3 col-md-4 col-sm-6"
         style="animation: fadeInUp .5s ease ${i * 0.07}s both">
      <div class="product-card h-100">
        <div class="product-img-wrap">
          <img
            src="${p.image_url || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=70'}"
            alt="${p.name}" loading="lazy"
            onerror="this.src='https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=70'"
          />
          <span class="product-category-badge">${p.category || ''}</span>
          <div class="product-actions">
            <button class="action-btn" title="عرض التفاصيل"
                    onclick="openProductModal(${p.id}); event.stopPropagation()">
              <i class="fas fa-eye"></i>
            </button>
            <button class="action-btn" title="إضافة للسلة"
                    onclick="addToCart(${p.id}); event.stopPropagation()">
              <i class="fas fa-shopping-bag"></i>
            </button>
          </div>
        </div>
        <div class="product-body">
          <h5>${p.name}</h5>
          <p>${p.description || ''}</p>
          <div class="product-footer">
            <span class="product-price">${formatPrice(p.price)}</span>
            <button class="add-cart-btn" onclick="addToCart(${p.id})">
              <i class="fas fa-plus"></i> أضيفي
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
    )
    .join('');
}

/* ══════════════════════════════════════════
   FILTER & SEARCH
══════════════════════════════════════════ */
function filterByCategory(cat) {
  currentFilter = cat;
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.textContent.trim() === cat);
  });
  applyFilters();
  if (cat !== 'الكل')
    document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
}

function searchProducts() {
  applyFilters();
}

function applyFilters() {
  const query = document
    .getElementById('search-input')
    .value.trim()
    .toLowerCase();
  let filtered = [...allProducts];
  if (currentFilter !== 'الكل')
    filtered = filtered.filter((p) => p.category === currentFilter);
  if (query)
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.description || '').toLowerCase().includes(query) ||
        (p.category || '').toLowerCase().includes(query),
    );
  renderProducts(filtered);
}

/* ══════════════════════════════════════════
   PRODUCT MODAL
══════════════════════════════════════════ */
function openProductModal(id) {
  const p = allProducts.find((x) => x.id === id);
  if (!p) return;
  modalProduct = p;
  document.getElementById('modal-img').src = p.image_url || '';
  document.getElementById('modal-img').alt = p.name;
  document.getElementById('modal-name').textContent = p.name;
  document.getElementById('modal-category').textContent = p.category || '';
  document.getElementById('modal-desc').textContent = p.description || '';
  document.getElementById('modal-price').textContent = formatPrice(p.price);
  document.getElementById('modal-title').textContent = p.name;
  new bootstrap.Modal(document.getElementById('productModal')).show();
}

function addFromModal() {
  if (modalProduct) addToCart(modalProduct.id);
  const m = bootstrap.Modal.getInstance(
    document.getElementById('productModal'),
  );
  if (m) m.hide();
}

/* ══════════════════════════════════════════
   CART
══════════════════════════════════════════ */
function addToCart(id) {
  const p = allProducts.find((x) => x.id === id);
  if (!p) return;
  const existing = cart.find((i) => i.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...p, qty: 1 });
  }
  saveCart();
  updateCartUI();
  showToast(`✓ تمت إضافة "${p.name}" إلى السلة`);
}

function removeFromCart(id) {
  cart = cart.filter((i) => i.id !== id);
  saveCart();
  updateCartUI();
  renderCartItems();
}

function changeQty(id, delta) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) return removeFromCart(id);
  saveCart();
  updateCartUI();
  renderCartItems();
}

function saveCart() {
  localStorage.setItem('lb_cart', JSON.stringify(cart));
}

function updateCartUI() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const el = document.getElementById('cart-count');
  if (el) el.textContent = count;
  renderCartItems();
}

function renderCartItems() {
  const list = document.getElementById('cart-items-list');
  const footer = document.getElementById('cart-footer');
  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = `<div class="empty-cart"><i class="fas fa-shopping-bag"></i><p>سلتك فارغة</p></div>`;
    if (footer) footer.style.display = 'none';
    return;
  }

  if (footer) footer.style.display = 'block';
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.textContent = formatPrice(total);

  list.innerHTML = cart
    .map(
      (i) => `
    <div class="cart-item">
      <img class="cart-item-img" src="${i.image_url || ''}" alt="${i.name}"
           onerror="this.src='https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&q=60'" />
      <div class="cart-item-info">
        <h6>${i.name}</h6>
        <div class="price">${formatPrice(i.price)}</div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="changeQty(${i.id}, -1)">−</button>
          <span class="qty-val">${i.qty}</span>
          <button class="qty-btn" onclick="changeQty(${i.id}, 1)">+</button>
        </div>
      </div>
      <button class="remove-btn" onclick="removeFromCart(${i.id})">
        <i class="fas fa-trash-alt"></i>
      </button>
    </div>
  `,
    )
    .join('');
}

/* ══════════════════════════════════════════
   WHATSAPP ORDER
══════════════════════════════════════════ */
function orderViaWhatsApp() {
  if (cart.length === 0) return;
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  let msg = '🛒 *طلب جديد من كارو لينا*\n\n';
  cart.forEach((i) => {
    msg += `• ${i.name} × ${i.qty} — ${formatPrice(i.price * i.qty)}\n`;
  });
  msg += `\n💰 *الإجمالي: ${formatPrice(total)}*\n\nأرجو تأكيد طلبي، شكراً! 🌸`;
  window.open(
    `https://wa.me/${WHATSAPP_NUM}?text=${encodeURIComponent(msg)}`,
    '_blank',
  );
}

/* ══════════════════════════════════════════
   NEWSLETTER
══════════════════════════════════════════ */
function subscribeNewsletter() {
  const input = document.querySelector('.newsletter-input-wrap input');
  if (!input || !input.value.trim()) return;
  showToast('✓ تم الاشتراك بنجاح! شكراً لانضمامك 🌸');
  input.value = '';
}

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function formatPrice(p) {
  if (p === undefined || p === null) return '—';
  return Number(p).toLocaleString('ar-EG') + ' ' + CURRENCY;
}

function showToast(msg) {
  const msgEl = document.getElementById('toast-msg');
  const toastEl = document.getElementById('cart-toast');
  if (msgEl) msgEl.textContent = msg;
  if (toastEl) new bootstrap.Toast(toastEl, { delay: 3000 }).show();
}
