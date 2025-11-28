// === Telegram init ===
const tg = window.Telegram.WebApp;
tg.expand();
if (tg.initDataUnsafe.user) {
  const user = tg.initDataUnsafe.user;
  const name = (user.first_name || '') + (user.last_name ? ' ' + user.last_name : '');
  document.getElementById('user-name').textContent = name.trim() || 'Гость';
}

function normalizeStreet(s) {
  return s.toLowerCase().replace(/[^а-яa-z0-9\s]/g, '').trim();
}

// === Фон ===
(function createBackground() {
  document.querySelectorAll('.star, .planet').forEach(el => el.remove());
  for (let i = 0; i < 50; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.width = Math.random() * 3 + 1 + 'px';
    star.style.height = star.style.width;
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.zIndex = '-1';
    document.body.appendChild(star);
  }
  const planet = document.createElement('div');
  planet.className = 'planet';
  planet.style.right = '10%';
  planet.style.top = '20%';
  planet.style.zIndex = '-1';
  document.body.appendChild(planet);
})();

// === Глобальные состояния ===
let navStack = [];
let currentProductIndex = 0;
let currentProductGroupList = []; // [{ name, variants: [...] }]

function clearContent() {
  document.getElementById('dynamic-content').innerHTML = '';
}

function showMainMenu() {
  document.getElementById('main-menu').style.display = 'flex';
  clearContent();
  // Скрываем MainButton при возврате в главное меню
  tg.MainButton.hide();
}

function pushScreen(renderFn, label = "Назад") {
  navStack.push(renderFn);
  // Показываем MainButton только если это не акции/новинки (или по желанию)
  if (label !== "Назад к товару") {
    tg.MainButton.setText(label).show().onClick(goBack);
  } else {
    tg.MainButton.hide(); // Для "Назад к товару" не показываем MainButton
  }
  renderFn();
}

function goBack() {
  navStack.pop();
  if (navStack.length > 0) {
    navStack[navStack.length - 1]();
  } else {
    showMainMenu();
  }
}

// === API ===
async function fetchProducts() {
  try {
    const res = await fetch('http://localhost:5000/api/products');
    return await res.json();
  } catch (e) {
    alert('Не удалось загрузить товары. Запущен ли сервер?');
    return [];
  }
}

async function fetchAkcii() {
  try {
    const res = await fetch('http://localhost:5000/api/akcii');
    return await res.json();
  } catch (e) {
    alert('Не удалось загрузить акции');
    return [];
  }
}

async function fetchNovinki() {
  try {
    const res = await fetch('http://localhost:5000/api/novinki');
    return await res.json();
  } catch (e) {
    alert('Не удалось загрузить новые товары');
    return [];
  }
}

// === Экран: Глобальный поиск — категории ===
async function showGlobalSearch() {
  const products = await fetchProducts();
  const categories = [...new Set(products.map(p => p.category))];
  clearContent();
  let html = '<h3 style="color:#fff; margin-bottom:16px;">Выберите категорию</h3>';
  categories.forEach(cat => {
    html += `<div class="menu-item" onclick="showBrandsGlobal('${cat.replace(/'/g, "\\'")}')">${cat}</div>`;
  });
  document.getElementById('main-menu').style.display = 'none';
  document.getElementById('dynamic-content').innerHTML = html;
}

// === Экран: Бренды в категории ===
async function showBrandsGlobal(category) {
  const products = await fetchProducts();
  const brands = [...new Set(products.filter(p => p.category === category).map(p => p.brand))];
  clearContent();
  let html = `<div class="back-btn" onclick="goBack()">← Назад</div>`;
  html += `<h3 style="color:#fff; margin:16px 0;">${category}</h3>`;
  brands.forEach(brand => {
    html += `<div class="menu-item" onclick="showProductsGlobal('${category}', '${brand.replace(/'/g, "\\'")}')">${brand}</div>`;
  });
  document.getElementById('dynamic-content').innerHTML = html;
}

// === Экран: Товары бренда ===
async function showProductsGlobal(category, brand) {
  const products = await fetchProducts();
  const items = products.filter(p => p.category === category && p.brand === brand);

  const groupedByName = {};
  items.forEach(p => {
    if (!groupedByName[p.name]) groupedByName[p.name] = [];
    groupedByName[p.name].push(p);
  });

  currentProductGroupList = Object.entries(groupedByName).map(([name, variants]) => ({
    name,
    variants
  }));

  if (currentProductGroupList.length === 0) {
    clearContent();
    document.getElementById('dynamic-content').innerHTML = `
      <div class="back-btn" onclick="goBack()">← Назад</div>
      <p style="color:#888; text-align:center;">Нет товаров у бренда ${brand}</p>
    `;
    return;
  }

  currentProductIndex = 0;
  renderCurrentProductCard();
}

// === Экран: Поиск по магазину — выбор города ===
async function showShopSearch() {
  const products = await fetchProducts();
  const cities = [...new Set(products.map(p => p.city))];
  clearContent();
  let html = '<h3 style="color:#fff; margin-bottom:16px;">Выберите город</h3>';
  cities.forEach(city => {
    html += `<div class="menu-item" onclick="showStreets('${city.replace(/'/g, "\\'")}')">${city}</div>`;
  });
  document.getElementById('main-menu').style.display = 'none';
  document.getElementById('dynamic-content').innerHTML = html;
}

// === Экран: Улицы в городе ===
async function showStreets(city) {
  const products = await fetchProducts();
  const streets = [...new Set(products.filter(p => p.city === city).map(p => p.street))];
  clearContent();
  let html = `<div class="back-btn" onclick="goBack()">← Назад</div>`;
  html += `<h3 style="color:#fff; margin:16px 0;">${city}</h3>`;
  if (streets.length === 0) {
    html += `<p style="color:#888;">Нет магазинов в этом городе</p>`;
  } else {
    streets.forEach(street => {
      html += `<div class="menu-item" onclick="showCategoriesInShop('${city}', '${street.replace(/'/g, "\\'")}')">${street}</div>`;
    });
  }
  document.getElementById('dynamic-content').innerHTML = html;
}

// === НОВЫЙ ЭКРАН: Категории в магазине ===
async function showCategoriesInShop(city, street) {
  const products = await fetchProducts();
  const filtered = products.filter(p => 
    p.city === city && normalizeStreet(p.street) === normalizeStreet(street)
  );
  const categories = [...new Set(filtered.map(p => p.category))];
  
  clearContent();
  let html = `<div class="back-btn" onclick="goBack()">← Назад</div>`;
  html += `<h3 style="color:#fff; margin:16px 0;">${city}, ${street}</h3>`;
  html += `<h4 style="color:#aaa; margin-bottom:16px;">Выберите категорию</h4>`;
  
  if (categories.length === 0) {
    html += `<p style="color:#888; text-align:center;">Нет товаров в этом магазине</p>`;
  } else {
    categories.forEach(cat => {
      html += `<div class="menu-item" onclick="showBrandsInShop('${city}', '${street}', '${cat.replace(/'/g, "\\'")}')">${cat}</div>`;
    });
  }
  
  document.getElementById('dynamic-content').innerHTML = html;
}

// === НОВЫЙ ЭКРАН: Бренды в категории в магазине ===
async function showBrandsInShop(city, street, category) {
  const products = await fetchProducts();
  const filtered = products.filter(p => 
    p.city === city && 
    normalizeStreet(p.street) === normalizeStreet(street) &&
    p.category === category
  );
  const brands = [...new Set(filtered.map(p => p.brand))];
  
  clearContent();
  let html = `<div class="back-btn" onclick="goBack()">← Назад</div>`;
  html += `<h3 style="color:#fff; margin:16px 0;">${category}</h3>`;
  
  if (brands.length === 0) {
    html += `<p style="color:#888; text-align:center;">Нет брендов в этой категории</p>`;
  } else {
    brands.forEach(brand => {
      html += `<div class="menu-item" onclick="showProductsInShop('${city}', '${street}', '${category}', '${brand.replace(/'/g, "\\'")}')">${brand}</div>`;
    });
  }
  
  document.getElementById('dynamic-content').innerHTML = html;
}

// === НОВЫЙ ЭКРАН: Товары бренда в магазине ===
async function showProductsInShop(city, street, category, brand) {
  const products = await fetchProducts();
  const items = products.filter(p => 
    p.city === city && 
    normalizeStreet(p.street) === normalizeStreet(street) &&
    p.category === category && 
    p.brand === brand
  );

  const groupedByName = {};
  items.forEach(p => {
    if (!groupedByName[p.name]) groupedByName[p.name] = [];
    groupedByName[p.name].push(p);
  });

  currentProductGroupList = Object.entries(groupedByName).map(([name, variants]) => ({
    name,
    variants
  }));

  if (currentProductGroupList.length === 0) {
    clearContent();
    document.getElementById('dynamic-content').innerHTML = `
      <div class="back-btn" onclick="goBack()">← Назад</div>
      <p style="color:#888; text-align:center;">Нет товаров у бренда ${brand} в этой категории</p>
    `;
    return;
  }

  currentProductIndex = 0;
  renderCurrentProductCard();
}

// === Отображение обычной карточки товара (с локациями) ===
function renderCurrentProductCard() {
  // Скрываем главное меню при показе карточки товара
  document.getElementById('main-menu').style.display = 'none';

  const productGroup = currentProductGroupList[currentProductIndex];
  const total = currentProductGroupList.length;

  let html = `
    <div class="back-btn" onclick="goBack()">← Назад</div>
    <div class="product-card">
      <img src="${productGroup.variants[0].image_url || 'https://via.placeholder.com/80  '}"
           style="width:100%; height:180px; object-fit:cover; border-radius:12px; margin-bottom:16px;">
      <h4 style="color:#fff; margin-bottom:12px;">${productGroup.name}</h4>
      
      <!-- Кнопки вкусов (уникальные!) -->
      <div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-bottom:20px;">
        ${[...new Set(productGroup.variants.map(v => v.flavor))].map(flavor => 
          `<button class="flavor-btn" onclick="showLocationFromVariant('${flavor.replace(/'/g, "\\'")}', '${productGroup.name.replace(/'/g, "\\'")}', '${productGroup.variants[0].brand.replace(/'/g, "\\'")}')">${flavor}</button>`
        ).join('')}
      </div>

      <!-- Навигация между товарами -->
      <div style="display:flex; align-items:center; justify-content:center; gap:16px;">
        <button class="nav-btn" onclick="prevProduct()" ${currentProductIndex === 0 ? 'disabled' : ''}>←</button>
        <span style="color:#999; font-size:14px;">${currentProductIndex + 1} из ${total}</span>
        <button class="nav-btn" onclick="nextProduct()" ${currentProductIndex === total - 1 ? 'disabled' : ''}>→</button>
      </div>
    </div>
  `;

  document.getElementById('dynamic-content').innerHTML = html;
}

function prevProduct() {
  if (currentProductIndex > 0) {
    currentProductIndex--;
    renderCurrentProductCard();
  }
}

function nextProduct() {
  if (currentProductIndex < currentProductGroupList.length - 1) {
    currentProductIndex++;
    renderCurrentProductCard();
  }
}

// === Показ ВСЕХ локаций для выбранного вкуса ===
function showLocationFromVariant(flavor, productName, brand) {
  clearContent();

  fetchProducts().then(products => {
    const matches = products.filter(p =>
      p.flavor === flavor &&
      p.name === productName &&
      p.brand === brand
    );

    let html = `<div class="back-btn" onclick="goBackToProduct()">← Назад к товару</div>`;
    html += `<h3 style="color:#fff; margin:16px 0;">${flavor}</h3>`;

    if (matches.length === 0) {
      html += `<p style="color:#888; text-align:center;">Нет данных о наличии</p>`;
    } else {
      matches.forEach(item => {
        const mapUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyDqK4dZy1n4vZ6XxQ6X6X6X6X6X6X6X6X6&q=  ${encodeURIComponent(item.city + ' ' + item.street)}`;
        html += `
          <div style="margin-bottom:20px; background:rgba(30,30,40,0.6); padding:12px; border-radius:10px;">
            <p style="color:#aaa; margin-bottom:8px;">📍 ${item.city}, ${item.street}</p>
            <iframe src="${mapUrl}" width="100%" height="150" frameborder="0" style="border-radius:8px;"></iframe>
          </div>
        `;
      });
    }

    document.getElementById('dynamic-content').innerHTML = html;
  });
}

function goBackToProduct() {
  renderCurrentProductCard();
}

// === Акции ===
async function showPromo() {
  const items = await fetchAkcii();

  if (!Array.isArray(items) || items.length === 0) {
    clearContent();
    document.getElementById('dynamic-content').innerHTML = `
      <div class="back-btn" onclick="goBack()">← Назад</div>
      <p style="color:#888; text-align:center;">Нет акций</p>
    `;
    // Скрываем главное меню
    document.getElementById('main-menu').style.display = 'none';
    return;
  }

  const groupedByName = {};
  items.forEach(p => {
    if (!groupedByName[p.name]) groupedByName[p.name] = [];
    groupedByName[p.name].push(p);
  });

  currentProductGroupList = Object.entries(groupedByName).map(([name, variants]) => ({
    name,
    variants
  }));

  currentProductIndex = 0;
  renderCurrentPromoOrNewCard("Акции");
}

// === Новые товары ===
async function showNewProducts() {
  const items = await fetchNovinki();

  if (!Array.isArray(items) || items.length === 0) {
    clearContent();
    document.getElementById('dynamic-content').innerHTML = `
      <div class="back-btn" onclick="goBack()">← Назад</div>
      <p style="color:#888; text-align:center;">Нет новых товаров</p>
    `;
    // Скрываем главное меню
    document.getElementById('main-menu').style.display = 'none';
    return;
  }

  const groupedByName = {};
  items.forEach(p => {
    if (!groupedByName[p.name]) groupedByName[p.name] = [];
    groupedByName[p.name].push(p);
  });

  currentProductGroupList = Object.entries(groupedByName).map(([name, variants]) => ({
    name,
    variants
  }));

  currentProductIndex = 0;
  renderCurrentPromoOrNewCard("Новые товары");
}

function renderCurrentPromoOrNewCard(title) {
  // Скрываем главное меню при показе акций или новинок
  document.getElementById('main-menu').style.display = 'none';

  const productGroup = currentProductGroupList[currentProductIndex];
  const total = currentProductGroupList.length;

  let html = `
    <div class="back-btn" onclick="goBack()">← Назад</div>
    <div class="product-card">
      <img src="${productGroup.variants[0].image_url || 'https://via.placeholder.com/80  '}"
           style="width:100%; height:180px; object-fit:cover; border-radius:12px; margin-bottom:16px;">
      <h4 style="color:#fff; margin-bottom:12px;">${productGroup.name}</h4>
      
      <!-- Только вкус, без локаций -->
      <div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-bottom:20px;">
        ${productGroup.variants.map(v => 
          `<span style="color:#ddd; background:rgba(50,50,70,0.8); padding:4px 10px; border-radius:12px;">${v.flavor}</span>`
        ).join('')}
      </div>

      <!-- Навигация -->
      <div style="display:flex; align-items:center; justify-content:center; gap:16px;">
        <button class="nav-btn" onclick="prevPromoNew()" ${currentProductIndex === 0 ? 'disabled' : ''}>←</button>
        <span style="color:#999; font-size:14px;">${currentProductIndex + 1} из ${total}</span>
        <button class="nav-btn" onclick="nextPromoNew()" ${currentProductIndex === total - 1 ? 'disabled' : ''}>→</button>
      </div>
    </div>
  `;

  document.getElementById('dynamic-content').innerHTML = html;
}

function prevPromoNew() {
  if (currentProductIndex > 0) {
    currentProductIndex--;
    if (navStack.length > 0 && navStack[navStack.length - 1] === showPromo) {
      renderCurrentPromoOrNewCard("Акции");
    } else if (navStack.length > 0 && navStack[navStack.length - 1] === showNewProducts) {
      renderCurrentPromoOrNewCard("Новые товары");
    }
  }
}

function nextPromoNew() {
  if (currentProductIndex < currentProductGroupList.length - 1) {
    currentProductIndex++;
    if (navStack.length > 0 && navStack[navStack.length - 1] === showPromo) {
      renderCurrentPromoOrNewCard("Акции");
    } else if (navStack.length > 0 && navStack[navStack.length - 1] === showNewProducts) {
      renderCurrentPromoOrNewCard("Новые товары");
    }
  }
}

// === Кнопки главного меню ===
document.getElementById('btn-global-search').onclick = () => pushScreen(showGlobalSearch, "Назад");
document.getElementById('btn-shop-search').onclick = () => pushScreen(showShopSearch, "Назад");
document.getElementById('btn-promo').onclick = () => pushScreen(showPromo, "Назад");
document.getElementById('btn-new-products').onclick = () => pushScreen(showNewProducts, "Назад");

// === Экспорт функций в глобальную область ===
window.showBrandsGlobal = showBrandsGlobal;
window.showProductsGlobal = showProductsGlobal;
window.showStreets = showStreets;
window.showCategoriesInShop = showCategoriesInShop;
window.showBrandsInShop = showBrandsInShop;
window.showProductsInShop = showProductsInShop;
window.showLocationFromVariant = showLocationFromVariant;
window.goBack = goBack;
window.goBackToProduct = goBackToProduct;
window.prevProduct = prevProduct;
window.nextProduct = nextProduct;
window.showPromo = showPromo;
window.showNewProducts = showNewProducts;
window.prevPromoNew = prevPromoNew;
window.nextPromoNew = nextPromoNew;
