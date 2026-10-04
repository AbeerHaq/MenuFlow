import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [tableScope, setTableScope] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerNote, setCustomerNote] = useState('');

  // Sync cart from localStorage when tableScope changes
  useEffect(() => {
    if (tableScope) {
      try {
        const storedCart = localStorage.getItem(`menuflow_cart_${tableScope}`);
        if (storedCart) {
          setCart(JSON.parse(storedCart));
        } else {
          setCart([]);
        }
      } catch (err) {
        console.error('Error loading cart from storage:', err);
        setCart([]);
      }
    }
  }, [tableScope]);

  // Persist cart to localStorage on changes
  useEffect(() => {
    if (tableScope) {
      try {
        localStorage.setItem(`menuflow_cart_${tableScope}`, JSON.stringify(cart));
      } catch (err) {
        console.error('Error saving cart to storage:', err);
      }
    }
  }, [cart, tableScope]);

  const initScope = (slug, token) => {
    const scope = `${slug}_${token}`;
    if (scope !== tableScope) {
      setTableScope(scope);
    }
  };

  const addToCart = (item) => {
    setCart((prev) => {
      const itemId = item._id || item.id || item.menuItemId;
      const existing = prev.find((i) => (i._id || i.id || i.menuItemId) === itemId);

      if (existing) {
        return prev.map((i) =>
          (i._id || i.id || i.menuItemId) === itemId
            ? { ...i, quantity: i.quantity + 1, subtotal: Number(((i.quantity + 1) * i.price).toFixed(2)) }
            : i
        );
      }

      return [
        ...prev,
        {
          menuItemId: itemId,
          _id: itemId,
          id: itemId,
          name: item.name,
          price: Number(item.price),
          imageUrl: item.imageUrl || '',
          quantity: 1,
          subtotal: Number(item.price),
        },
      ];
    });
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCart((prev) =>
      prev.map((i) =>
        (i._id || i.id || i.menuItemId) === itemId
          ? { ...i, quantity, subtotal: Number((quantity * i.price).toFixed(2)) }
          : i
      )
    );
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => prev.filter((i) => (i._id || i.id || i.menuItemId) !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    if (tableScope) {
      localStorage.removeItem(`menuflow_cart_${tableScope}`);
    }
  };

  const cartTotal = Number(
    cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0).toFixed(2)
  );

  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  const value = {
    cart,
    tableScope,
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
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;
