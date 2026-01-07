import { io, Socket } from 'socket.io-client';

// Get API base URL from environment or use default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const WS_URL = import.meta.env.VITE_WS_URL || API_BASE_URL;

/**
 * Create a Socket.IO connection with proper configuration
 * @param options Additional socket options
 * @returns Socket instance
 */
export const createSocketConnection = (options?: {
  auth?: { token?: string };
  transports?: ('websocket' | 'polling')[];
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  timeout?: number;
  forceNew?: boolean;
  upgrade?: boolean;
}): Socket => {
  const authToken = localStorage.getItem('auth_token');
  
  const socket = io(WS_URL, {
    transports: options?.transports || ['websocket', 'polling'],
    reconnection: options?.reconnection !== undefined ? options.reconnection : true,
    reconnectionDelay: options?.reconnectionDelay || 300, // Default 300ms (faster)
    reconnectionDelayMax: 2000, // Reduced from 5000ms
    reconnectionAttempts: options?.reconnectionAttempts || 3, // Default 3 attempts
    timeout: options?.timeout || 3000, // Default 3 seconds (faster)
    forceNew: options?.forceNew !== undefined ? options.forceNew : false,
    upgrade: options?.upgrade !== undefined ? options.upgrade : true,
    auth: {
      token: options?.auth?.token || authToken || undefined,
    },
    // Enable CORS
    withCredentials: false,
    // Auto connect
    autoConnect: true,
  });

  // Log connection events for debugging
  socket.on('connect', () => {
    console.log('✅ Socket.IO connected successfully! ID:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket.IO disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket.IO connection error:', error);
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      description: error.description,
    });
  });

  return socket;
};

/**
 * Get the WebSocket URL
 */
export const getWebSocketUrl = (): string => {
  return WS_URL;
};

/**
 * Get the API base URL
 */
export const getApiBaseUrl = (): string => {
  return API_BASE_URL;
};

