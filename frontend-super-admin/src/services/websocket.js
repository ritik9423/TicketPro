/**
 * Real-Time WebSocket / STOMP Client for Super Admin
 */

class WebSocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.subscriptions = new Map();
    this.reconnectTimer = null;
    this.subIdCounter = 1;
  }

  connect() {
    if (this.connected || this.socket) return;

    let wsUrl = import.meta.env.VITE_WS_URL;
    if (!wsUrl) {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.hostname;
      // Connect to native STOMP WebSocket endpoint registered in Spring
      wsUrl = `${wsProtocol}//${wsHost}:8081/ws`;
    }

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        const token = localStorage.getItem('superadmin_token');
        let connectFrame = "CONNECT\naccept-version:1.2,1.1,1.0\nheart-beat:10000,10000\n";
        if (token) {
          connectFrame += `Authorization:Bearer ${token}\n`;
        }
        connectFrame += "\n\0";
        this.socket.send(connectFrame);
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.socket.onerror = () => {
        // Handled silently
      };

      this.socket.onclose = () => {
        this.connected = false;
        this.socket = null;
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 5000);
        }
      };
    } catch (_e) {}
  }

  handleMessage(raw) {
    if (!raw) return;

    if (raw.startsWith('CONNECTED')) {
      this.connected = true;
      this.subscriptions.forEach((_callbacks, topic) => {
        this.sendSubscribe(topic);
      });
      return;
    }

    if (raw.startsWith('MESSAGE')) {
      try {
        const bodyIndex = raw.indexOf('\n\n');
        if (bodyIndex !== -1) {
          let body = raw.slice(bodyIndex + 2);
          if (body.endsWith('\0')) {
            body = body.slice(0, -1);
          }
          
          const lines = raw.slice(0, bodyIndex).split('\n');
          let destination = '';
          for (const line of lines) {
            if (line.startsWith('destination:')) {
              destination = line.substring('destination:'.length).trim();
              break;
            }
          }

          if (destination && this.subscriptions.has(destination)) {
            let data = body;
            try {
              data = JSON.parse(body);
            } catch (_e) {}

            const callbacks = this.subscriptions.get(destination);
            callbacks.forEach((cb) => {
              try {
                cb(data);
              } catch (err) {
                console.error('Error in WS subscriber callback:', err);
              }
            });
          }
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    }
  }

  sendSubscribe(topic) {
    if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const subId = `sub-${this.subIdCounter++}`;
    const frame = `SUBSCRIBE\nid:${subId}\ndestination:${topic}\n\n\0`;
    this.socket.send(frame);
  }

  subscribe(topic, callback) {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic).add(callback);

    if (this.connected) {
      this.sendSubscribe(topic);
    } else {
      this.connect();
    }

    return () => {
      if (this.subscriptions.has(topic)) {
        this.subscriptions.get(topic).delete(callback);
        if (this.subscriptions.get(topic).size === 0) {
          this.subscriptions.delete(topic);
        }
      }
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connected = false;
    }
  }
}

export const wsService = new WebSocketManager();
