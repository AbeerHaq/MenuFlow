// ---------------------------------------------------------------------------
// MOCK BACKEND (demo mode)
// Answers every request the app makes with fake data, so you can click through
// all pages without a real server. Turned on/off by VITE_USE_MOCK in .env
// Data is kept in localStorage ("menuflow_mock_db"), so it survives a refresh.
// ---------------------------------------------------------------------------

const DB_KEY = 'menuflow_mock_db';
const LATENCY = 350; // ms, just so loading skeletons are visible

// ---------- little SVG "photos" so menu cards don't look empty ----------
const pic = (emoji, c1, c2) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
       <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
       </linearGradient></defs>
       <rect width="400" height="300" fill="url(#g)"/>
       <text x="200" y="150" font-size="120" text-anchor="middle" dominant-baseline="central">${emoji}</text>
     </svg>`
  );

// ---------- seed data ----------
const seed = () => ({
  restaurant: {
    name: 'The Golden Fork',
    address: '123 Food Street, Islamabad',
    phone: '+92 300 1234567',
    email: 'hello@goldenfork.com',
    description: 'Fresh, flavourful food served with love since 2015.',
  },
  categories: [
    { _id: 'c1', name: 'Starters' },
    { _id: 'c2', name: 'Main Course' },
    { _id: 'c3', name: 'Desserts' },
    { _id: 'c4', name: 'Drinks' },
  ],
  menuItems: [
    { _id: 'm1', name: 'Garlic Bread', description: 'Toasted baguette with garlic butter and herbs.', price: 4.5, categoryId: 'c1', isVegetarian: true, isAvailable: true, imageUrl: pic('🥖', '#fde68a', '#f59e0b') },
    { _id: 'm2', name: 'Crispy Spring Rolls', description: 'Golden rolls filled with vegetables, served with sweet chilli dip.', price: 6.0, categoryId: 'c1', isVegetarian: true, isAvailable: true, imageUrl: pic('🥟', '#fecaca', '#f97316') },
    { _id: 'm3', name: 'Chicken Wings', description: 'Spicy glazed wings with ranch dressing.', price: 8.5, categoryId: 'c1', isVegetarian: false, isAvailable: false, imageUrl: pic('🍗', '#fed7aa', '#ea580c') },
    { _id: 'm4', name: 'Margherita Pizza', description: 'Tomato, fresh mozzarella and basil on a thin crust.', price: 12.0, categoryId: 'c2', isVegetarian: true, isAvailable: true, imageUrl: pic('🍕', '#fecdd3', '#ef4444') },
    { _id: 'm5', name: 'Grilled Chicken Burger', description: 'Juicy grilled chicken, lettuce, tomato and house sauce.', price: 10.5, categoryId: 'c2', isVegetarian: false, isAvailable: true, imageUrl: pic('🍔', '#fef08a', '#d97706') },
    { _id: 'm6', name: 'Creamy Alfredo Pasta', description: 'Fettuccine in a rich parmesan cream sauce.', price: 13.5, categoryId: 'c2', isVegetarian: true, isAvailable: true, imageUrl: pic('🍝', '#fde68a', '#fb923c') },
    { _id: 'm7', name: 'Beef Steak', description: '250g steak with pepper sauce and roasted vegetables.', price: 22.0, categoryId: 'c2', isVegetarian: false, isAvailable: true, imageUrl: pic('🥩', '#fca5a5', '#b91c1c') },
    { _id: 'm8', name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with a molten centre and ice cream.', price: 7.0, categoryId: 'c3', isVegetarian: true, isAvailable: true, imageUrl: pic('🍰', '#d6b4a0', '#7c2d12') },
    { _id: 'm9', name: 'Fresh Lemonade', description: 'Freshly squeezed lemons with mint.', price: 3.5, categoryId: 'c4', isVegetarian: true, isAvailable: true, imageUrl: pic('🍋', '#fef9c3', '#facc15') },
    { _id: 'm10', name: 'Iced Coffee', description: 'Cold brew over ice with a splash of milk.', price: 4.0, categoryId: 'c4', isVegetarian: true, isAvailable: true, imageUrl: pic('🧋', '#e7d5c3', '#92400e') },
  ],
  tables: [1, 2, 3, 4, 5, 6].map((n) => ({
    _id: `t${n}`,
    number: String(n),
    capacity: n <= 2 ? 2 : n <= 4 ? 4 : 6,
    qrCode: `table-${n}`,
  })),
  stats: { todayOrders: 24, pendingOrders: 5, todayRevenue: 1284.5, monthlyOrders: 612 },
});

// ---------- tiny persistence ----------
let db;
const load = () => {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return seed();
};
const save = () => {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { /* too big, ignore */ }
};
const uid = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

// ---------- helpers ----------
const fileToDataUrl = (file) =>
  new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => resolve('');
    r.readAsDataURL(file);
  });

const readBody = async (data) => {
  if (!data) return {};
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch (e) { return {}; }
  }
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    const out = {};
    for (const [k, v] of data.entries()) {
      out[k] = typeof File !== 'undefined' && v instanceof File ? await fileToDataUrl(v) : v;
    }
    return out;
  }
  return data;
};

const bool = (v) => v === true || v === 'true';

class MockError extends Error {
  constructor(status, message) {
    super(message);
    this.isAxiosError = true;
    this.response = { status, data: { success: false, message } };
  }
}
const ok = (data, status = 200) => ({ status, data });

// ---------- the routes ----------
const handle = async (method, path, body) => {
  let m;

  // ===== AUTH =====
  if (method === 'post' && path === '/auth/login') {
    if (!body.email || !body.password) throw new MockError(400, 'Email and password are required');
    return ok({
      success: true,
      token: 'mock-token-123',
      user: { name: 'Demo Owner', email: body.email, role: 'owner', restaurantName: db.restaurant.name },
    });
  }
  if (method === 'post' && path === '/auth/register') {
    if (body.restaurantName) { db.restaurant.name = body.restaurantName; save(); }
    return ok({
      success: true,
      token: 'mock-token-123',
      user: { name: body.ownerName || 'Demo Owner', email: body.email, role: 'owner', restaurantName: db.restaurant.name },
    }, 201);
  }
  if (method === 'post' && path === '/auth/forgot-password') {
    return ok({ success: true, status: 'success', message: 'Reset link sent (demo mode)' });
  }
  if (method === 'post' && /^\/auth\/reset-password\/.+/.test(path)) {
    return ok({ success: true, status: 'success', message: 'Password reset (demo mode)' });
  }

  // ===== RESTAURANT =====
  if (method === 'get' && path === '/restaurant/dashboard-stats') return ok({ success: true, data: db.stats });
  if (method === 'get' && path === '/restaurant/profile') return ok({ success: true, data: db.restaurant });
  if (method === 'put' && path === '/restaurant/profile') {
    db.restaurant = { ...db.restaurant, ...body };
    save();
    return ok({ success: true, data: db.restaurant });
  }

  // ===== CATEGORIES =====
  if (method === 'get' && path === '/categories') return ok({ success: true, data: db.categories });
  if (method === 'post' && path === '/categories') {
    const name = (body.name || '').trim();
    if (db.categories.some((c) => c.name.toLowerCase() === name.toLowerCase()))
      throw new MockError(400, 'A category with this name already exists.');
    const cat = { _id: uid('c'), name };
    db.categories.push(cat); save();
    return ok({ success: true, data: cat }, 201);
  }
  if ((m = path.match(/^\/categories\/([^/]+)$/))) {
    const cat = db.categories.find((c) => c._id === m[1]);
    if (!cat) throw new MockError(404, 'Category not found');
    if (method === 'put') { cat.name = (body.name || cat.name).trim(); save(); return ok({ success: true, data: cat }); }
    if (method === 'delete') {
      db.categories = db.categories.filter((c) => c._id !== m[1]);
      db.menuItems = db.menuItems.filter((i) => i.categoryId !== m[1]);
      save();
      return ok({ success: true });
    }
  }

  // ===== MENU ITEMS =====
  if (method === 'get' && path === '/menu-items') return ok({ success: true, data: db.menuItems });
  if (method === 'post' && path === '/menu-items') {
    const item = {
      _id: uid('m'),
      name: body.name,
      description: body.description || '',
      price: Number(body.price) || 0,
      categoryId: body.categoryId,
      isVegetarian: bool(body.isVegetarian),
      isAvailable: body.isAvailable === undefined ? true : bool(body.isAvailable),
      imageUrl: body.image || '',
    };
    db.menuItems.unshift(item); save();
    return ok({ success: true, data: item }, 201);
  }
  if ((m = path.match(/^\/menu-items\/([^/]+)\/availability$/)) && method === 'patch') {
    const item = db.menuItems.find((i) => i._id === m[1]);
    if (!item) throw new MockError(404, 'Menu item not found');
    item.isAvailable = bool(body.isAvailable); save();
    return ok({ success: true, data: item });
  }
  if ((m = path.match(/^\/menu-items\/([^/]+)$/))) {
    const item = db.menuItems.find((i) => i._id === m[1]);
    if (!item) throw new MockError(404, 'Menu item not found');
    if (method === 'put') {
      item.name = body.name ?? item.name;
      item.description = body.description ?? item.description;
      item.price = body.price !== undefined ? Number(body.price) : item.price;
      item.categoryId = body.categoryId ?? item.categoryId;
      if (body.isVegetarian !== undefined) item.isVegetarian = bool(body.isVegetarian);
      if (body.isAvailable !== undefined) item.isAvailable = bool(body.isAvailable);
      if (body.image) item.imageUrl = body.image;
      save();
      return ok({ success: true, data: item });
    }
    if (method === 'delete') {
      db.menuItems = db.menuItems.filter((i) => i._id !== m[1]);
      save();
      return ok({ success: true });
    }
  }

  // ===== TABLES =====
  if (method === 'get' && path === '/tables') return ok({ success: true, data: db.tables });
  if (method === 'post' && path === '/tables') {
    const number = String(body.number).trim();
    if (db.tables.some((t) => String(t.number) === number))
      throw new MockError(400, `Table ${number} already exists.`);
    const table = { _id: uid('t'), number, capacity: Number(body.capacity) || 4, qrCode: `table-${number}` };
    db.tables.push(table); save();
    return ok({ success: true, data: table }, 201);
  }
  if ((m = path.match(/^\/tables\/public\/(.+)$/)) && method === 'get') {
    const table = db.tables.find((t) => t.qrCode === m[1] || t._id === m[1]);
    if (!table) throw new MockError(404, 'Table not found');
    return ok({
      success: true,
      data: { table, restaurant: db.restaurant, categories: db.categories, menuItems: db.menuItems },
    });
  }
  if ((m = path.match(/^\/tables\/([^/]+)$/))) {
    const table = db.tables.find((t) => t._id === m[1]);
    if (!table) throw new MockError(404, 'Table not found');
    if (method === 'put') { Object.assign(table, body); save(); return ok({ success: true, data: table }); }
    if (method === 'delete') { db.tables = db.tables.filter((t) => t._id !== m[1]); save(); return ok({ success: true }); }
  }

  throw new MockError(404, `Mock API: no route for ${method.toUpperCase()} ${path}`);
};

// ---------- the axios adapter ----------
export const mockAdapter = async (config) => {
  if (!db) db = load();
  await new Promise((r) => setTimeout(r, LATENCY));

  const method = (config.method || 'get').toLowerCase();
  const path = (config.url || '').split('?')[0];
  const body = await readBody(config.data);

  const result = await handle(method, path, body); // throws MockError on failure
  return { ...result, statusText: 'OK', headers: {}, config, request: {} };
};

// Reset demo data:  import { resetMockDb } ... or just run in browser console:
//   localStorage.removeItem('menuflow_mock_db'); location.reload();
export const resetMockDb = () => {
  localStorage.removeItem(DB_KEY);
  db = seed();
};
