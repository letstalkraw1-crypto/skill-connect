import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (token) => {
  const socketRef = useRef();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    socketRef.current = io('/', {
      auth: { token }
    });

    socketRef.current.on('connect', () => setIsConnected(true));
    socketRef.current.on('disconnect', () => setIsConnected(false));

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token]);

  return { socket: socketRef.current, isConnected };
};
