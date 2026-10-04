import React, { useState, useEffect, useRef } from 'react';
import { Plus, QrCode, Download, Trash2, LayoutGrid, RefreshCw, Printer, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import QRCode from 'qrcode';
import tableService from '../../services/tableService';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/ui/Modal';
import ConfirmModal from '../../components/ui/ConfirmModal';
import FormInput from '../../components/ui/FormInput';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import Spinner from '../../components/ui/Spinner';

const TablesPage = () => {
  const { restaurant, user } = useAuth();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);

  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [selectedTable, setSelectedTable] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [targetPublicUrl, setTargetPublicUrl] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [regeneratingTable, setRegeneratingTable] = useState(null);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const qrPrintRef = useRef(null);

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

  const handleOpenRegenerateModal = (table) => {
    setRegeneratingTable(table);
    setIsRegenerateModalOpen(true);
  };

  const handleShowQrCode = async (table) => {
    setSelectedTable(table);
    try {
      const slug = restaurant?.slug || user?.restaurantSlug || 'restaurant';
      const token = table.qrToken || table._id;
      const fullUrl = `${window.location.origin}/r/${slug}/t/${token}`;
      setTargetPublicUrl(fullUrl);

      const url = await QRCode.toDataURL(fullUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });
      setQrCodeUrl(url);
      setIsQrModalOpen(true);
    } catch (err) {
      toast.error('Failed to generate QR Code preview.');
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
        toast.success('Table added with unique QR token!');
        fetchTables();
        setIsAddModalOpen(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create table');
      toast.error(err.response?.data?.message || 'Failed to create table');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTable = async () => {
    if (!deletingId) return;
    setSubmitting(true);
    try {
      await tableService.delete(deletingId);
      toast.success('Table deleted successfully');
      setTables((prev) => prev.filter((t) => (t._id || t.id) !== deletingId));
      setIsDeleteModalOpen(false);
    } catch (err) {
      toast.error('Failed to delete table');
    } finally {
      setSubmitting(false);
      setDeletingId(null);
    }
  };

  const handleConfirmRegenerate = async () => {
    if (!regeneratingTable) return;
    const tableId = regeneratingTable._id || regeneratingTable.id;
    setSubmitting(true);
    try {
      const res = await tableService.regenerateQr(tableId);
      if (res.success && res.table) {
        toast.success('QR Code regenerated! Previous token invalidated.');
        setTables((prev) =>
          prev.map((t) => ((t._id || t.id) === tableId ? res.table : t))
        );
        setIsRegenerateModalOpen(false);
        if (selectedTable && (selectedTable._id || selectedTable.id) === tableId) {
          handleShowQrCode(res.table);
        }
      }
    } catch (err) {
      toast.error('Failed to regenerate QR code');
    } finally {
      setSubmitting(false);
      setRegeneratingTable(null);
    }
  };

  const handleDownloadQr = () => {
    if (!qrCodeUrl || !selectedTable) return;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `QR-${selectedTable.number.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code downloaded as PNG!');
  };

  const handlePrintQr = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR - ${selectedTable?.number}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { text-align: center; border: 2px solid #000; padding: 30px; border-radius: 20px; }
            h1 { margin: 0 0 10px 0; font-size: 28px; }
            p { margin: 5px 0 20px 0; font-size: 16px; color: #555; }
            img { width: 300px; height: 300px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${restaurant?.name || 'Restaurant'}</h1>
            <p>Scan to view digital menu & order</p>
            <img src="${qrCodeUrl}" />
            <h2>${selectedTable?.number}</h2>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Tables & QR Codes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Generate and manage contactless QR codes for your dining tables.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl font-bold text-sm shadow-md shadow-brand-500/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Table</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full rounded-2xl" />
            </div>
          ))}
        </div>
      ) : tables.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-8">
          <EmptyState
            icon={LayoutGrid}
            title="No tables created yet"
            description="Add your restaurant tables to generate secure table QR codes."
            actionLabel="Add Table"
            onAction={handleOpenAddModal}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map((table) => {
            const tableId = table._id || table.id;
            const slug = restaurant?.slug || user?.restaurantSlug || 'restaurant';
            const publicUrl = `/r/${slug}/t/${table.qrToken || tableId}`;

            return (
              <div
                key={tableId}
                className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
                        {table.number}
                      </h3>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">
                        Capacity: {table.capacity} Guests
                      </p>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
                      <QrCode className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700 text-xs text-gray-500 flex items-center justify-between">
                    <span className="font-mono truncate mr-2">{table.qrToken?.substring(0, 16)}...</span>
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 dark:text-brand-400 font-bold hover:underline flex items-center gap-1 shrink-0"
                    >
                      <span>Test Menu</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleShowQrCode(table)}
                    className="flex-1 py-2.5 px-3 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950 dark:hover:bg-brand-900 text-brand-700 dark:text-brand-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>View QR Code</span>
                  </button>

                  <button
                    onClick={() => handleOpenRegenerateModal(table)}
                    title="Regenerate QR Token (Invalidates old QR)"
                    className="p-2.5 text-gray-500 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleOpenDeleteModal(tableId)}
                    title="Delete Table"
                    className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
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
            label="Table Number or Name"
            placeholder="e.g. Table 1, Patio 4, Booth A"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            error={error}
            required
          />

          <FormInput
            label="Seating Capacity"
            type="number"
            min="1"
            max="50"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-bold shadow-md shadow-brand-500/20 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Table'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View QR Code Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title={`QR Code: ${selectedTable?.number}`}
      >
        <div className="flex flex-col items-center space-y-4 p-2 text-center">
          <div className="p-4 bg-white rounded-3xl border border-gray-200 shadow-inner">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="Table QR Code" className="w-64 h-64 object-contain" />
            ) : (
              <Spinner size="lg" />
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Customers scan this code on their mobile phones to order at <span className="font-bold text-gray-800 dark:text-gray-200">{selectedTable?.number}</span>
            </p>
            <p className="text-[11px] text-gray-400 mt-1 font-mono break-all">{targetPublicUrl}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full pt-2">
            <button
              onClick={handleDownloadQr}
              className="py-3 px-4 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-2xl shadow-md shadow-brand-500/20 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download PNG</span>
            </button>
            <button
              onClick={handlePrintQr}
              className="py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold text-xs rounded-2xl flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Table Card</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteTable}
        title="Delete Dining Table"
        message="Are you sure you want to delete this table? Its QR code will no longer work."
        confirmText="Delete Table"
        type="danger"
        loading={submitting}
      />

      {/* Regenerate Confirmation Modal */}
      <ConfirmModal
        isOpen={isRegenerateModalOpen}
        onClose={() => setIsRegenerateModalOpen(false)}
        onConfirm={handleConfirmRegenerate}
        title="Regenerate QR Code"
        message="Regenerating the QR code will generate a new security token. Any previously printed QR codes for this table will stop working immediately."
        confirmText="Yes, Regenerate QR"
        type="warning"
        loading={submitting}
      />
    </div>
  );
};

export default TablesPage;