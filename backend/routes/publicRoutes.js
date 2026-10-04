const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const Table = require('../models/Table');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');

// GET /api/public/menu/:slug/:token
router.get('/menu/:slug/:token', async (req, res) => {
  try {
    const { slug, token } = req.params;

    const restaurant = await Restaurant.findOne({
      slug: slug.toLowerCase(),
      isDeleted: false,
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    if (restaurant.status === 'suspended') {
      return res.status(403).json({
        success: false,
        isSuspended: true,
        message: 'This restaurant menu is currently unavailable due to suspension.',
      });
    }

    const table = await Table.findOne({
      restaurantId: restaurant._id,
      qrToken: token,
      isActive: true,
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        isInvalidQr: true,
        message: 'Invalid or inactive QR code table token.',
      });
    }

    const categories = await Category.find({
      restaurantId: restaurant._id,
      isActive: true,
    }).sort({ order: 1, createdAt: 1 });

    const menuItems = await MenuItem.find({
      restaurantId: restaurant._id,
      isDeleted: false,
    }).select('-isDeleted');

    res.json({
      success: true,
      restaurant: {
        _id: restaurant._id,
        name: restaurant.name,
        slug: restaurant.slug,
        address: restaurant.address,
        phone: restaurant.phone,
        logoUrl: restaurant.logoUrl,
        currency: restaurant.currency,
      },
      table: {
        _id: table._id,
        number: table.number,
        capacity: table.capacity,
        qrToken: table.qrToken,
      },
      categories,
      menuItems,
    });
  } catch (error) {
    console.error('Get public menu error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/public/orders
router.post('/orders', async (req, res) => {
  try {
    const { slug, token, items, customerName, customerNote } = req.body;

    if (!slug || !token) {
      return res.status(400).json({ success: false, message: 'Restaurant slug and table token are required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must contain at least one menu item' });
    }

    const restaurant = await Restaurant.findOne({
      slug: slug.toLowerCase(),
      isDeleted: false,
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    if (restaurant.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Cannot place order: Restaurant is currently suspended.',
      });
    }

    const table = await Table.findOne({
      restaurantId: restaurant._id,
      qrToken: token,
      isActive: true,
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Invalid table QR token.',
      });
    }

    // SERVER-SIDE PRICE CALCULATION & AVAILABILITY VALIDATION
    // Never trust client prices! Fetch items directly from DB.
    const itemIds = items.map((i) => i.menuItemId || i._id || i.id);
    const dbItems = await MenuItem.find({
      _id: { $in: itemIds },
      restaurantId: restaurant._id,
      isDeleted: false,
    });

    const dbItemMap = new Map();
    dbItems.forEach((dbItem) => dbItemMap.set(dbItem._id.toString(), dbItem));

    const validatedItems = [];
    let computedTotal = 0;

    for (const item of items) {
      const id = (item.menuItemId || item._id || item.id || '').toString();
      const dbItem = dbItemMap.get(id);

      if (!dbItem) {
        return res.status(400).json({
          success: false,
          message: `Menu item '${item.name || id}' is no longer on the menu.`,
        });
      }

      if (!dbItem.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Menu item '${dbItem.name}' is currently sold out / unavailable.`,
        });
      }

      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const itemPrice = Number(dbItem.price);
      const subtotal = Number((itemPrice * qty).toFixed(2));

      computedTotal += subtotal;

      validatedItems.push({
        menuItemId: dbItem._id,
        name: dbItem.name,
        price: itemPrice,
        quantity: qty,
        subtotal: subtotal,
      });
    }

    computedTotal = Number(computedTotal.toFixed(2));

    // Generate Human-Readable Order Number (e.g. #1001)
    const countToday = await Order.countDocuments({
      restaurantId: restaurant._id,
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    });
    const orderNumber = `#${1001 + countToday}`;

    // Create and PERSIST order before any socket emission
    const order = new Order({
      restaurantId: restaurant._id,
      tableId: table._id,
      tableNumber: table.number,
      orderNumber,
      items: validatedItems,
      totalAmount: computedTotal,
      customerName: (customerName || 'Guest').trim(),
      customerNote: (customerNote || '').trim(),
      status: 'pending',
      statusHistory: [
        {
          previousStatus: null,
          newStatus: 'pending',
          timestamp: new Date(),
          actor: 'Customer',
          note: 'Order placed by customer via table QR code',
        },
      ],
    });

    await order.save();

    // EMIT Socket.io event to restaurant room AFTER successful persistence
    const io = req.app.get('io');
    if (io) {
      io.to(`restaurant:${restaurant._id.toString()}`).emit('order:new', {
        order,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      order,
    });
  } catch (error) {
    console.error('Create public order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/public/orders/:orderId
router.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).populate('restaurantId', 'name logoUrl currency slug');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
