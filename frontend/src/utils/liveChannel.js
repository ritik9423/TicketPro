/**
 * TicketPro Real-Time Live Sync & Broadcast Engine
 * Coordinates real-time state sync across multiple browser tabs, windows, and sessions
 * with automatic fallback between BroadcastChannel and storage events.
 */

class LiveChannelEngine {
  constructor() {
    this.channelName = 'ticketpro_realtime_sync_channel';
    this.channel = null;
    this.subscribers = new Map();

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (event) => {
          if (event && event.data) {
            this.notifySubscribers(event.data.type, event.data.payload);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel unavailable, using storage event fallback', err);
      }
    }

    // Storage event fallback for cross-origin or older browsers
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'ticketpro_live_event_bridge' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.notifySubscribers(data.type, data.payload);
          } catch (_e) {}
        }
      });
    }
  }

  /**
   * Broadcast an event to all open tabs and components
   * @param {string} type - Event identifier (e.g. 'TICKET_UPDATED', 'BULK_UPDATE', 'CATEGORY_SAVED')
   * @param {any} payload - Event payload
   */
  broadcast(type, payload = {}) {
    const message = { type, payload, timestamp: Date.now() };

    // Broadcast via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (_e) {}
    }

    // Broadcast via LocalStorage event fallback
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ticketpro_live_event_bridge', JSON.stringify(message));
      } catch (_e) {}

      // Dispatch local custom window event
      try {
        window.dispatchEvent(new CustomEvent(type, { detail: payload }));
      } catch (_e) {}
    }

    // Notify local subscribers in this tab
    this.notifySubscribers(type, payload);
  }

  /**
   * Subscribe to real-time events
   * @param {string} type - Event identifier or '*' for all
   * @param {Function} callback - Function receiving payload
   * @returns {Function} Unsubscribe function
   */
  subscribe(type, callback) {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type).add(callback);

    return () => {
      if (this.subscribers.has(type)) {
        this.subscribers.get(type).delete(callback);
      }
    };
  }

  notifySubscribers(type, payload) {
    if (this.subscribers.has(type)) {
      this.subscribers.get(type).forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`Error in liveChannel subscriber for ${type}:`, err);
        }
      });
    }

    if (this.subscribers.has('*')) {
      this.subscribers.get('*').forEach((cb) => {
        try {
          cb(type, payload);
        } catch (_e) {}
      });
    }
  }
}

export const liveChannel = new LiveChannelEngine();
