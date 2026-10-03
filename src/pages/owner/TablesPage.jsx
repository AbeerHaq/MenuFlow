import React, { useState, useEffect, useRef } from 'react';
import { Plus, QrCode, Download, Trash2, LayoutGrid } from 'lucide-react';
import { toast } from 'react-hot-toast';
import QRCode from 'qrcode';
import tableService from '../../services/tableService';
import Modal from '../../components/ui/Modal';
import ConfirmModal from '../../components/ui/ConfirmModal';
import FormInput from '../../components/ui/FormInput';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import Spinner from '../../components/ui/Spinner';

const TablesPage = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [selectedTable, setSelectedTable] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await tableService.getAll();
      if (res.success || Array.isArray(res.data) || Array.isArray(res)) {
        setTables(res.data || (Array.isArray(res) ? res : []));
      }
    } catch (err) {
      toast.error('Failed to load tables.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setTableNumber('');
    setCapacity('4');
    setError('');
    setIsAddModalOpen(true);
  };

  const handleOpenDeleteModal = (id) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  const handleShowQrCode = async (table) => {
    setSelectedTable(table);
    try {
      // The customer view URL embedded inside QR code
      const publicMenuUrl = `${window.location.origin}/menu/${table.qrCode || table._id || table.id}`;
      const url = await QRCode.toDataURL(publicMenuUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      setQrCodeUrl(url);
      setIsQrModalOpen(true);
    } catch (err) {
      toast.error('Failed to generate QR Code.');
    }
  };

  const handleAddTable = async (e) => {
    e.preventDefault();
    if (!tableNumber) {
      setError('Table number/identifier is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await tableService.create({
        number: tableNumber,
        capacity: Number(capacity) || 4,
      });
      if (res.success || res.data) {
        toast.success('Table added successfully!');
        fetchTables();
        setIsAddModalOpen(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create table');
      toast.error('Failed to create table');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTable = async () => {
    if (!deletingId) return;
    setSubmitting(true);
    try {
      await tableService.delete(deletingId);
      toast.success('Table removed successfully.');
      fetchTables();
      setIsDeleteModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete table.');
    } finally {
      setSubmitting(false);
      setDeletingId(null);
    }
  };

  const handleDownloadQr = () => {
    if (!qrCodeUrl || !selectedTable) return;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `Table-${selectedTable.number}-QRCode.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Restaurant Tables</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage seating layouts and download printable QR code tags.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm rounded-xl shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Table</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 space-y-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : tables.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="No Tables Found"
          description="Add your first dining table to generate unique QR codes for customer ordering."
          action={handleOpenAddModal}
          actionLabel="Add Table"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tables.map((table) => {
            const tableId = table._id || table.id;
            return (
              <div
                key={tableId}
                className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between hover:border-brand-500/50 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
                      Table
                    </span>
                    <button
                      onClick={() => handleOpenDeleteModal(tableId)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    #{table.number}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Capacity: {table.capacity || 4} Guests
                  </p>
                </div>

                <button
                  onClick={() => handleShowQrCode(table)}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-500 dark:hover:text-white rounded-lg transition-colors"
                >
                  <QrCode className="w-4 h-4" />
                  <span>View QR Code</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Table Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Dining Table"
      >
        <form onSubmit={handleAddTable} className="space-y-4">
          <FormInput
            label="Table Number / Name"
            type="text"
            placeholder="e.g. 12 or Outdoor-1"
            value={tableNumber}
            onChange={(e) => {
              setTableNumber(e.target.value);
              if (error) setError('');
            }}
            error={error}
          />

          <FormInput
            label="Seating Capacity"
            type="number"
            placeholder="4"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors flex items-center justify-center min-w-[80px]"
            >
              {submitting ? <Spinner size="sm" /> : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title={`Table #${selectedTable?.number} QR Code`}
      >
        <div className="text-center space-y-4 py-2">
          {qrCodeUrl ? (
            <div className="p-4 bg-white rounded-2xl inline-block border border-gray-200 shadow-inner">
              <img src={qrCodeUrl} alt="Table QR Code" className="w-56 h-56 mx-auto" />
            </div>
          ) : (
            <div className="w-56 h-56 mx-auto flex items-center justify-center">
              <Spinner />
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
            Scan with any mobile camera to view digital menu and place instant orders for Table #{selectedTable?.number}.
          </p>

          <button
            onClick={handleDownloadQr}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm rounded-xl shadow transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download PNG</span>
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteTable}
        title="Delete Table"
        message="Are you sure you want to delete this table? The QR code associated with it will no longer function."
        isLoading={submitting}
      />
    </div>
  );
};

export default TablesPage;