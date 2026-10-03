import React, { useState, useEffect } from 'react';
import { ShoppingBag, Clock, DollarSign, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import restaurantService from '../../services/restaurantService';
import Skeleton from '../../components/ui/Skeleton';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await restaurantService.getDashboardStats();
      if (res.success || res.data) {
        setStats(res.data || res);
      }
    } catch (err) {
      toast.error('Failed to load dashboard statistics.');
      // Mock fallback data for rendering standard structure if endpoint isn't seeded yet
      setStats({
        todayOrders: 0,
        pendingOrders: 0,
        todayRevenue: 0,
        monthlyOrders: 0,
      });
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Monitor your restaurant performance and key metrics today.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3"
              >
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-10 rounded-xl" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))
          : statCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {card.title}
                    </p>
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
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
    </div>
  );
};

export default DashboardPage;