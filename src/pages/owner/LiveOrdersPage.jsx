import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  BellRing,
  CheckCheck,
  XCircle,
  Volume2,
  VolumeX,
  RotateCw,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import orderService from '../../services/orderService';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useAudioAlert } from '../../hooks/useAudioAlert';
import Spinner from '../../components/ui/Spinner';
import ConfirmModal from '../../components/ui/ConfirmModal';

const COLUMNS = [
  { key: 'pending', label: 'Pending', icon: Clock, color: 'bg-amber-500', badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  { key: 'accepted', label: 'Accepted', icon: CheckCircle2, color: 'bg-blue-500', badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
  { key: 'preparing', label: 'Preparing', icon: ChefHat, color: 'bg-indigo-500', badgeBg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
  { key: 'ready', label: 'Ready', icon: BellRing, color: 'bg-purple-500', badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
  { key: 'completed', label: 'Completed', icon: CheckCheck, color: 'bg-emerald-500', badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
];

const LiveOrdersPage = () => {
  const { user, restaurant } = useAuth();
  const { socket, isConnected, joinRestaurant } = useSocket();
  const { soundEnabled, toggleSound, playAlert } = useAudioAlert();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // For mobile tab switching
  const [rejectingOrderId, setRejectingOrderId] = useState(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const restaurantId = user?.restaurantId || restaurant?._id;

  // Initial orders fetch
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await orderService.getAll();
      if (res.success || Array.isArray(res.data) || Array.isArray(res)) {
        setOrders(res.data || (Array.isArray(res) ? res : []));
      }
    } catch (err) {
      toast.error('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Join restaurant socket room
  useEffect(() => {
    if (restaurantId) {
      joinRestaurant(restaurantId);
    }
  }, [restaurantId, isConnected]);

  // Socket.io Real-time event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewOrder = (data) => {
      if (data.order) {
        setOrders((prev) => {
          // Avoid duplicate
          const exists = prev.some((o) => (o._id || o.id) === (data.order._id || data.order.id));
          if (exists) return prev;
          return [data.order, ...prev];
        });

        playAlert();
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-white dark:bg-gray-800 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 p-4 border border-brand-500`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-brand-500 text-white rounded-xl">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    New Order Received! ({data.order.orderNumber})
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {data.order.tableNumber} • {data.order.items?.length || 1} items • ${Number(data.order.totalAmount).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ),
          { duration: 5000 }
        );
      }
    };

    const handleOrderUpdated = (data) => {
      if (data.order) {
        setOrders((prev) =>
          prev.map((o) => ((o._id || o.id) === (data.order._id || data.order.id) ? data.order : o))
        );
      }
    };

    socket.on('order:new', handleNewOrder);
    socket.on('order:updated', handleOrderUpdated);

    return () => {
      socket.off('order:new', handleNewOrder);
      socket.off('order:updated', handleOrderUpdated);
    };
  }, [socket, playAlert]);

  // Handle Order Status Transitions
  const handleTransition = async (orderId, nextStatus) => {
    try {
      setActionLoadingId(orderId);
      const res = await orderService.updateStatus(orderId, nextStatus);
      if (res.success && res.order) {
        setOrders((prev) =>
          prev.map((o) => ((o._id || o.id) === orderId ? res.order : o))
        );
        toast.success(`Order advanced to ${nextStatus.toUpperCase()}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenReject = (orderId) => {
    setRejectingOrderId(orderId);
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingOrderId) return;
    await handleTransition(rejectingOrderId, 'rejected');
    setIsRejectModalOpen(false);
    setRejectingOrderId(null);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Live Kitchen Orders</h1>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                isConnected
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {isConnected ? 'Real-time Live' : 'Connecting...'}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time multi-tenant order pipeline. Actions strictly enforce order lifecycle progression.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Notification Switch */}
          <button
            onClick={toggleSound}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all ${
              soundEnabled
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-brand-500" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
            <span>Sound {soundEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={fetchOrders}
            className="p-2 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition-colors"
            title="Refresh Orders"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-brand-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
          }`}
        >
          All Columns
        </button>
        {COLUMNS.map((col) => {
          const count = orders.filter((o) => o.status === col.key).length;
          return (
            <button
              key={col.key}
              onClick={() => setActiveTab(col.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === col.key
                  ? 'bg-brand-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <span>{col.label}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/10 font-black">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 5-Column Live Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {COLUMNS.map((column) => {
          if (activeTab !== 'all' && activeTab !== column.key) return null;

          const columnOrders = orders.filter((o) => o.status === column.key);
          const Icon = column.icon;

          return (
            <div
              key={column.key}
              className="bg-gray-100/70 dark:bg-gray-800/40 rounded-3xl p-3 flex flex-col min-h-[500px] border border-gray-200/60 dark:border-gray-700/60"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between p-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-xl ${column.badgeBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">{column.label}</h3>
                </div>
                <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                  {columnOrders.length}
                </span>
              </div>

              {/* Order Cards */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {columnOrders.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-gray-400 dark:text-gray-500">
                    <ShoppingBag className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-xs font-medium">No {column.label.toLowerCase()} orders</p>
                  </div>
                ) : (
                  columnOrders.map((order) => {
                    const orderId = order._id || order.id;
                    const isActing = actionLoadingId === orderId;

                    return (
                      <div
                        key={orderId}
                        className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow space-y-3"
                      >
                        {/* Order Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-gray-900 dark:text-white">
                                {order.orderNumber}
                              </span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                                {order.tableNumber}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {order.customerName || 'Guest'} • {formatTime(order.createdAt)}
                            </p>
                          </div>
                          <span className="font-black text-sm text-gray-900 dark:text-white">
                            ${Number(order.totalAmount).toFixed(2)}
                          </span>
                        </div>

                        {/* Order Items Snapshot */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-2.5 space-y-1.5 text-xs">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-gray-700 dark:text-gray-300">
                              <span className="font-medium truncate">
                                <span className="font-bold text-brand-600 dark:text-brand-400 mr-1">
                                  {item.quantity}x
                                </span>
                                {item.name}
                              </span>
                              <span className="font-semibold text-gray-500 shrink-0">
                                ${Number(item.subtotal || item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Customer Note */}
                        {order.customerNote && (
                          <div className="text-[11px] p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60 flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span className="italic line-clamp-2">{order.customerNote}</span>
                          </div>
                        )}

                        {/* Action Buttons strictly bound to valid PRD transitions */}
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60">
                          {order.status === 'pending' && (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleOpenReject(orderId)}
                                disabled={isActing}
                                className="py-2 px-3 rounded-xl text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleTransition(orderId, 'accepted')}
                                disabled={isActing}
                                className="py-2 px-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50"
                              >
                                {isActing ? 'Accepting...' : 'Accept Order'}
                              </button>
                            </div>
                          )}

                          {order.status === 'accepted' && (
                            <button
                              onClick={() => handleTransition(orderId, 'preparing')}
                              disabled={isActing}
                              className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <ChefHat className="w-3.5 h-3.5" />
                              <span>{isActing ? 'Updating...' : 'Start Preparing'}</span>
                            </button>
                          )}

                          {order.status === 'preparing' && (
                            <button
                              onClick={() => handleTransition(orderId, 'ready')}
                              disabled={isActing}
                              className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <BellRing className="w-3.5 h-3.5" />
                              <span>{isActing ? 'Updating...' : 'Mark Ready to Serve'}</span>
                            </button>
                          )}

                          {order.status === 'ready' && (
                            <button
                              onClick={() => handleTransition(orderId, 'completed')}
                              disabled={isActing}
                              className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>{isActing ? 'Updating...' : 'Complete Order'}</span>
                            </button>
                          )}

                          {order.status === 'completed' && (
                            <div className="text-center py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                              <CheckCheck className="w-4 h-4" />
                              <span>Completed & Paid</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm Reject Modal */}
      <ConfirmModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={handleConfirmReject}
        title="Reject Customer Order"
        message="Are you sure you want to reject this order? The customer will receive immediate live notification on their tracking screen."
        confirmText="Yes, Reject Order"
        type="danger"
      />
    </div>
  );
};

export default LiveOrdersPage;
