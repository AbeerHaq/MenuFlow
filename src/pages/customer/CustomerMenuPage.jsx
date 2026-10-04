import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  Utensils,
  Plus,
  Minus,
  Trash2,
  X,
  Clock,
  AlertTriangle,
  Store,
  ChevronRight,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import publicService from '../../services/publicService';
import { useCart } from '../../context/CartContext';
import Spinner from '../../components/ui/Spinner';

const CustomerMenuPage = () => {
  const { slug, token } = useParams();
  const navigate = useNavigate();

  const [restaurant, setRestaurant] = useState(null);
  const [tableInfo, setTableInfo] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null); // 'invalid_qr' | 'suspended' | 'error'

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const {
    cart,
    initScope,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    cartTotal,
    cartItemCount,
    customerName,
    setCustomerName,
    customerNote,
    setCustomerNote,
  } = useCart();

  useEffect(() => {
    if (slug && token) {
      initScope(slug, token);
      fetchMenu();
    }
  }, [slug, token]);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      setErrorState(null);
      const res = await publicService.getMenuByQrToken(slug, token);

      if (res.success) {
        setRestaurant(res.restaurant);
        setTableInfo(res.table);
        setCategories(res.categories || []);
        setMenuItems(res.menuItems || []);
      }
    } catch (err) {
      console.error('Fetch menu error:', err);
      if (err.response?.data?.isSuspended) {
        setErrorState('suspended');
      } else if (err.response?.data?.isInvalidQr || err.response?.status === 404) {
        setErrorState('invalid_qr');
      } else {
        setErrorState('error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error('Your cart is empty!');
      return;
    }

    try {
      setIsSubmittingOrder(true);
      const payload = {
        slug,
        token,
        customerName: customerName.trim() || 'Guest',
        customerNote: customerNote.trim(),
        items: cart.map((i) => ({
          menuItemId: i.menuItemId || i._id || i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
      };

      const res = await publicService.placeOrder(payload);
      if (res.success && res.order) {
        clearCart();
        setIsCartOpen(false);
        toast.success(`Order placed! Order #${res.order.orderNumber}`);
        navigate(`/order/${res.order._id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Filter menu items by search and category
  const filteredItems = menuItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const itemCatId = (item.categoryId?._id || item.categoryId || '').toString();
    const matchesCategory = selectedCategory === 'all' || itemCatId === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <Spinner size="lg" className="text-brand-500" />
        <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">Loading restaurant menu...</p>
      </div>
    );
  }

  // Error Screens
  if (errorState === 'invalid_qr') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-950/50 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invalid Table QR Code</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This QR code link is invalid or has expired. Please ask restaurant staff for assistance or scan the table QR code again.
          </p>
        </div>
      </div>
    );
  }

  if (errorState === 'suspended') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-950/50 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400">
            <Store className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Menu Currently Unavailable</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This restaurant is currently not accepting online orders. Please speak with the restaurant server.
          </p>
        </div>
      </div>
    );
  }

  const currency = restaurant?.currency || '$';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28 text-gray-900 dark:text-gray-100">
      {/* Restaurant Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/95 dark:bg-gray-900/95">
        <div className="max-w-2xl mx-auto px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {restaurant?.logoUrl ? (
                <img
                  src={restaurant.logoUrl}
                  alt={restaurant.name}
                  className="w-11 h-11 rounded-2xl object-cover border border-gray-200 dark:border-gray-700 shrink-0 shadow-sm"
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-brand-500 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
                  {restaurant?.name?.charAt(0) || 'M'}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                  {restaurant?.name || 'MenuFlow Restaurant'}
                </h1>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    {tableInfo?.number || 'Table'}
                  </span>
                  {restaurant?.phone && (
                    <span className="text-xs text-gray-400 truncate hidden sm:inline">{restaurant.phone}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Cart Trigger Button in Header */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
              aria-label="View Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-500 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>

          {/* Search Box */}
          <div className="relative mt-3">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search food, drinks, desserts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm border-none focus:ring-2 focus:ring-brand-500 text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              All Items ({menuItems.length})
            </button>
            {categories.map((cat) => {
              const catId = (cat._id || cat.id).toString();
              const count = menuItems.filter(
                (i) => (i.categoryId?._id || i.categoryId || '').toString() === catId
              ).length;
              return (
                <button
                  key={catId}
                  onClick={() => setSelectedCategory(catId)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === catId
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Menu Items List */}
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-3">
              <Utensils className="w-8 h-8" />
            </div>
            <p className="text-base font-semibold text-gray-700 dark:text-gray-300">No dishes found</p>
            <p className="text-xs text-gray-500 mt-1">Try searching for a different item or category.</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const itemId = (item._id || item.id).toString();
            const inCart = cart.find((i) => (i._id || i.id || i.menuItemId).toString() === itemId);
            const isAvailable = item.isAvailable !== false;

            return (
              <div
                key={itemId}
                className={`bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all flex gap-4 ${
                  !isAvailable ? 'opacity-60 bg-gray-50 dark:bg-gray-900/50' : 'hover:shadow-md'
                }`}
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shrink-0 bg-gray-100 dark:bg-gray-800"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-gray-900 dark:text-white text-base leading-snug">
                        {item.name}
                      </h3>
                      {!isAvailable && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400 shrink-0">
                          Sold Out
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2">
                    <span className="font-extrabold text-brand-600 dark:text-brand-400 text-lg">
                      {currency}
                      {Number(item.price).toFixed(2)}
                    </span>

                    {isAvailable ? (
                      inCart ? (
                        <div className="flex items-center gap-2 bg-brand-50 dark:bg-brand-950/60 p-1 rounded-xl border border-brand-200 dark:border-brand-800">
                          <button
                            onClick={() => updateQuantity(itemId, inCart.quantity - 1)}
                            className="w-7 h-7 rounded-lg bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-brand-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-bold text-xs text-brand-700 dark:text-brand-300 w-5 text-center">
                            {inCart.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(itemId, inCart.quantity + 1)}
                            className="w-7 h-7 rounded-lg bg-brand-500 text-white shadow-sm flex items-center justify-center hover:bg-brand-600"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add
                        </button>
                      )
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cartItemCount > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-40 animate-fade-in-up">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-950 p-4 rounded-2xl shadow-2xl flex items-center justify-between hover:scale-[1.01] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="bg-brand-500 text-white px-2.5 py-1 rounded-xl text-xs font-black">
                {cartItemCount}
              </div>
              <div className="text-left">
                <p className="text-xs text-gray-300 dark:text-gray-600 font-medium">Order Subtotal</p>
                <p className="text-base font-extrabold">
                  {currency}
                  {cartTotal.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 font-bold text-sm bg-brand-500 text-white px-4 py-2 rounded-xl">
              <span>View Cart</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Cart & Checkout Modal Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 h-full flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-brand-500" />
                <h2 className="font-bold text-lg text-gray-900 dark:text-white">Your Order</h2>
                <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full font-semibold">
                  {cartItemCount} items
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">Your cart is empty</p>
                </div>
              ) : (
                cart.map((item) => {
                  const itemId = (item._id || item.id || item.menuItemId).toString();
                  return (
                    <div
                      key={itemId}
                      className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex items-center justify-between gap-3 border border-gray-100 dark:border-gray-800"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold mt-0.5">
                          {currency}
                          {Number(item.price).toFixed(2)} each
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-1">
                          <button
                            onClick={() => updateQuantity(itemId, item.quantity - 1)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-gray-800 dark:text-gray-200">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(itemId, item.quantity + 1)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-brand-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(itemId)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Order Notes & Customer Details */}
              {cart.length > 0 && (
                <div className="pt-4 space-y-3 border-t border-gray-100 dark:border-gray-800">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Your Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Alex"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Kitchen Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Special instructions, food allergies, extra cutlery..."
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Checkout Button */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Total Due (Pay at counter / table)</span>
                  <span className="text-xl font-black text-gray-900 dark:text-white">
                    {currency}
                    {cartTotal.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={isSubmittingOrder}
                  className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  {isSubmittingOrder ? (
                    <>
                      <Spinner size="sm" className="text-white" />
                      <span>Sending Order to Kitchen...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Place Order Now ({currency}{cartTotal.toFixed(2)})</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMenuPage;