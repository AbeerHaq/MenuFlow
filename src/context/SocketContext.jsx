import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '')
  : 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const currentRestaurantRoomRef = useRef(null);

  useEffect(() => {
    // Create new socket connection
    const socketInstance = io(SOCKET_URL, {
      auth: {
        token: token || localStorage.getItem('menuflow_token'),
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('Socket.io connected:', socketInstance.id);
      setIsConnected(true);

      // Rejoin restaurant room on reconnect if previously joined
      if (currentRestaurantRoomRef.current) {
        socketInstance.emit('join:restaurant', currentRestaurantRoomRef.current);
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket.io disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token]);

  const joinRestaurant = (restaurantId) => {
    if (!restaurantId || !socket) return;
    currentRestaurantRoomRef.current = restaurantId;
    socket.emit('join:restaurant', restaurantId);
  };

  const joinOrder = (orderId) => {
    if (!orderId || !socket) return;
    socket.emit('join:order', orderId);
  };

  const value = {
    socket,
    isConnected,
    joinRestaurant,
    joinOrder,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
