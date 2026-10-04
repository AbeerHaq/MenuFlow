import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  BellRing,
  CheckCheck,
  XCircle,
  Utensils,
  ArrowLeft,
  Store,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import publicService from '../../services/publicService';
import { useSocket } from '../../context/SocketContext';
import Spinner from '../../components/ui/Spinner';

const STEPS = [
  { key: 'pending', label: 'Order Placed', desc: 'Sent to restaurant kitchen', icon: Clock },
  { key: 'accepted', label: 'Accepted', desc: 'Kitchen acknowledged order', icon: CheckCircle2 },
  { key: 'preparing', label: 'Preparing', desc: 'Chefs are cooking your meal', icon: ChefHat },
  { key: 'ready', label: 'Ready', desc: 'Food is ready for serving', icon: BellRing },
  { key: 'completed', label: 'Completed', desc: 'Served & enjoy your meal!', icon: CheckCheck },
];

const OrderTrackingPage = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const { socket, joinOrder } = useSocket();

  useEffect(() => {
    if (orderId) {
      fetchOrder();
      joinOrder(orderId);
    }
  }, [orderId]);

  // Real-time socket listener for order status changes
  useEffect(() => {
    if (!socket || !orderId) return;

    const handleOrderUpdate = (data) => {
      if (data.order && (data.order._id === orderId || data.order.id === orderId)) {
        setOrder(data.order);
        toast.success(`Order status updated to: ${data.order.status.toUpperCase()}`, {
          icon: '🔔',
        });
      }
    };

    socket.on('order:updated', handleOrderUpdate);

    return () => {
      socket.off('order:updated', handleOrderUpdate);
    };
  }, [socket, orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await publicService.getOrderById(orderId);
      if (res.success && res.order) {
        setOrder(res.order);
      }
    } catch (err) {
      console.error('Fetch order error:', err);
      toast.error('Unable to fetch order details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4">
        <Spinner size="lg" className="text-brand-500" />
        <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">Loading live order status...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl p-8 text-center space-y-4 border border-gray-100 dark:border-gray-800 shadow-xl">
          <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-950 text-red-500 rounded-2xl flex items-center justify-center">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Order Not Found</h2>
          <p className="text-sm text-gray-500">We could not locate this order. Please verify your order link.</p>
        </div>
      </div>
    );
  }

  const isRejected = order.status === 'rejected';
  const currentStepIndex = STEPS.findIndex((s) => s.key === order.status);
  const currency = order.restaurantId?.currency || '$';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6 px-4 text-gray-900 dark:text-gray-100">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Header Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm text-center relative overflow-hidden">
          <div className="w-12 h-12 bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 rounded-2xl mx-auto flex items-center justify-center mb-3">
            <Utensils className="w-6 h-6" />
          </div>

          <span className="inline-block px-3 py-1 bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-extrabold text-sm rounded-full mb-1">
            Order {order.orderNumber}
          </span>

          <h1 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
            {order.restaurantId?.name || 'Restaurant'}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Table: <span className="font-bold text-gray-800 dark:text-gray-200">{order.tableNumber}</span> • Customer:{' '}
            <span className="font-bold text-gray-800 dark:text-gray-200">{order.customerName || 'Guest'}</span>
          </p>
        </div>

        {/* Live Status Tracker */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
          <h2 className="font-bold text-base text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Live Order Tracking</span>
          </h2>

          {isRejected ? (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 flex items-start gap-3 text-red-700 dark:text-red-300">
              <XCircle className="w-6 h-6 shrink-0 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm">Order Declined</h3>
                <p className="text-xs mt-1 text-red-600 dark:text-red-400">
                  Unfortunately, the restaurant was unable to accept your order. Please speak directly with a server.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800">
              {STEPS.map((step, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;
                const Icon = step.icon;

                return (
                  <div key={step.key} className="relative flex items-start gap-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors ${
                        isPassed
                          ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center justify-between">
                        <h3
                          className={`text-sm font-bold ${
                            isCurrent
                              ? 'text-brand-600 dark:text-brand-400'
                              : isPassed
                              ? 'text-gray-900 dark:text-gray-100'
                              : 'text-gray-400 dark:text-gray-600'
                          }`}
                        >
                          {step.label}
                        </h3>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 animate-pulse">
                            IN PROGRESS
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Order Summary Snapshot */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <h2 className="font-bold text-base text-gray-900 dark:text-white">Order Summary</h2>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {order.items?.map((item, index) => (
              <div key={index} className="py-2.5 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-brand-600 dark:text-brand-400">{item.quantity}x</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{item.name}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">
                  {currency}
                  {Number(item.subtotal || item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {order.customerNote && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl text-xs text-gray-600 dark:text-gray-400">
              <span className="font-bold text-gray-800 dark:text-gray-200">Note: </span>
              {order.customerNote}
            </div>
          )}

          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Total Amount</span>
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {currency}
              {Number(order.totalAmount).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingPage;
