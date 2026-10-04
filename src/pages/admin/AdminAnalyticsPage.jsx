import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Store,
  ShoppingBag,
  Calendar,
  Award,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { toast } from 'react-hot-toast';
import adminService from '../../services/adminService';
import Spinner from '../../components/ui/Spinner';

const AdminAnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await adminService.getRevenueAnalytics(days);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load platform analytics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Spinner size="lg" className="text-purple-600" />
        <p className="text-sm font-medium text-gray-500 mt-4">Loading platform analytics...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Platform Revenue',
      subtitle: 'Completed Orders Only',
      value: `$${(data?.platformRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      title: 'Completed Orders',
      subtitle: `${data?.totalOrders || 0} Total Orders`,
      value: (data?.completedOrders || 0).toLocaleString(),
      icon: ShoppingBag,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
    },
    {
      title: 'Active Restaurants',
      subtitle: `${data?.totalRestaurants || 0} Registered Tenants`,
      value: data?.activeRestaurants || 0,
      icon: Store,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/40',
    },
    {
      title: 'Avg Order Value',
      subtitle: 'Across Platform',
      value: `$${(
        data?.completedOrders ? (data.platformRevenue / data.completedOrders) : 0
      ).toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
    },
  ];

  const chartData = data?.revenueOverTime || [];
  const topRestaurants = data?.topRestaurants || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Platform Revenue & Analytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Global metrics, completed order revenues, and top tenant performance.
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          {[
            { label: '7 Days', val: 7 },
            { label: '30 Days', val: 30 },
            { label: '90 Days', val: 90 },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => setDays(item.val)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                days === item.val
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between"
            >
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {card.title}
                </p>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{card.value}</p>
                <p className="text-[11px] font-semibold text-gray-400">{card.subtitle}</p>
              </div>
              <div className={`p-3 rounded-2xl ${card.bg} ${card.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue Over Time Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Platform Revenue Over Time</h2>
            <p className="text-xs text-gray-400 mt-0.5">Calculated from Completed orders only</p>
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          {chartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs font-semibold">
              <TrendingUp className="w-8 h-8 mb-2 opacity-30" />
              <span>No completed order revenue data for selected period</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip
                  formatter={(val) => [`$${Number(val).toFixed(2)}`, 'Revenue']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#9333ea"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Performing Restaurants Leaderboard */}
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Top Performing Restaurants</h2>
        </div>

        {topRestaurants.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center">No restaurant revenue records yet.</p>
        ) : (
          <div className="space-y-3">
            {topRestaurants.map((item, idx) => (
              <div
                key={item._id}
                className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700/60 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                      idx === 0
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : idx === 1
                        ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        : idx === 2
                        ? 'bg-amber-800/10 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">{item.name}</h3>
                    <p className="text-xs text-gray-400 font-mono">/{item.slug} • {item.ordersCount} Completed Orders</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    ${Number(item.revenue).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
