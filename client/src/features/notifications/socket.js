import { io } from 'socket.io-client';
import { getAccessToken } from '../../api/axiosClient';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const connectSocket = () => {
  if (socket?.connected) return socket;

  const token = getAccessToken();
  if (!token) return null;

  socket = io(SOCKET_URL, { auth: { token } });
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};