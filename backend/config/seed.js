const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
const Order = require('../models/Order');
const { generateSecureToken } = require('../utils/qrUtils');

const seedInitialData = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      console.log('Seed: Admin user already exists, skipping seed.');
      return;
    }

    console.log('Seed: Starting initial database seed...');

    // 1. Create Admin User
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@menuflow.com',
      passwordHash: 'admin123',
      role: 'admin',
    });

    // 2. Create Demo Owner
    const owner = await User.create({
      name: 'Marco Pierre',
      email: 'owner@menuflow.com',
      passwordHash: 'password123',
      role: 'owner',
    });

    // 3. Create Demo Restaurant
    const restaurant = await Restaurant.create({
      name: 'The Grand Bistro',
      slug: 'grand-bistro',
      address: '142 Gourmet Boulevard, Suite 100, New York, NY',
      phone: '+1 (555) 234-5678',
      logoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&auto=format&fit=crop&q=80',
      currency: '$',
      status: 'active',
      ownerId: owner._id,
    });

    owner.restaurantId = restaurant._id;
    await owner.save();

    // 4. Create Categories
    const categoriesData = [
      { name: 'Starters & Appetizers', order: 0 },
      { name: 'Main Entrees', order: 1 },
      { name: 'Woodfired Pizzas & Pastas', order: 2 },
      { name: 'Desserts & Sweets', order: 3 },
      { name: 'Artisan Beverages', order: 4 },
    ];

    const categories = [];
    for (const cat of categoriesData) {
      const c = await Category.create({
        restaurantId: restaurant._id,
        name: cat.name,
        order: cat.order,
        isActive: true,
      });
      categories.push(c);
    }

    // 5. Create Menu Items
    const menuItemsData = [
      {
        categoryId: categories[0]._id,
        name: 'Crispy Truffle Calamari',
        description: 'Tender calamari rings dusted in black pepper flour, white truffle oil, roasted garlic aioli.',
        price: 14.5,
        imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=500&auto=format&fit=crop&q=80',
        isAvailable: true,
      },
      {
        categoryId: categories[0]._id,
        name: 'Bruschetta al Pomodoro',
        description: 'Toasted sourdough, heirloom tomatoes, fresh sweet basil, aged Modena balsamic glaze.',
        price: 11.0,
        imageUrl: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=500&auto=format&fit=crop&q=80',
        isAvailable: true,
      },
      {
        categoryId: categories[1]._id,
        name: 'Prime Ribeye Steak (12oz)',
        description: 'Pan-seared USDA Prime ribeye, rosemary herb butter, charred asparagus, truffle mashed potato.',
        price: 36.0,
        imageUrl: 'https://images.unsplash.com/photo-1558030006-450675393462?w=500&auto=format&fit=crop&q=80',
        isAvailable: true,
      },
      {
        categoryId: categories[1]._id,
        name: 'Pan-Roasted Atlantic Salmon',
        description: 'Crispy skin salmon filet, lemon dill velouté, asparagus spears, wild rice pilaf.',
        price: 28.5,
        imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&auto=format&fit=crop&q=80',
        isAvailable: true,
      },
      {
        categoryId: categories[2]._id,
        name: 'Neapolitan Margherita Pizza',
        description: 'San Marzano tomato DOP, fior di latte mozzarella, fresh organic basil, extra virgin olive oil.',
        price: 18.0,
        imageUrl: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=500&auto=format&fit=crop&q=80',
        isAvailable: true,
      },
      {
        categoryId: categories[2]._id,
        name: 'Truffle Tagliatelle',
        description: 'Handmade fresh egg pasta, wild forest mushrooms, black truffle shavings, 24-month Parmigiano.',
        price: 24.0,
        imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?w=500&auto=format&fit=crop&q=80',
        isAvailable: true,
      },
      {
        categoryId: categories[3]._id,
        name: 'Classic Venetian Tiramisu',
        description: 'Savoiardi ladyfingers soaked in espresso & Marsala, mascarpone cream, Valrhona cocoa dust.',
        price: 9.5,
        imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&auto=format&fit=crop&q=80',
        isAvailable: true,
      },
      {
        categoryId: categories[4]._id,
        name: 'Iced Passionfruit Mint Refresher',
        description: 'Fresh passionfruit puree, sparkling mineral water, crushed mint leaves, lime wedge.',
        price: 6.5,
        imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80',
        isAvailable: true,
      },
    ];

    const createdMenuItems = [];
    for (const item of menuItemsData) {
      const mi = await MenuItem.create({
        restaurantId: restaurant._id,
        ...item,
      });
      createdMenuItems.push(mi);
    }

    // 6. Create Tables with secure random tokens
    const tables = [];
    for (let i = 1; i <= 5; i++) {
      const t = await Table.create({
        restaurantId: restaurant._id,
        number: `Table ${i}`,
        capacity: i <= 2 ? 2 : 4,
        qrToken: generateSecureToken(16),
        isActive: true,
      });
      tables.push(t);
    }

    // 7. Seed Sample Initial Orders
    const sampleOrders = [
      {
        restaurantId: restaurant._id,
        tableId: tables[0]._id,
        tableNumber: tables[0].number,
        orderNumber: '#1001',
        items: [
          {
            menuItemId: createdMenuItems[0]._id,
            name: createdMenuItems[0].name,
            price: createdMenuItems[0].price,
            quantity: 1,
            subtotal: createdMenuItems[0].price,
          },
          {
            menuItemId: createdMenuItems[4]._id,
            name: createdMenuItems[4].name,
            price: createdMenuItems[4].price,
            quantity: 1,
            subtotal: createdMenuItems[4].price,
          },
        ],
        totalAmount: 32.5,
        customerName: 'Alice Johnson',
        customerNote: 'Extra napkins please',
        status: 'pending',
        statusHistory: [
          { previousStatus: null, newStatus: 'pending', timestamp: new Date(), actor: 'Customer' },
        ],
      },
      {
        restaurantId: restaurant._id,
        tableId: tables[1]._id,
        tableNumber: tables[1].number,
        orderNumber: '#1002',
        items: [
          {
            menuItemId: createdMenuItems[2]._id,
            name: createdMenuItems[2].name,
            price: createdMenuItems[2].price,
            quantity: 1,
            subtotal: createdMenuItems[2].price,
          },
          {
            menuItemId: createdMenuItems[7]._id,
            name: createdMenuItems[7].name,
            price: createdMenuItems[7].price,
            quantity: 2,
            subtotal: createdMenuItems[7].price * 2,
          },
        ],
        totalAmount: 49.0,
        customerName: 'Robert Smith',
        customerNote: 'Medium rare steak',
        status: 'preparing',
        statusHistory: [
          { previousStatus: null, newStatus: 'pending', timestamp: new Date(Date.now() - 15 * 60000), actor: 'Customer' },
          { previousStatus: 'pending', newStatus: 'accepted', timestamp: new Date(Date.now() - 12 * 60000), actor: 'Owner' },
          { previousStatus: 'accepted', newStatus: 'preparing', timestamp: new Date(Date.now() - 8 * 60000), actor: 'Owner' },
        ],
      },
      {
        restaurantId: restaurant._id,
        tableId: tables[2]._id,
        tableNumber: tables[2].number,
        orderNumber: '#1003',
        items: [
          {
            menuItemId: createdMenuItems[5]._id,
            name: createdMenuItems[5].name,
            price: createdMenuItems[5].price,
            quantity: 2,
            subtotal: createdMenuItems[5].price * 2,
          },
          {
            menuItemId: createdMenuItems[6]._id,
            name: createdMenuItems[6].name,
            price: createdMenuItems[6].price,
            quantity: 2,
            subtotal: createdMenuItems[6].price * 2,
          },
        ],
        totalAmount: 67.0,
        customerName: 'Elena Rostova',
        customerNote: 'Anniversary celebration',
        status: 'completed',
        statusHistory: [
          { previousStatus: null, newStatus: 'pending', timestamp: new Date(Date.now() - 60 * 60000), actor: 'Customer' },
          { previousStatus: 'pending', newStatus: 'accepted', timestamp: new Date(Date.now() - 55 * 60000), actor: 'Owner' },
          { previousStatus: 'accepted', newStatus: 'preparing', timestamp: new Date(Date.now() - 40 * 60000), actor: 'Owner' },
          { previousStatus: 'preparing', newStatus: 'ready', timestamp: new Date(Date.now() - 20 * 60000), actor: 'Owner' },
          { previousStatus: 'ready', newStatus: 'completed', timestamp: new Date(Date.now() - 5 * 60000), actor: 'Owner' },
        ],
      },
    ];

    for (const orderData of sampleOrders) {
      await Order.create(orderData);
    }

    console.log('Seed: Database seeded successfully with Admin, Demo Owner, Grand Bistro restaurant, Menu, Tables, and Orders.');
  } catch (error) {
    console.error('Seed error:', error);
  }
};

module.exports = seedInitialData;
