import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Clock, DollarSign, Calendar, ArrowRight, UtensilsCrossed, QrCode, Store, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import restaurantService from '../../services/restaurantService';
import orderService from '../../services/orderService';
import Skeleton from '../../components/ui/Skeleton';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, ordersRes] = await Promise.all([
        restaurantService.getDashboardStats(),
        orderService.getAll('active'),
      ]);

      if (statsRes.success || statsRes.data) {
        setStats(statsRes.data || statsRes);
      }
      if (ordersRes.success || Array.isArray(ordersRes.data) || Array.isArray(ordersRes)) {
        const list = ordersRes.data || (Array.isArray(ordersRes) ? ordersRes : []);
        setRecentOrders(list.slice(0, 5));
      }
    } catch (err) {
      toast.error('Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Today's Orders",
      value: stats?.todayOrders ?? 0,
      icon: ShoppingBag,
      color: 'bg-blue-500',
      lightBg: 'bg-blue-50 dark:bg-blue-950/40',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Pending Orders',
      value: stats?.pendingOrders ?? 0,
      icon: Clock,
      color: 'bg-amber-500',
      lightBg: 'bg-amber-50 dark:bg-amber-950/40',
      textColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      title: "Today's Revenue",
      value: `$${(stats?.todayRevenue ?? 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-emerald-500',
      lightBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      textColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Monthly Orders',
      value: stats?.monthlyOrders ?? 0,
      icon: Calendar,
      color: 'bg-purple-500',
      lightBg: 'bg-purple-50 dark:bg-purple-950/40',
      textColor: 'text-purple-600 dark:text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monitor restaurant performance, revenue, and active table orders.
          </p>
        </div>

        <Link
          to="/dashboard/orders"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-2xl shadow-md shadow-brand-500/20 transition-all active:scale-95"
        >
          <span>Open Live Kitchen Board</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-10 rounded-2xl" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))
          : statCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {card.title}
                    </p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">
                      {card.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-2xl ${card.lightBg} ${card.textColor}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              );
            })}
      </div>

      {/* Quick Access Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/dashboard/orders"
          className="p-5 bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-3xl shadow-lg shadow-brand-500/20 hover:scale-[1.02] transition-all space-y-2 block"
        >
          <div className="flex items-center justify-between">
            <ShoppingBag className="w-6 h-6" />
            <ChevronRight className="w-5 h-5 opacity-70" />
          </div>
          <h3 className="font-bold text-lg">Live Order Board</h3>
          <p className="text-xs text-brand-100">View and advance incoming orders through the 5-stage pipeline.</p>
        </Link>

        <Link
          to="/dashboard/menu"
          className="p-5 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow space-y-2 block"
        >
          <div className="flex items-center justify-between text-indigo-500">
            <UtensilsCrossed className="w-6 h-6" />
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Menu & Categories</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Manage dishes, pricing, photos, and live availability toggle.</p>
        </Link>

        <Link
          to="/dashboard/tables"
          className="p-5 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow space-y-2 block"
        >
          <div className="flex items-center justify-between text-purple-500">
            <QrCode className="w-6 h-6" />
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Tables & QR Codes</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Generate secure random QR codes, download PNGs, and print table cards.</p>
        </Link>
      </div>

      {/* Active Orders List */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Active Table Orders</h2>
            <p className="text-xs text-gray-400">Pending, Accepted, Preparing, and Ready orders</p>
          </div>
          <Link
            to="/dashboard/orders"
            className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            <span>View All Live</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-xs font-medium">
            No active orders at this moment. New orders will appear here automatically.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {recentOrders.map((order) => {
              const orderId = order._id || order.id;
              return (
                <div key={orderId} className="py-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-gray-900 dark:text-white">{order.orderNumber}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                      {order.tableNumber}
                    </span>
                    <span className="text-xs text-gray-500 hidden sm:inline">{order.customerName || 'Guest'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {order.status}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">${Number(order.totalAmount).toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;