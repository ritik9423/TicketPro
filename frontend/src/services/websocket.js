// Real-time WebSocket Service using native browser WebSocket / STOMP protocol
class TicketProWebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map(); // topic -> Set of callbacks
    this.reconnectTimer = null;
    this.isConnected = false;
    this.subCounter = 0;
    this.tenantCode = null;
    this.userEmail = null;
  }

  connect(tenantCode, userEmail) {
    if (tenantCode) this.tenantCode = tenantCode;
    if (userEmail) this.userEmail = userEmail;

    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) {
      return;
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      let wsUrl = import.meta.env.VITE_WS_URL;
      if (!wsUrl) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const isDev = window.location.port !== '';
        wsUrl = isDev 
          ? `${protocol}//${window.location.host}/ws/websocket`
          : `${protocol}//${window.location.hostname}:8081/ws/websocket`;
      }

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Send STOMP CONNECT frame with auth token
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        let connectFrame = "CONNECT\naccept-version:1.2,1.1,1.0\nheart-beat:10000,10000\n";
        if (token) {
          connectFrame += `Authorization:Bearer ${token}\ntoken:${token}\n`;
        }
        connectFrame += "\n\0";
        this.ws.send(connectFrame);
      };

      this.ws.onmessage = (event) => {
        const data = event.data;
        if (!data || typeof data !== 'string') return;

        // When CONNECTED frame is received from STOMP broker
        if (data.startsWith('CONNECTED')) {
          this.isConnected = true;
          console.log('✅ Real-time WebSocket connection established & authenticated');

          // Resubscribe to all active topics registered via wsService.subscribe
          this.listeners.forEach((_, destination) => {
            this.sendStompSubscribe(destination);
          });

          // Default tenant-scoped subscriptions
          if (this.tenantCode && this.tenantCode !== 'GLOBAL') {
            this.sendStompSubscribe(`/topic/tickets/${this.tenantCode.toUpperCase()}`);
            this.sendStompSubscribe(`/topic/notifications/${this.tenantCode.toUpperCase()}`);
          }
          if (this.userEmail) {
            this.sendStompSubscribe(`/topic/notifications/user/${this.userEmail.toLowerCase()}`);
          }
          return;
        }

        // Check for MESSAGE frame
        if (data.startsWith('MESSAGE')) {
          const bodyIndex = data.indexOf('\n\n');
          if (bodyIndex !== -1) {
            const rawBody = data.substring(bodyIndex + 2).replace(/\0$/, '');
            const headers = data.substring(0, bodyIndex);
            
            // Extract destination topic
            const destMatch = headers.match(/destination:(.+)/);
            const destination = destMatch ? destMatch[1].trim() : null;

            try {
              const parsedPayload = JSON.parse(rawBody);
              
              if (destination && this.listeners.has(destination)) {
                this.listeners.get(destination).forEach((cb) => {
                  try { cb(parsedPayload); } catch (e) { console.error(e); }
                });
              }

              // Fire custom DOM event for broad reactive UI synchronization
              window.dispatchEvent(new CustomEvent('ticketpro_realtime_event', {
                detail: { destination, payload: parsedPayload }
              }));
            } catch (_err) {
              // Body was not JSON, ignore
            }
          }
        }
      };

      this.ws.onerror = (_err) => {
        // Silently handle WebSocket error without polluting error console
        this.isConnected = false;
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.ws = null;
        // Exponential backoff reconnect only if still authenticated
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) return;

        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            const currentToken = sessionStorage.getItem('token') || localStorage.getItem('token');
            if (currentToken) {
              this.connect();
            }
          }, 6000);
        }
      };
    } catch (_err) {
      this.isConnected = false;
    }
  }

  sendStompSubscribe(destination) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.subCounter += 1;
    const subFrame = `SUBSCRIBE\nid:sub-${this.subCounter}\ndestination:${destination}\n\n\0`;
    this.ws.send(subFrame);
  }

  subscribe(topic, callback) {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, new Set());
    }
    this.listeners.get(topic).add(callback);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendStompSubscribe(topic);
    }

    // Return unsubscription teardown function
    return () => {
      if (this.listeners.has(topic)) {
        this.listeners.get(topic).delete(callback);
        if (this.listeners.get(topic).size === 0) {
          this.listeners.delete(topic);
        }
      }
    };
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      const socket = this.ws;
      this.ws = null;
      if (socket.readyState === WebSocket.CONNECTING) {
        socket.onopen = () => {
          try { socket.close(); } catch (_e) {}
        };
      } else if (socket.readyState === WebSocket.OPEN) {
        try { socket.close(); } catch (_e) {}
      }
    }
    this.isConnected = false;
  }
}

export const wsService = new TicketProWebSocketService();
