import { io, type Socket } from 'socket.io-client';
import { WS_URL, tokens } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  const token = tokens.accessSync;
  if (!token) return null;
  if (!socket) {
    socket = io(WS_URL, { auth: { token }, transports: ['websocket'] });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.close();
  socket = null;
}
