const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8765';

export function connectWebSocket({ onOpen, onClose, onError, onMessage }) {
  const socket = new WebSocket(WS_URL);
  socket.addEventListener('open', () => onOpen?.());
  socket.addEventListener('close', () => onClose?.());
  socket.addEventListener('error', (err) => onError?.(err));
  socket.addEventListener('message', (event) => {
    try {
      const payload = JSON.parse(event.data);
      onMessage?.(payload);
    } catch (err) {
      onError?.(err);
    }
  });
  return socket;
}
