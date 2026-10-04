import React, { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Search,
  Filter,
  CheckCircle2,
  Ban,
  Trash2,
  ExternalLink,
  DollarSign,
  ShoppingBag,
  User,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import adminService from '../../services/adminService';
import ConfirmModal from '../../components/ui/ConfirmModal';
import Spinner from '../../components/ui/Spinner';

const AdminRestaurantsPage = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRestaurants = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminService.getRestaurants(search, statusFilter);
      if (res.success || Array.isArray(res.data) || Array.isArray(res)) {
        setRestaurants(res.data || (Array.isArray(res) ? res : []));
      }
    } catch (err) {
      toast.error('Failed to load restaurants.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRestaurants();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchRestaurants]);

  const handleOpenStatusModal = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setIsStatusModalOpen(true);
  };

  const handleOpenDeleteModal = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setIsDeleteModalOpen(true);
  };

  const handleToggleStatus = async () => {
    if (!selectedRestaurant) return;
    const newStatus = selectedRestaurant.status === 'active' ? 'suspended' : 'active';
    const restId = selectedRestaurant._id || selectedRestaurant.id;

    setActionLoading(true);
    try {
      const res = await adminService.updateRestaurantStatus(restId, newStatus);
      if (res.success) {
        toast.success(`Restaurant is now ${newStatus}`);
        setRestaurants((prev) =>
          prev.map((r) => ((r._id || r.id) === restId ? { ...r, status: newStatus } : r))
        );
        setIsStatusModalOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update restaurant status');
    } finally {
      setActionLoading(false);
      setSelectedRestaurant(null);
    }
  };

  const handleDeleteRestaurant = async () => {
    if (!selectedRestaurant) return;
    const restId = selectedRestaurant._id || selectedRestaurant.id;

    setActionLoading(true);
    try {
      const res = await adminService.deleteRestaurant(restId);
      if (res.success) {
        toast.success('Restaurant soft-deleted successfully');
        setRestaurants((prev) => prev.filter((r) => (r._id || r.id) !== restId));
        setIsDeleteModalOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete restaurant');
    } finally {
      setActionLoading(false);
      setSelectedRestaurant(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Tenant Restaurants</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage all tenant restaurants on the MenuFlow platform.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Restaurants Table */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Spinner size="lg" className="text-purple-600" />
            <p className="text-sm text-gray-500 mt-4">Loading restaurants...</p>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Store className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-base font-bold text-gray-700 dark:text-gray-300">No restaurants found</p>
            <p className="text-xs text-gray-500 mt-1">Try adjusting your search query or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-900/50 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Restaurant</th>
                  <th className="py-4 px-6">Owner</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Joined</th>
                  <th className="py-4 px-6 text-right">Orders</th>
                  <th className="py-4 px-6 text-right">Revenue</th>
                  <th className="py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                {restaurants.map((rest) => {
                  const restId = rest._id || rest.id;
                  const isActive = rest.status === 'active';

                  return (
                    <tr key={restId} className="hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors">
                      {/* Restaurant Info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {rest.logoUrl ? (
                            <img
                              src={rest.logoUrl}
                              alt={rest.name}
                              className="w-10 h-10 rounded-2xl object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
                              {rest.name?.charAt(0) || 'R'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                              <span>{rest.name}</span>
                            </div>
                            <span className="text-xs text-gray-400 font-mono">/{rest.slug}</span>
                          </div>
                        </div>
                      </td>

                      {/* Owner Details */}
                      <td className="py-4 px-6">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">
                          {rest.owner?.name || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-400">{rest.owner?.email || 'N/A'}</p>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          {rest.status.toUpperCase()}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="py-4 px-6 text-xs text-gray-500">
                        {formatDate(rest.createdAt)}
                      </td>

                      {/* Total Orders */}
                      <td className="py-4 px-6 text-right font-bold text-gray-800 dark:text-gray-200">
                        {rest.totalOrders || 0}
                      </td>

                      {/* Total Revenue (Completed Only) */}
                      <td className="py-4 px-6 text-right font-black text-emerald-600 dark:text-emerald-400">
                        ${Number(rest.totalRevenue || 0).toFixed(2)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Suspend / Reactivate */}
                          <button
                            onClick={() => handleOpenStatusModal(rest)}
                            title={isActive ? 'Suspend Restaurant' : 'Reactivate Restaurant'}
                            className={`p-2 rounded-xl transition-colors ${
                              isActive
                                ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                          >
                            {isActive ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>

                          {/* Soft Delete */}
                          <button
                            onClick={() => handleOpenDeleteModal(rest)}
                            title="Soft Delete Restaurant"
                            className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Suspend / Reactivate Confirm Modal */}
      <ConfirmModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={handleToggleStatus}
        title={selectedRestaurant?.status === 'active' ? 'Suspend Restaurant' : 'Reactivate Restaurant'}
        message={
          selectedRestaurant?.status === 'active'
            ? `Are you sure you want to suspend "${selectedRestaurant?.name}"? Its public QR menus will immediately stop taking orders, and the owner session will be blocked.`
            : `Reactivate "${selectedRestaurant?.name}" and restore normal ordering operations?`
        }
        confirmText={selectedRestaurant?.status === 'active' ? 'Yes, Suspend' : 'Yes, Reactivate'}
        type={selectedRestaurant?.status === 'active' ? 'danger' : 'primary'}
        loading={actionLoading}
      />

      {/* Soft Delete Confirm Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteRestaurant}
        title="Soft-Delete Restaurant"
        message={`Are you sure you want to delete "${selectedRestaurant?.name}"? It will be deactivated and hidden from public access.`}
        confirmText="Yes, Soft-Delete"
        type="danger"
        loading={actionLoading}
      />
    </div>
  );
};

export default AdminRestaurantsPage;
