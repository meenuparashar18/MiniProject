import { io } from 'socket.io-client';
import { API_ORIGIN } from './config';

let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(API_ORIGIN, {
      autoConnect: false,
    });
  }

  return socket;
};

export const connectSocket = (token) => {
  const activeSocket = getSocket();
  activeSocket.auth = { token };

  if (!activeSocket.connected) {
    activeSocket.connect();
  }

  return activeSocket;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};
