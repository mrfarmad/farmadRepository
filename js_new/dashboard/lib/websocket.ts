/**
 * WebSocket Client Hook
 * Manages WebSocket connection for real-time updates
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
  type: 'device_data' | 'alarm' | 'warning' | 'system_status' | 'welcome';
  timestamp: string;
  data?: unknown;
}

export interface DeviceData {
  device_id: number;
  device_type: string;
  timestamp: string;
  registers: Record<string, number | boolean | string>;
  alarms?: string[];
  warnings?: string[];
}

interface UseWebSocketOptions {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onDeviceData?: (data: DeviceData) => void;
  onAlarm?: (data: unknown) => void;
  onWarning?: (data: unknown) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    url,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
    onMessage,
    onDeviceData,
    onAlarm,
    onWarning,
    onConnect,
    onDisconnect,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);

          // Route message to specific handlers
          switch (message.type) {
            case 'device_data':
              onDeviceData?.(message.data as DeviceData);
              break;
            case 'alarm':
              onAlarm?.(message.data);
              break;
            case 'warning':
              onWarning?.(message.data);
              break;
            case 'system_status':
              console.log('[WebSocket] System status:', message.data);
              break;
            case 'welcome':
              console.log('[WebSocket] Welcome message received');
              break;
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setIsConnected(false);
        wsRef.current = null;
        onDisconnect?.();

        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          console.log(
            `[WebSocket] Reconnecting in ${reconnectInterval}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          console.error('[WebSocket] Max reconnection attempts reached');
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
    }
  }, [url, reconnectInterval, maxReconnectAttempts, onMessage, onDeviceData, onAlarm, onWarning, onConnect, onDisconnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const send = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message: not connected');
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    send,
    disconnect,
    reconnect: connect,
  };
}
