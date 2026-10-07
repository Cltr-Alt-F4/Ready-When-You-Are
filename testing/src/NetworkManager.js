export class NetworkManager {
    constructor() {
        this.ws = null;
        this.playerId = null;
        this.connected = false;
        this.messageHandlers = {};
    }

    connect(serverUrl = 'ws://localhost:3000') {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(serverUrl);

            this.ws.onopen = () => {
                console.log('Connected to WebSocket server');
                this.connected = true;
                resolve();
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.ws.onclose = () => {
                console.log('Disconnected from WebSocket server');
                this.connected = false;
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };
        });
    }

    handleMessage(data) {
        if (data.type === 'init') {
            this.playerId = data.playerId;
            console.log('Received player ID:', this.playerId);
        }

        const handler = this.messageHandlers[data.type];
        if (handler) {
            handler(data);
        }
    }

    on(messageType, handler) {
        this.messageHandlers[messageType] = handler;
    }

    off(messageType) {
        delete this.messageHandlers[messageType];
    }

    send(data) {
        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket not connected, message not sent:', data);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.connected = false;
        }
    }

    getPlayerId() {
        return this.playerId;
    }
}

// Global instance
export const network = new NetworkManager();
