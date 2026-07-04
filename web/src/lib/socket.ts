import { io, type Socket } from 'socket.io-client';
import { WS_URL, tokens } from './api';

let socket: Socket | null = null;

/** Conecta (una sola vez) al gateway realtime autenticando con el JWT. */
export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  const token = tokens.access;
  if (!token) return null;

  if (!socket) {
    socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.close();
  socket = null;
}
