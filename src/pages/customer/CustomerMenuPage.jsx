import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingBag, Search, Utensils } from 'lucide-react';
import { toast } from 'react-hot-toast';
import tableService from '../../services/tableService';

const CustomerMenuPage = () => {
  const { tableId } = useParams();
  const [tableInfo, setTableInfo] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    if (tableId) {
      fetchMenuData();
    }
  }, [tableId]);

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      const res = await tableService.getByQrCode(tableId);
      const data = res.data || res;

      setTableInfo(data.table || null);
      setRestaurant(data.restaurant || null);
      setCategories(data.categories || []);
      setMenuItems(data.menuItems || []);
    } catch (err) {
      toast.error('Unable to load menu for this table.');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item) => {
    setCart((prev) => {
      const itemId = item._id || item.id;
      const existing = prev.find((i) => (i._id || i.id) === itemId);
      if (existing) {
        return prev.map((i) =>
          (i._id || i.id) === itemId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`Added ${item.name} to order`);
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const itemCatId = item.categoryId || item.category?._id || item.category;
    const matchesCategory = selectedCategory === 'all' || itemCatId === selectedCategory;
    return matchesSearch && matchesCategory && item.isAvailable;
  });

  const cartTotalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {restaurant?.name || 'Digital Menu'}
              </h1>
              {tableInfo && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                  Table #{tableInfo.number}
                </p>
              )}
            </div>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-500 rounded-xl">
              <Utensils className="w-5 h-5" />
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mt-4">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              All Items
            </button>
            {categories.map((cat) => {
              const catId = cat._id || cat.id;
              return (
                <button
                  key={catId}
                  onClick={() => setSelectedCategory(catId)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === catId
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading menu...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No menu items available.</div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const itemId = item._id || item.id;
              return (
                <div
                  key={itemId}
                  className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4"
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-24 h-24 rounded-xl object-cover shrink-0 bg-gray-100 dark:bg-gray-900"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white text-base truncate">
                      {item.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-base">
                        ${Number(item.price).toFixed(2)}
                      </span>
                      <button
                        onClick={() => addToCart(item)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow transition-all active:scale-95"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Cart Bar */}
      {cartTotalQuantity > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40">
          <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 px-2.5 py-1 rounded-lg text-xs font-bold">
                {cartTotalQuantity} items
              </div>
              <span className="font-semibold text-sm">Order Selection</span>
            </div>
            <button
              onClick={() => toast.success('Order placed!')}
              className="px-4 py-1.5 bg-white text-indigo-600 rounded-xl font-bold text-xs shadow hover:bg-gray-50 transition-colors"
            >
              View Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMenuPage;