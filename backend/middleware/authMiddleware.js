const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

const JWT_SECRET = process.env.JWT_SECRET || 'menuflow_jwt_super_secret_key_2026';

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      const user = await User.findById(decoded.id).select('-passwordHash');
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found or session invalid' });
      }

      req.user = user;

      // If owner, attach restaurant
      if (user.role === 'owner') {
        let restaurant = null;
        if (user.restaurantId) {
          restaurant = await Restaurant.findById(user.restaurantId);
        } else {
          restaurant = await Restaurant.findOne({ ownerId: user._id, isDeleted: false });
        }

        if (restaurant) {
          if (restaurant.status === 'suspended') {
            return res.status(403).json({
              success: false,
              message: 'Your restaurant account is suspended. Please contact support.',
            });
          }
          if (restaurant.isDeleted) {
            return res.status(403).json({
              success: false,
              message: 'Your restaurant account has been deactivated.',
            });
          }
          req.restaurant = restaurant;
          req.restaurantId = restaurant._id;
        }
      }

      next();
    } catch (error) {
      console.error('Auth middleware token verification error:', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token invalid or expired' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access forbidden: Administrator privileges required' });
  }
};

const ownerOnly = (req, res, next) => {
  if (req.user && req.user.role === 'owner') {
    if (!req.restaurant) {
      return res.status(400).json({ success: false, message: 'No restaurant associated with this owner profile' });
    }
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access forbidden: Restaurant owner privileges required' });
  }
};

module.exports = { protect, adminOnly, ownerOnly, JWT_SECRET };