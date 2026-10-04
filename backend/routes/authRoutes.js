const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const { protect, JWT_SECRET } = require('../middleware/authMiddleware');

const router = express.Router();

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '30d' });
};

// Helper: Slugify restaurant name
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, restaurantName, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email and password' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const assignedRole = role === 'admin' ? 'admin' : 'owner';

    const user = new User({
      name,
      email: email.toLowerCase(),
      passwordHash: password,
      role: assignedRole,
    });

    await user.save();

    let restaurant = null;
    if (assignedRole === 'owner') {
      const restName = restaurantName || `${name}'s Kitchen`;
      let baseSlug = slugify(restName);
      let slug = baseSlug;
      let count = 1;

      // Ensure unique slug
      while (await Restaurant.findOne({ slug })) {
        slug = `${baseSlug}-${count}`;
        count++;
      }

      restaurant = await Restaurant.create({
        name: restName,
        slug,
        phone: phone || '',
        ownerId: user._id,
      });

      user.restaurantId = restaurant._id;
      await user.save();
    }

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: restaurant?._id || null,
        restaurantName: restaurant?.name || null,
        restaurantSlug: restaurant?.slug || null,
      },
      restaurant,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    let restaurant = null;
    if (user.role === 'owner') {
      restaurant = await Restaurant.findOne({ ownerId: user._id, isDeleted: false });

      if (restaurant && restaurant.status === 'suspended') {
        return res.status(403).json({
          success: false,
          message: 'Your restaurant has been suspended by administration.',
        });
      }
    }

    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: restaurant?._id || user.restaurantId || null,
        restaurantName: restaurant?.name || null,
        restaurantSlug: restaurant?.slug || null,
      },
      restaurant,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    let restaurant = req.restaurant || null;
    if (!restaurant && req.user.role === 'owner') {
      restaurant = await Restaurant.findOne({ ownerId: req.user._id, isDeleted: false });
    }

    res.json({
      success: true,
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        restaurantId: restaurant?._id || null,
        restaurantName: restaurant?.name || null,
        restaurantSlug: restaurant?.slug || null,
      },
      restaurant,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    if (!user) {
      // Return success message regardless to prevent email enumeration
      return res.json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been prepared.',
      });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    res.json({
      success: true,
      message: 'Password reset link sent.',
      resetToken, // Returned for dev/demo purposes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }

    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset token' });
    }

    user.passwordHash = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    res.json({ success: true, message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;