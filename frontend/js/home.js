const SUPABASE_URL = 'https://gdryjfpxvniulamzdvma.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkcnlqZnB4dm5pdWxhbXpkdm1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1Nzg5ODAsImV4cCI6MjA4OTE1NDk4MH0.3Veth6_zon8iatPztuvIaOoUmnMUXJ2AhRNb3Yf_5fw';
const WHATSAPP_NUM = '201000000000';
const CURRENCY = 'ج.م';
const TABLE_NAME = 'carolena-products';
const PRODUCTS_PER_PAGE = 20;
const HOME_PRODUCTS_COUNT = 6;
// ═══════════════════════════════════════════════════

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ─── State ─── */
let currentProducts = [];
let homeProducts = [];
let cart = JSON.parse(localStorage.getItem('lb_cart') || '[]');
let currentFilter = 'الكل';
let currentBrandFilter = 'الكل';
let currentSearch = '';
let modalProduct = null;
let currentPage = 1;
let totalPages = 1;
let totalProducts = 0;
let isHomePage = false;

/* ══════════════════════════════════════════
   PAGE LOAD
══════════════════════════════════════════ */
window.addEventListener('load', async () => {
  const footerWa = document.getElementById('footer-whatsapp');
  if (footerWa) footerWa.textContent = '+' + WHATSAPP_NUM;

  isHomePage = !document.getElementById('pagination-container');
  updateCartUI();

  if (isHomePage) {
    await fetchHomeProducts();
  } else {
    await initProducts();
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
   FETCH HOME PRODUCTS
══════════════════════════════════════════ */
async function fetchHomeProducts() {
  try {
    const { data, error } = await supabaseClient
      .from(TABLE_NAME)
      .select('*')
      .order('id', { ascending: false })
      .limit(HOME_PRODUCTS_COUNT);

    if (error) throw error;
    homeProducts = data || [];
    renderHomeProducts();
  } catch (err) {
    console.error('خطأ في جلب منتجات الهوم:', err);
  }
}

function renderHomeProducts() {
  const grid = document.getElementById('products-grid');
  const noResults = document.getElementById('no-results');

  ['sk1', 'sk2', 'sk3', 'sk4', 'sk5', 'sk6'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });

  if (!homeProducts || homeProducts.length === 0) {
    if (grid) grid.innerHTML = '';
    if (noResults) noResults.style.display = 'block';
    return;
  }

  if (noResults) noResults.style.display = 'none';

  const html = homeProducts
    .map(
      (p) => `
    <div class="col-6 col-md-4 col-lg-2">
      <div class="product-card product-card-compact h-100">
        <div class="product-img-wrap product-img-compact">
          <img src="${p['img-url'] || ''}" alt="${p['product-name']}" loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=70'" />
          <span class="product-category-badge">${p.brand || ''}</span>
          <div class="product-actions product-actions-compact">
            <button class="action-btn action-btn-compact" onclick="openProductModal(${p.id}); event.stopPropagation()">
              <i class="fas fa-eye"></i>
            </button>
            <button class="action-btn action-btn-compact" onclick="addToCart(${p.id}); event.stopPropagation()">
              <i class="fas fa-shopping-bag"></i>
            </button>
          </div>
        </div>
        <div class="product-body product-body-compact">
          <h5>${p['product-name']}</h5>
          <div class="product-footer product-footer-compact">
            <span class="product-price product-price-compact">${formatPrice(p.price)}</span>
            <button class="add-cart-btn add-cart-btn-compact" onclick="addToCart(${p.id})">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
    )
    .join('');

  const viewMoreHtml = `
    <div class="col-12 text-center mt-4">
      <a href="./products.html" class="btn-rose">
        عرض المزيد <i class="fas fa-arrow-left"></i>
      </a>
    </div>
  `;

  if (grid) grid.innerHTML = html + viewMoreHtml;
}

/* ══════════════════════════════════════════
   INIT PRODUCTS
══════════════════════════════════════════ */
async function initProducts() {
  try {
    const savedCategory = localStorage.getItem('selectedCategory');
    if (savedCategory) {
      currentFilter = savedCategory;
      localStorage.removeItem('selectedCategory');
    }

    const { count, error: countError } = await supabaseClient
      .from(TABLE_NAME)
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;
    totalProducts = count || 0;

    console.log(`✅ إجمالي المنتجات: ${totalProducts}`);

    updateTotalPages();
    await fetchProductsPage(1);

    setTimeout(updateActiveButtons, 100);
  } catch (err) {
    console.error('خطأ في جلب المنتجات:', err);
    showToast('⚠️ تعذر جلب المنتجات');
  }
}

function updateTotalPages() {
  totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);
  if (totalPages < 1) totalPages = 1;
}

/* ══════════════════════════════════════════
   FETCH PRODUCTS PAGE
══════════════════════════════════════════ */
async function fetchProductsPage(page) {
  try {
    currentPage = page;
    const start = (page - 1) * PRODUCTS_PER_PAGE;
    const end = start + PRODUCTS_PER_PAGE - 1;

    console.log(
      `📄 جلب صفحة ${page} - Category: "${currentFilter}", Brand: "${currentBrandFilter}"`,
    );

    let query = supabaseClient
      .from(TABLE_NAME)
      .select('*', { count: 'exact' })
      .order('id', { ascending: true })
      .range(start, end);

    // ⚡ Category بـ ilike
    if (currentFilter !== 'الكل') {
      query = query.ilike('category', `%${currentFilter}%`);
    }

    // ⚡ Brand بـ ilike (عشان نتجنب مشاكل المسافات)
    if (currentBrandFilter !== 'الكل') {
      console.log(`🔍 بندور على براند: "${currentBrandFilter}"`);
      query = query.ilike('brand', `%${currentBrandFilter}%`);
    }

    // Search
    if (currentSearch) {
      const searchTerm = `%${currentSearch}%`;
      query = query.or(
        `product-name.ilike.${searchTerm},` +
          `brand.ilike.${searchTerm},` +
          `category.ilike.${searchTerm}`,
      );
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Query error:', error);
      throw error;
    }

    currentProducts = data || [];
    console.log(`✅ تم جلب ${currentProducts.length} منتج`);

    if (
      currentFilter !== 'الكل' ||
      currentBrandFilter !== 'الكل' ||
      currentSearch
    ) {
      totalProducts = count || 0;
      updateTotalPages();
    }

    renderProducts();
    renderPagination();
    updateProductsCount();
    updateActiveButtons();
  } catch (err) {
    console.error('خطأ في جلب الصفحة:', err);
    showToast('⚠️ تعذر جلب المنتجات');
  }
}

/* ══════════════════════════════════════════
   RENDER PRODUCTS
══════════════════════════════════════════ */
function renderProducts() {
  const grid = document.getElementById('products-grid');
  const noResults = document.getElementById('no-results');

  ['sk1', 'sk2', 'sk3', 'sk4'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });

  if (!currentProducts || currentProducts.length === 0) {
    if (grid) grid.innerHTML = '';
    if (noResults) noResults.style.display = 'block';
    return;
  }

  if (noResults) noResults.style.display = 'none';

  if (grid) {
    grid.innerHTML = currentProducts
      .map(
        (p) => `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="product-card h-100">
          <div class="product-img-wrap">
            <img src="${p['img-url'] || ''}" alt="${p['product-name']}" loading="lazy"
                 onerror="this.src='https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=70'" />
            <span class="product-category-badge">${p.brand || ''}</span>
            <div class="product-actions">
              <button class="action-btn" onclick="openProductModal(${p.id}); event.stopPropagation()">
                <i class="fas fa-eye"></i>
              </button>
              <button class="action-btn" onclick="addToCart(${p.id}); event.stopPropagation()">
                <i class="fas fa-shopping-bag"></i>
              </button>
            </div>
          </div>
          <div class="product-body">
            <h5>${p['product-name']}</h5>
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
}

/* ══════════════════════════════════════════
   PAGINATION
══════════════════════════════════════════ */
function renderPagination() {
  const container = document.getElementById('pagination-container');
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '<div class="pagination-wrapper">';

  html += `
    <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
            onclick="changePage(${currentPage - 1})" 
            ${currentPage === 1 ? 'disabled' : ''}>
      <i class="fas fa-chevron-right"></i>
    </button>
  `;

  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  if (startPage > 1) {
    html += `<button class="pagination-btn" onclick="changePage(1)">1</button>`;
    if (startPage > 2) {
      html += `<span class="pagination-dots">...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `
      <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
              onclick="changePage(${i})">
        ${i}
      </button>
    `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span class="pagination-dots">...</span>`;
    }
    html += `<button class="pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
  }

  html += `
    <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
            onclick="changePage(${currentPage + 1})" 
            ${currentPage === totalPages ? 'disabled' : ''}>
      <i class="fas fa-chevron-left"></i>
    </button>
  `;

  html += '</div>';
  container.innerHTML = html;
}

function updateProductsCount() {
  const countEl = document.getElementById('products-count');
  if (countEl) {
    countEl.textContent = `عرض ${currentProducts.length} من ${totalProducts} منتج (صفحة ${currentPage} من ${totalPages})`;
  }
}

async function changePage(page) {
  if (page < 1 || page > totalPages || page === currentPage) return;

  const productsSection = document.getElementById('products');
  if (productsSection) {
    productsSection.scrollIntoView({ behavior: 'smooth' });
  }

  await fetchProductsPage(page);
}

/* ══════════════════════════════════════════
   UPDATE ACTIVE BUTTONS
══════════════════════════════════════════ */
function updateActiveButtons() {
  console.log('🎨 تحديث الأزرار:', currentFilter, currentBrandFilter);

  // أزرار الكاتيجوري
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    const btnText = btn.textContent.trim();
    const isActive =
      btnText === currentFilter ||
      (currentFilter !== 'الكل' && btnText.includes(currentFilter));
    btn.classList.toggle('active', isActive);
  });

  // أزرار البراند
  document.querySelectorAll('.brand-btn').forEach((btn) => {
    const btnBrand = btn.dataset.brand;
    const isActive = btnBrand === currentBrandFilter;
    btn.classList.toggle('active', isActive);
  });
}

/* ══════════════════════════════════════════
   FILTER BY CATEGORY
══════════════════════════════════════════ */
async function filterByCategory(cat) {
  console.log('🔍 فلترة بالكاتيجوري:', cat);
  currentFilter = cat;
  currentPage = 1;
  currentBrandFilter = 'الكل'; // ⚡ نمسح البراند
  currentSearch = '';

  updateActiveButtons();

  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

  await updateCountForFilter();
  await fetchProductsPage(1);
}

/* ══════════════════════════════════════════
   FILTER BY BRAND (معدلة)
══════════════════════════════════════════ */
async function filterByBrand(brand) {
  console.log('🔍 فلترة بالبراند:', brand);

  // ⚡ نمسح كل الفلاتر الأول
  currentFilter = 'الكل';
  currentSearch = '';
  currentBrandFilter = brand;
  currentPage = 1;

  // ⚡ نحدث الأزرار فوراً
  updateActiveButtons();

  // ⚡ نمسح البحث
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

  // ⚡ نجيب الـ count والصفحة من الأول
  await updateCountForFilter();
  await fetchProductsPage(1);
}

/* ══════════════════════════════════════════
   UPDATE COUNT FOR FILTER
══════════════════════════════════════════ */
async function updateCountForFilter() {
  try {
    let query = supabaseClient
      .from(TABLE_NAME)
      .select('*', { count: 'exact', head: true });

    // Category بـ ilike
    if (currentFilter !== 'الكل') {
      query = query.ilike('category', `%${currentFilter}%`);
    }

    // ⚡ Brand بـ ilike
    if (currentBrandFilter !== 'الكل') {
      query = query.ilike('brand', `%${currentBrandFilter}%`);
    }

    if (currentSearch) {
      const searchTerm = `%${currentSearch}%`;
      query = query.or(
        `product-name.ilike.${searchTerm},` +
          `brand.ilike.${searchTerm},` +
          `category.ilike.${searchTerm}`,
      );
    }

    const { count, error } = await query;
    if (error) throw error;

    totalProducts = count || 0;
    updateTotalPages();
    console.log(`📊 إجمالي بعد الفلتر: ${totalProducts}`);
  } catch (err) {
    console.error('Error getting count:', err);
  }
}

/* ══════════════════════════════════════════
   SEARCH PRODUCTS
══════════════════════════════════════════ */
async function searchProducts() {
  currentSearch = document.getElementById('search-input').value.trim();
  currentPage = 1;
  currentFilter = 'الكل';
  currentBrandFilter = 'الكل';

  updateActiveButtons();

  await updateCountForFilter();
  await fetchProductsPage(1);
}

/* ══════════════════════════════════════════
   MODAL + CART
══════════════════════════════════════════ */
function openProductModal(id) {
  let p = isHomePage
    ? homeProducts.find((x) => x.id === id)
    : currentProducts.find((x) => x.id === id);

  if (!p) return;

  modalProduct = p;
  document.getElementById('modal-img').src = p['img-url'] || '';
  document.getElementById('modal-name').textContent = p['product-name'];
  document.getElementById('modal-price').textContent = formatPrice(p.price);
  document.getElementById('modal-category').textContent = p.brand || '';
  document.getElementById('modal-desc').textContent =
    p.description || 'لا يوجد وصف';

  new bootstrap.Modal(document.getElementById('productModal')).show();
}

function addFromModal() {
  if (!modalProduct) return;
  addProductToCart(modalProduct);
}

function addToCart(id) {
  let p = isHomePage
    ? homeProducts.find((x) => x.id === id)
    : currentProducts.find((x) => x.id === id);

  if (!p) return;
  addProductToCart(p);
}

function addProductToCart(p) {
  const existing = cart.find((i) => i.id === p.id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      id: p.id,
      name: p['product-name'],
      price: p.price,
      image_url: p['img-url'],
      qty: 1,
    });
  }
  saveCart();
  updateCartUI();
  showToast(`✓ تمت إضافة "${p['product-name']}" إلى السلة`);
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
  const total = cart.reduce((s, i) => s + (Number(i.price) || 0) * i.qty, 0);
  const totalEl = document.getElementById('cart-total');
  if (totalEl) totalEl.textContent = formatPrice(total);

  list.innerHTML = cart
    .map(
      (i) => `
    <div class="cart-item">
      <img class="cart-item-img" src="${i.image_url || 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&q=60'}" 
           alt="${i.name || 'منتج'}"
           onerror="this.src='https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&q=60'" />
      <div class="cart-item-info">
        <h6>${i.name || 'منتج'}</h6>
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

function orderViaWhatsApp() {
  if (cart.length === 0) return;
  const total = cart.reduce((s, i) => s + (Number(i.price) || 0) * i.qty, 0);
  let msg = '🛒 *طلب جديد من كارو لينا*\b';
  cart.forEach((i) => {
    msg += `• ${i.name || 'منتج'} × ${i.qty} — ${formatPrice((Number(i.price) || 0) * i.qty)}\\n`;
  });
  msg += `\b💰 *الإجمالي: ${formatPrice(total)}*\bأرجو تأكيد طلبي، شكراً! 🌸`;
  window.open(
    `https://wa.me/${+201276905241}?text=${encodeURIComponent(msg)}`,
    '_blank',
  );
}

function subscribeNewsletter() {
  const input = document.querySelector('.newsletter-input-wrap input');
  if (!input || !input.value.trim()) return;
  showToast('✓ تم الاشتراك بنجاح! شكراً لانضمامك 🌸');
  input.value = '';
}

function formatPrice(p) {
  if (p === undefined || p === null || isNaN(p)) return '—';
  return Number(p).toLocaleString('ar-EG') + ' ' + CURRENCY;
}

function showToast(msg) {
  const msgEl = document.getElementById('toast-msg');
  const toastEl = document.getElementById('cart-toast');
  if (msgEl) msgEl.textContent = msg;
  if (toastEl) new bootstrap.Toast(toastEl, { delay: 3000 }).show();
}
