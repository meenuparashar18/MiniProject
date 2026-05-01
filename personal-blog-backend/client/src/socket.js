import { io } from 'socket.io-client';

let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(process.env.REACT_APP_API_ORIGIN || 'http://localhost:5001', {
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
