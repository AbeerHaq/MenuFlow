const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Restaurant = require('../models/Restaurant');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
const Order = require('../models/Order');
const { protect, ownerOnly } = require('../middleware/authMiddleware');
const { generateSecureToken, generateQrDataUrl } = require('../utils/qrUtils');

// Configure Cloudinary if credentials exist
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Multer memory storage for uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// All owner routes require protect + ownerOnly middleware
router.use(protect, ownerOnly);

// ==========================================
// 1. RESTAURANT PROFILE
// ==========================================

// GET /api/owner/restaurant
router.get('/restaurant', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.restaurantId);
    res.json({ success: true, restaurant, data: restaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/owner/restaurant
router.put('/restaurant', async (req, res) => {
  try {
    const { name, address, phone, logoUrl, currency } = req.body;
    const restaurant = await Restaurant.findById(req.restaurantId);

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    if (name) restaurant.name = name.trim();
    if (address !== undefined) restaurant.address = address.trim();
    if (phone !== undefined) restaurant.phone = phone.trim();
    if (logoUrl !== undefined) restaurant.logoUrl = logoUrl;
    if (currency) restaurant.currency = currency.trim();

    await restaurant.save();

    res.json({ success: true, message: 'Restaurant profile updated', restaurant, data: restaurant });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 2. IMAGE UPLOAD
// ==========================================

// POST /api/owner/upload
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded' });
    }

    // If Cloudinary is configured, upload to Cloudinary
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'menuflow',
      });
      return res.json({ success: true, url: result.secure_url });
    }

    // Fallback: Base64 data URL
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    res.json({ success: true, url: dataURI });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: error.message || 'Image upload failed' });
  }
});

// ==========================================
// 3. CATEGORIES CRUD
// ==========================================

// GET /api/owner/categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({
      restaurantId: req.restaurantId,
    }).sort({ order: 1, createdAt: 1 });

    res.json({ success: true, categories, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/owner/categories
router.post('/categories', async (req, res) => {
  try {
    const { name, order } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const count = await Category.countDocuments({ restaurantId: req.restaurantId });
    const category = await Category.create({
      restaurantId: req.restaurantId,
      name: name.trim(),
      order: order !== undefined ? Number(order) : count,
    });

    res.status(201).json({ success: true, message: 'Category created', category, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/owner/categories/reorder
router.put('/categories/reorder', async (req, res) => {
  try {
    const { orders } = req.body; // Array of { id, order }
    if (!Array.isArray(orders)) {
      return res.status(400).json({ success: false, message: 'Orders array is required' });
    }

    const bulkOps = orders.map((item) => ({
      updateOne: {
        filter: { _id: item.id || item._id, restaurantId: req.restaurantId },
        update: { order: item.order },
      },
    }));

    if (bulkOps.length > 0) {
      await Category.bulkWrite(bulkOps);
    }

    const categories = await Category.find({ restaurantId: req.restaurantId }).sort({ order: 1 });
    res.json({ success: true, message: 'Categories reordered', categories, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/owner/categories/:id
router.put('/categories/:id', async (req, res) => {
  try {
    const { name, order, isActive } = req.body;
    const category = await Category.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId,
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (name) category.name = name.trim();
    if (order !== undefined) category.order = Number(order);
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    await category.save();

    res.json({ success: true, message: 'Category updated', category, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/owner/categories/:id
router.delete('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      restaurantId: req.restaurantId,
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 4. MENU ITEMS CRUD
// ==========================================

// GET /api/owner/menu-items
router.get('/menu-items', async (req, res) => {
  try {
    const { categoryId } = req.query;
    const filter = {
      restaurantId: req.restaurantId,
      isDeleted: false,
    };
    if (categoryId) filter.categoryId = categoryId;

    const menuItems = await MenuItem.find(filter)
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, menuItems, data: menuItems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/owner/menu-items
router.post('/menu-items', async (req, res) => {
  try {
    const { name, description, price, categoryId, imageUrl, isAvailable } = req.body;

    if (!name || price === undefined || !categoryId) {
      return res.status(400).json({ success: false, message: 'Name, price, and category are required' });
    }

    // Verify category belongs to this restaurant
    const category = await Category.findOne({
      _id: categoryId,
      restaurantId: req.restaurantId,
    });

    if (!category) {
      return res.status(400).json({ success: false, message: 'Invalid category for this restaurant' });
    }

    const menuItem = await MenuItem.create({
      restaurantId: req.restaurantId,
      categoryId,
      name: name.trim(),
      description: (description || '').trim(),
      price: Number(price),
      imageUrl: imageUrl || '',
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
    });

    const populated = await MenuItem.findById(menuItem._id).populate('categoryId', 'name');

    res.status(201).json({ success: true, message: 'Menu item created', menuItem: populated, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/owner/menu-items/:id
router.put('/menu-items/:id', async (req, res) => {
  try {
    const { name, description, price, categoryId, imageUrl, isAvailable } = req.body;

    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId,
      isDeleted: false,
    });

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    if (categoryId) {
      const category = await Category.findOne({
        _id: categoryId,
        restaurantId: req.restaurantId,
      });
      if (!category) {
        return res.status(400).json({ success: false, message: 'Invalid category' });
      }
      menuItem.categoryId = categoryId;
    }

    if (name) menuItem.name = name.trim();
    if (description !== undefined) menuItem.description = description.trim();
    if (price !== undefined) menuItem.price = Number(price);
    if (imageUrl !== undefined) menuItem.imageUrl = imageUrl;
    if (isAvailable !== undefined) menuItem.isAvailable = Boolean(isAvailable);

    await menuItem.save();
    const populated = await MenuItem.findById(menuItem._id).populate('categoryId', 'name');

    res.json({ success: true, message: 'Menu item updated', menuItem: populated, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/owner/menu-items/:id/availability
router.patch('/menu-items/:id/availability', async (req, res) => {
  try {
    const { isAvailable } = req.body;
    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId,
      isDeleted: false,
    });

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    menuItem.isAvailable = isAvailable !== undefined ? Boolean(isAvailable) : !menuItem.isAvailable;
    await menuItem.save();

    res.json({
      success: true,
      message: `Menu item is now ${menuItem.isAvailable ? 'available' : 'unavailable'}`,
      menuItem,
      data: menuItem,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/owner/menu-items/:id (Soft-delete per PRD)
router.delete('/menu-items/:id', async (req, res) => {
  try {
    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId,
    });

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    menuItem.isDeleted = true;
    await menuItem.save();

    res.json({ success: true, message: 'Menu item deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 5. TABLES & QR CODES
// ==========================================

// GET /api/owner/tables
router.get('/tables', async (req, res) => {
  try {
    const tables = await Table.find({
      restaurantId: req.restaurantId,
      isActive: true,
    }).sort({ number: 1, createdAt: 1 });

    const restaurant = req.restaurant;
    const origin = req.headers.origin || `http://${req.headers.host}`;

    const formattedTables = tables.map((t) => ({
      _id: t._id,
      id: t._id,
      number: t.number,
      capacity: t.capacity,
      qrToken: t.qrToken,
      isActive: t.isActive,
      qrUrl: `/r/${restaurant.slug}/t/${t.qrToken}`,
      fullUrl: `${origin}/r/${restaurant.slug}/t/${t.qrToken}`,
    }));

    res.json({ success: true, tables: formattedTables, data: formattedTables });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/owner/tables
router.post('/tables', async (req, res) => {
  try {
    const { number, capacity } = req.body;
    if (!number) {
      return res.status(400).json({ success: false, message: 'Table number/name is required' });
    }

    // Check duplicate table number for this restaurant
    const existing = await Table.findOne({
      restaurantId: req.restaurantId,
      number: number.trim(),
      isActive: true,
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'A table with this number already exists' });
    }

    const qrToken = generateSecureToken();
    const table = await Table.create({
      restaurantId: req.restaurantId,
      number: number.trim(),
      capacity: Number(capacity) || 4,
      qrToken,
    });

    res.status(201).json({ success: true, message: 'Table created', table, data: table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/owner/tables/:id
router.put('/tables/:id', async (req, res) => {
  try {
    const { number, capacity, isActive } = req.body;
    const table = await Table.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId,
    });

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    if (number) table.number = number.trim();
    if (capacity !== undefined) table.capacity = Number(capacity);
    if (isActive !== undefined) table.isActive = Boolean(isActive);

    await table.save();

    res.json({ success: true, message: 'Table updated', table, data: table });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/owner/tables/:id/regenerate-qr (Invalidates old token)
router.post('/tables/:id/regenerate-qr', async (req, res) => {
  try {
    const table = await Table.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId,
    });

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    table.qrToken = generateSecureToken();
    await table.save();

    const origin = req.headers.origin || `http://${req.headers.host}`;
    const targetUrl = `${origin}/r/${req.restaurant.slug}/t/${table.qrToken}`;
    const qrDataUrl = await generateQrDataUrl(targetUrl);

    res.json({
      success: true,
      message: 'QR Code regenerated. Old QR code has been invalidated.',
      table,
      qrDataUrl,
      targetUrl,
      data: table,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/owner/tables/:id/qr
router.get('/tables/:id/qr', async (req, res) => {
  try {
    const table = await Table.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId,
    });

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    const origin = req.headers.origin || `http://${req.headers.host}`;
    const targetUrl = `${origin}/r/${req.restaurant.slug}/t/${table.qrToken}`;
    const qrDataUrl = await generateQrDataUrl(targetUrl);

    res.json({
      success: true,
      qrDataUrl,
      targetUrl,
      table,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/owner/tables/:id
router.delete('/tables/:id', async (req, res) => {
  try {
    const table = await Table.findOneAndDelete({
      _id: req.params.id,
      restaurantId: req.restaurantId,
    });

    if (!table) {
      return res.status(404).json({ success: false, message: 'Table not found' });
    }

    res.json({ success: true, message: 'Table deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 6. LIVE ORDERS & LIFECYCLE MANAGEMENT
// ==========================================

// Valid Order Status Transitions Map (Enforced strictly on server)
const VALID_TRANSITIONS = {
  pending: ['accepted', 'rejected'],
  accepted: ['preparing'],
  preparing: ['ready'],
  ready: ['completed'],
  completed: [],
  rejected: [],
};

// GET /api/owner/orders
router.get('/orders', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {
      restaurantId: req.restaurantId,
    };

    if (status) {
      if (status === 'active') {
        filter.status = { $in: ['pending', 'accepted', 'preparing', 'ready'] };
      } else {
        filter.status = status;
      }
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, orders, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/owner/orders/:id/status
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findOne({
      _id: req.params.id,
      restaurantId: req.restaurantId,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentStatus = order.status;
    const targetStatus = status.toLowerCase();

    // Check if transition is valid
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition: Cannot change order from '${currentStatus}' to '${targetStatus}'. Allowed transitions: ${allowed.join(', ') || 'None'}`,
      });
    }

    order.status = targetStatus;
    order.statusHistory.push({
      previousStatus: currentStatus,
      newStatus: targetStatus,
      timestamp: new Date(),
      actor: req.user.name || 'Owner',
      note: note || '',
    });

    await order.save();

    // Emit live Socket.io events
    const io = req.app.get('io');
    if (io) {
      // Notify restaurant room
      io.to(`restaurant:${req.restaurantId.toString()}`).emit('order:updated', {
        order,
      });
      // Notify customer order tracking room
      io.to(`order:${order._id.toString()}`).emit('order:updated', {
        order,
      });
    }

    res.json({
      success: true,
      message: `Order status updated to ${targetStatus}`,
      order,
      data: order,
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/owner/stats
router.get('/stats', async (req, res) => {
  try {
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const todayOrdersCount = await Order.countDocuments({
      restaurantId: req.restaurantId,
      createdAt: { $gte: todayStart },
    });

    const pendingOrdersCount = await Order.countDocuments({
      restaurantId: req.restaurantId,
      status: 'pending',
    });

    const monthlyOrdersCount = await Order.countDocuments({
      restaurantId: req.restaurantId,
      createdAt: { $gte: monthStart },
    });

    // PRD: Only Completed orders count toward revenue
    const todayCompletedOrders = await Order.find({
      restaurantId: req.restaurantId,
      status: 'completed',
      createdAt: { $gte: todayStart },
    });

    const todayRevenue = todayCompletedOrders.reduce((acc, curr) => acc + curr.totalAmount, 0);

    res.json({
      success: true,
      data: {
        todayOrders: todayOrdersCount,
        pendingOrders: pendingOrdersCount,
        todayRevenue: Number(todayRevenue.toFixed(2)),
        monthlyOrders: monthlyOrdersCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
