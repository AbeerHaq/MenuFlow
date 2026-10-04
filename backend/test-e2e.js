const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let passed = 0;
let failed = 0;

const assert = (condition, testName) => {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
};

const runTests = async () => {
  console.log('\n=============================================');
  console.log('🚀 RUNNING MENUFLOW FULL END-TO-END SUITE');
  console.log('=============================================\n');

  try {
    // 1. AUTHENTICATION TESTS
    console.log('📋 1. AUTHENTICATION & ROLES');
    const ownerLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'owner@menuflow.com',
      password: 'password123',
    });
    assert(ownerLoginRes.data.success && ownerLoginRes.data.token, 'Owner Login generates valid JWT');
    const ownerToken = ownerLoginRes.data.token;
    const ownerHeaders = { headers: { Authorization: `Bearer ${ownerToken}` } };

    const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@menuflow.com',
      password: 'admin123',
    });
    assert(adminLoginRes.data.success && adminLoginRes.data.user.role === 'admin', 'Admin Login identifies admin role');
    const adminToken = adminLoginRes.data.token;
    const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

    // 2. TABLE & QR CODE TESTS
    console.log('\n📋 2. TABLES & QR CODE SECURITY');
    const tablesRes = await axios.get(`${BASE_URL}/owner/tables`, ownerHeaders);
    assert(tablesRes.data.tables.length >= 1, 'Owner can fetch dining tables');
    const firstTable = tablesRes.data.tables[0];
    const originalToken = firstTable.qrToken;
    assert(originalToken && originalToken.length >= 16, 'Table QR token is secure random string');

    // Test QR Regeneration
    const regenRes = await axios.post(`${BASE_URL}/owner/tables/${firstTable._id}/regenerate-qr`, {}, ownerHeaders);
    assert(regenRes.data.table.qrToken !== originalToken, 'Regenerating QR code creates a brand new token');
    const activeToken = regenRes.data.table.qrToken;

    // 3. PUBLIC MENU & QR RESOLUTION
    console.log('\n📋 3. PUBLIC QR MENU FLOW');
    // Test Old Invalidate Token -> should fail
    try {
      await axios.get(`${BASE_URL}/public/menu/grand-bistro/${originalToken}`);
      assert(false, 'Old invalidated QR token must be rejected');
    } catch (err) {
      assert(err.response?.status === 404, 'Old invalidated QR token returns 404');
    }

    // Test Active QR Token -> should succeed
    const menuRes = await axios.get(`${BASE_URL}/public/menu/grand-bistro/${activeToken}`);
    assert(menuRes.data.success && menuRes.data.restaurant.name === 'The Grand Bistro', 'Active QR token loads public menu');
    assert(menuRes.data.menuItems.length > 0, 'Public menu contains available dishes');

    // 4. SERVER-SIDE PRICING & ORDER CREATION
    console.log('\n📋 4. ORDER INTEGRITY & SERVER PRICING');
    const itemToOrder = menuRes.data.menuItems[0];
    const orderPayload = {
      slug: 'grand-bistro',
      token: activeToken,
      customerName: 'Automated Test Guest',
      customerNote: 'Corner table please',
      items: [
        {
          menuItemId: itemToOrder._id,
          name: itemToOrder.name,
          price: 0.05, // Malicious tampered client price
          quantity: 2,
        },
      ],
    };

    const placeOrderRes = await axios.post(`${BASE_URL}/public/orders`, orderPayload);
    assert(placeOrderRes.data.success && placeOrderRes.data.order, 'Customer places order without login');
    const createdOrder = placeOrderRes.data.order;
    const expectedTotal = Number((Number(itemToOrder.price) * 2).toFixed(2));
    assert(createdOrder.totalAmount === expectedTotal, `Server ignores tampered client price ($0.05) and calculates true DB price ($${expectedTotal})`);
    assert(createdOrder.status === 'pending', 'New order starts in "pending" status');

    // 5. LIVE ORDER LIFECYCLE & STATE MACHINE ENFORCEMENT
    console.log('\n📋 5. ORDER LIFECYCLE TRANSITIONS');
    const orderId = createdOrder._id;

    // Test Invalid Transition: Pending -> Ready (Should be rejected with 400)
    try {
      await axios.patch(`${BASE_URL}/owner/orders/${orderId}/status`, { status: 'ready' }, ownerHeaders);
      assert(false, 'Invalid status transition (pending -> ready) must be rejected');
    } catch (err) {
      assert(err.response?.status === 400, 'Invalid status transition (pending -> ready) correctly rejected with 400');
    }

    // Valid Transition: Pending -> Accepted
    const step1 = await axios.patch(`${BASE_URL}/owner/orders/${orderId}/status`, { status: 'accepted' }, ownerHeaders);
    assert(step1.data.order.status === 'accepted', 'Pending -> Accepted transition succeeds');

    // Valid Transition: Accepted -> Preparing
    const step2 = await axios.patch(`${BASE_URL}/owner/orders/${orderId}/status`, { status: 'preparing' }, ownerHeaders);
    assert(step2.data.order.status === 'preparing', 'Accepted -> Preparing transition succeeds');

    // Valid Transition: Preparing -> Ready
    const step3 = await axios.patch(`${BASE_URL}/owner/orders/${orderId}/status`, { status: 'ready' }, ownerHeaders);
    assert(step3.data.order.status === 'ready', 'Preparing -> Ready transition succeeds');

    // Valid Transition: Ready -> Completed
    const step4 = await axios.patch(`${BASE_URL}/owner/orders/${orderId}/status`, { status: 'completed' }, ownerHeaders);
    assert(step4.data.order.status === 'completed', 'Ready -> Completed transition succeeds');

    // Verify Customer Order Tracking
    const trackingRes = await axios.get(`${BASE_URL}/public/orders/${orderId}`);
    assert(trackingRes.data.order.status === 'completed', 'Customer order tracking reflects live status');
    assert(trackingRes.data.order.statusHistory.length >= 4, 'Status history records all transitions with actor & timestamp');

    // 6. REJECTION FLOW TEST
    console.log('\n📋 6. ORDER REJECTION FLOW');
    const rejectOrderPayload = {
      slug: 'grand-bistro',
      token: activeToken,
      customerName: 'Reject Tester',
      items: [{ menuItemId: itemToOrder._id, name: itemToOrder.name, price: itemToOrder.price, quantity: 1 }],
    };
    const rejectOrderRes = await axios.post(`${BASE_URL}/public/orders`, rejectOrderPayload);
    const rejectOrderId = rejectOrderRes.data.order._id;
    const rejectAction = await axios.patch(`${BASE_URL}/owner/orders/${rejectOrderId}/status`, { status: 'rejected' }, ownerHeaders);
    assert(rejectAction.data.order.status === 'rejected', 'Pending -> Rejected transition succeeds');

    // 7. MULTI-TENANT ISOLATION & SECURITY
    console.log('\n📋 7. MULTI-TENANT ISOLATION');
    const ownerBRegister = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Owner B',
      email: `ownerb_${Date.now()}@test.com`,
      password: 'password123',
      restaurantName: 'Restaurant Bravo',
    });
    const ownerBHeaders = { headers: { Authorization: `Bearer ${ownerBRegister.data.token}` } };
    const ownerBOrders = await axios.get(`${BASE_URL}/owner/orders`, ownerBHeaders);
    assert(ownerBOrders.data.orders.length === 0, "Owner B cannot see Owner A's orders");

    // 8. ADMIN MANAGEMENT & REVENUE ANALYTICS
    console.log('\n📋 8. ADMIN MODERATION & ANALYTICS');
    const adminRestaurants = await axios.get(`${BASE_URL}/admin/restaurants`, adminHeaders);
    assert(adminRestaurants.data.restaurants.length >= 2, 'Admin can view all platform tenant restaurants');
    
    // Suspend Restaurant
    const grandBistro = adminRestaurants.data.restaurants.find((r) => r.slug === 'grand-bistro');
    await axios.patch(`${BASE_URL}/admin/restaurants/${grandBistro._id}/status`, { status: 'suspended' }, adminHeaders);
    try {
      await axios.get(`${BASE_URL}/public/menu/grand-bistro/${activeToken}`);
      assert(false, 'Suspended restaurant menu should not be accessible');
    } catch (err) {
      assert(err.response?.status === 403, 'Suspended restaurant menu blocked with 403');
    }

    // Reactivate Restaurant
    await axios.patch(`${BASE_URL}/admin/restaurants/${grandBistro._id}/status`, { status: 'active' }, adminHeaders);
    const reactivatedMenu = await axios.get(`${BASE_URL}/public/menu/grand-bistro/${activeToken}`);
    assert(reactivatedMenu.data.success, 'Reactivated restaurant menu is accessible again');

    // Platform Revenue Analytics (Completed orders only)
    const analytics = await axios.get(`${BASE_URL}/admin/analytics/revenue`, adminHeaders);
    assert(analytics.data.data.platformRevenue > 0, 'Platform analytics calculates revenue from completed orders');
    assert(analytics.data.data.topRestaurants.length > 0, 'Platform analytics ranks top-performing restaurants');

    console.log('\n=============================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=============================================\n');

    process.exit(failed === 0 ? 0 : 1);
  } catch (error) {
    console.error('Test execution error:', error.message, error.response?.data);
    process.exit(1);
  }
};

runTests();
