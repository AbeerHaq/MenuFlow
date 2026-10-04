const http = require('http');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const connectDB = require('./config/db');
const seedInitialData = require('./config/seed');
const authRoutes = require('./routes/authRoutes');
const publicRoutes = require('./routes/publicRoutes');
const ownerRoutes = require('./routes/ownerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { JWT_SECRET } = require('./middleware/authMiddleware');
const User = require('./models/User');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

// Store io instance on app for access in routes
app.set('io', io);

// Security Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting for public order creation
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // Limit each IP to 60 order creations per 15 mins
  message: {
    success: false,
    message: 'Too many order requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/public/orders', orderLimiter);
app.use('/api/public', publicRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.json({
    status: 'MenuFlow API is running successfully',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ==========================================
// SOCKET.IO REAL-TIME ARCHITECTURE
// ==========================================

io.use(async (socket, next) => {
  // Optional auth during handshake (used by owners/admin)
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id).select('-passwordHash');
      if (user) {
        socket.user = user;
      }
    } catch (err) {
      console.warn('Socket token verification failed, continuing as guest socket:', err.message);
    }
  }
  next();
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id} (User: ${socket.user?.email || 'Anonymous/Guest'})`);

  // Owner joins their restaurant room
  socket.on('join:restaurant', (restaurantId) => {
    if (!restaurantId) return;

    // Verify owner authorization if socket is authenticated
    if (socket.user && socket.user.role === 'owner') {
      const userRestId = socket.user.restaurantId?.toString();
      if (userRestId && userRestId !== restaurantId.toString()) {
        console.warn(`Unauthorized room join attempt by user ${socket.user.email} to room ${restaurantId}`);
        socket.emit('error:unauthorized', { message: 'Cannot join other restaurant rooms' });
        return;
      }
    }

    const room = `restaurant:${restaurantId.toString()}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
    socket.emit('joined:restaurant', { room, success: true });
  });

  // Customer or owner joins specific order room to track status
  socket.on('join:order', (orderId) => {
    if (!orderId) return;
    const room = `order:${orderId.toString()}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined order room ${room}`);
    socket.emit('joined:order', { room, success: true });
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Start Server and Database
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await seedInitialData();

  server.listen(PORT, () => {
    console.log(`MenuFlow Server running on port ${PORT}`);
  });
};

startServer();

module.exports = { app, server, io };