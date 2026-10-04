const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Protect all admin routes
router.use(protect, adminOnly);

// ==========================================
// 1. RESTAURANTS MANAGEMENT
// ==========================================

// GET /api/admin/restaurants
router.get('/restaurants', async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = { isDeleted: false };

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ name: regex }, { slug: regex }, { phone: regex }, { address: regex }];
    }

    const restaurants = await Restaurant.find(filter)
      .populate('ownerId', 'name email createdAt')
      .sort({ createdAt: -1 });

    // Calculate total orders & revenue per restaurant
    const restaurantIds = restaurants.map((r) => r._id);

    // Aggregate orders by restaurant
    const orderAggregates = await Order.aggregate([
      { $match: { restaurantId: { $in: restaurantIds } } },
      {
        $group: {
          _id: '$restaurantId',
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$totalAmount', 0],
            },
          },
        },
      },
    ]);

    const statsMap = new Map();
    orderAggregates.forEach((agg) => statsMap.set(agg._id.toString(), agg));

    const enrichedRestaurants = restaurants.map((r) => {
      const stats = statsMap.get(r._id.toString()) || { totalOrders: 0, completedOrders: 0, totalRevenue: 0 };
      return {
        _id: r._id,
        id: r._id,
        name: r.name,
        slug: r.slug,
        address: r.address,
        phone: r.phone,
        logoUrl: r.logoUrl,
        currency: r.currency,
        status: r.status,
        createdAt: r.createdAt,
        owner: r.ownerId
          ? {
              _id: r.ownerId._id,
              name: r.ownerId.name,
              email: r.ownerId.email,
            }
          : null,
        totalOrders: stats.totalOrders,
        completedOrders: stats.completedOrders,
        totalRevenue: Number(stats.totalRevenue.toFixed(2)),
      };
    });

    res.json({
      success: true,
      restaurants: enrichedRestaurants,
      data: enrichedRestaurants,
    });
  } catch (error) {
    console.error('Admin get restaurants error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/admin/restaurants/:id/status
router.patch('/restaurants/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'active' or 'suspended'" });
    }

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    restaurant.status = status;
    await restaurant.save();

    // If suspended, disconnect active socket connections for this restaurant
    const io = req.app.get('io');
    if (io && status === 'suspended') {
      const room = `restaurant:${restaurant._id.toString()}`;
      io.to(room).emit('restaurant:suspended', {
        message: 'This restaurant has been suspended by administration.',
      });
      io.in(room).disconnectSockets(true);
    }

    res.json({
      success: true,
      message: `Restaurant has been ${status === 'suspended' ? 'suspended' : 'reactivated'}`,
      restaurant,
      data: restaurant,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/admin/restaurants/:id (Soft-delete per PRD)
router.delete('/restaurants/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    restaurant.isDeleted = true;
    restaurant.status = 'suspended';
    await restaurant.save();

    // Disconnect active socket connections
    const io = req.app.get('io');
    if (io) {
      const room = `restaurant:${restaurant._id.toString()}`;
      io.to(room).emit('restaurant:deleted', {
        message: 'This restaurant has been deactivated.',
      });
      io.in(room).disconnectSockets(true);
    }

    res.json({
      success: true,
      message: 'Restaurant soft-deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 2. PLATFORM ANALYTICS & REVENUE
// ==========================================

// GET /api/admin/analytics/revenue
router.get('/analytics/revenue', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysInt = parseInt(days, 10) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInt);
    startDate.setHours(0, 0, 0, 0);

    // Total counts
    const totalRestaurants = await Restaurant.countDocuments({ isDeleted: false });
    const activeRestaurants = await Restaurant.countDocuments({ isDeleted: false, status: 'active' });
    const totalOrders = await Order.countDocuments();
    const completedOrders = await Order.countDocuments({ status: 'completed' });

    // Completed revenue platform-wide
    const platformRevenueAgg = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
    ]);
    const platformRevenue = platformRevenueAgg[0]?.totalRevenue || 0;

    // Daily revenue over time (completed orders only)
    const dailyRevenueAgg = await Order.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const revenueOverTime = dailyRevenueAgg.map((d) => ({
      date: d._id,
      revenue: Number(d.revenue.toFixed(2)),
      orders: d.orders,
    }));

    // Top performing restaurants by revenue
    const topRestaurantsAgg = await Order.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$restaurantId',
          revenue: { $sum: '$totalAmount' },
          ordersCount: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'restaurants',
          localField: '_id',
          foreignField: '_id',
          as: 'restaurant',
        },
      },
      { $unwind: '$restaurant' },
      {
        $project: {
          _id: 1,
          name: '$restaurant.name',
          slug: '$restaurant.slug',
          revenue: { $round: ['$revenue', 2] },
          ordersCount: 1,
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        totalRestaurants,
        activeRestaurants,
        totalOrders,
        completedOrders,
        platformRevenue: Number(platformRevenue.toFixed(2)),
        revenueOverTime,
        topRestaurants: topRestaurantsAgg,
      },
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
