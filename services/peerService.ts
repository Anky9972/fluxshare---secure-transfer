// Shared PeerJS Service - Singleton to avoid multiple peer instances
// This dramatically improves performance by reusing a single peer connection

declare const Peer: any;

export type PeerEventType = 'open' | 'connection' | 'call' | 'error' | 'disconnected' | 'close';

interface PeerConfig {
    host?: string;
    port?: number;
    path?: string;
    secure?: boolean;
    debug?: number;
    config?: {
        iceServers: { urls: string }[];
    };
}

type PeerEventCallback = (data: any) => void;

class PeerService {
    private peer: any = null;
    private peerId: string = '';
    private isInitializing: boolean = false;
    private initPromise: Promise<string> | null = null;
    private eventListeners: Map<PeerEventType, Set<PeerEventCallback>> = new Map();
    private connectionListeners: Set<(conn: any) => void> = new Set();
    private callListeners: Set<(call: any) => void> = new Set();

    constructor() {
        // Initialize event listener maps
        const eventTypes: PeerEventType[] = ['open', 'connection', 'call', 'error', 'disconnected', 'close'];
        eventTypes.forEach(type => this.eventListeners.set(type, new Set()));
    }

    /**
     * Get or create the shared peer instance
     * Returns a promise that resolves with the peer ID when ready
     */
    async initialize(customId?: string): Promise<string> {
        // If already initialized and connected, return immediately
        if (this.peer && !this.peer.destroyed && this.peerId) {
            return this.peerId;
        }

        // If initialization is in progress, wait for it
        if (this.isInitializing && this.initPromise) {
            return this.initPromise;
        }

        this.isInitializing = true;
        this.initPromise = this._createPeer(customId);

        try {
            const id = await this.initPromise;
            return id;
        } finally {
            this.isInitializing = false;
        }
    }

    private async _createPeer(customId?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            // Wait for PeerJS to be loaded
            if (typeof Peer === 'undefined') {
                // Retry after a short delay if PeerJS is still loading
                const checkPeer = (attempts = 0) => {
                    if (typeof Peer !== 'undefined') {
                        this._setupPeer(customId, resolve, reject);
                    } else if (attempts < 50) { // Wait up to 5 seconds
                        setTimeout(() => checkPeer(attempts + 1), 100);
                    } else {
                        reject(new Error('PeerJS library not loaded'));
                    }
                };
                checkPeer();
                return;
            }

            this._setupPeer(customId, resolve, reject);
        });
    }

    private _setupPeer(customId: string | undefined, resolve: (id: string) => void, reject: (err: Error) => void) {
        try {
            const id = customId || `FLUX-${Math.floor(Math.random() * 90000) + 10000}`;

            // Parse ICE servers from env
            // @ts-ignore
            const iceServers = (import.meta.env?.VITE_ICE_SERVERS || 'stun:stun.l.google.com:19302')
                .split(',')
                .map((url: string) => ({ urls: url.trim() }));

            const peerConfig: PeerConfig = {
                debug: 1, // Reduced debug level
                config: { iceServers }
            };

            // Check for custom peer server config
            // @ts-ignore
            const envHost = import.meta.env?.VITE_PEER_HOST;
            if (envHost && envHost.trim() !== '') {
                // @ts-ignore
                peerConfig.host = envHost;
                // @ts-ignore
                peerConfig.port = Number(import.meta.env.VITE_PEER_PORT) || 443;
                // @ts-ignore
                peerConfig.path = import.meta.env.VITE_PEER_PATH || '/peerjs';
                // @ts-ignore
                peerConfig.secure = import.meta.env.VITE_PEER_SECURE === 'true';
            } else {
                // Use our deployed FluxShare peer server
                peerConfig.host = 'peer-server-g3ji.onrender.com';
                peerConfig.port = 443;
                peerConfig.path = '/peerjs';
                peerConfig.secure = true;
            }

            this.peer = new Peer(id, peerConfig);

            this.peer.on('open', (id: string) => {
                this.peerId = id;
                console.log('[PeerService] Connected with ID:', id);
                this._emitEvent('open', id);
                resolve(id);
            });

            this.peer.on('connection', (conn: any) => {
                console.log('[PeerService] Incoming connection from:', conn.peer);
                this._emitEvent('connection', conn);
                this.connectionListeners.forEach(cb => cb(conn));
            });

            this.peer.on('call', (call: any) => {
                console.log('[PeerService] Incoming call from:', call.peer);
                this._emitEvent('call', call);
                this.callListeners.forEach(cb => cb(call));
            });

            this.peer.on('error', (err: any) => {
                console.error('[PeerService] Error:', err);
                this._emitEvent('error', err);
                
                // Only reject if we haven't connected yet
                if (!this.peerId) {
                    reject(err);
                }
            });

            this.peer.on('disconnected', () => {
                console.log('[PeerService] Disconnected, attempting reconnect...');
                this._emitEvent('disconnected', null);
                
                // Auto-reconnect
                if (this.peer && !this.peer.destroyed) {
                    setTimeout(() => {
                        this.peer?.reconnect();
                    }, 1000);
                }
            });

            this.peer.on('close', () => {
                console.log('[PeerService] Connection closed');
                this.peerId = '';
                this._emitEvent('close', null);
            });

        } catch (err: any) {
            console.error('[PeerService] Failed to create peer:', err);
            reject(err);
        }
    }

    private _emitEvent(type: PeerEventType, data: any) {
        const listeners = this.eventListeners.get(type);
        if (listeners) {
            listeners.forEach(cb => {
                try {
                    cb(data);
                } catch (err) {
                    console.error(`[PeerService] Error in ${type} listener:`, err);
                }
            });
        }
    }

    /**
     * Get the current peer ID
     */
    getPeerId(): string {
        return this.peerId;
    }

    /**
     * Get the raw peer instance (for advanced usage)
     */
    getPeer(): any {
        return this.peer;
    }

    /**
     * Check if peer is connected
     */
    isConnected(): boolean {
        return this.peer && !this.peer.destroyed && !!this.peerId;
    }

    /**
     * Connect to another peer
     */
    connect(targetId: string, options?: { reliable?: boolean; metadata?: any }): any {
        if (!this.peer) {
            throw new Error('Peer not initialized');
        }
        return this.peer.connect(targetId, options || { reliable: true });
    }

    /**
     * Call another peer (for video/audio)
     */
    call(targetId: string, stream: MediaStream, options?: { metadata?: any }): any {
        if (!this.peer) {
            throw new Error('Peer not initialized');
        }
        return this.peer.call(targetId, stream, options);
    }

    /**
     * Add event listener
     */
    on(event: PeerEventType, callback: PeerEventCallback): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.add(callback);
        }
    }

    /**
     * Remove event listener
     */
    off(event: PeerEventType, callback: PeerEventCallback): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.delete(callback);
        }
    }

    /**
     * Add connection listener (for incoming data connections)
     */
    onConnection(callback: (conn: any) => void): void {
        this.connectionListeners.add(callback);
    }

    /**
     * Remove connection listener
     */
    offConnection(callback: (conn: any) => void): void {
        this.connectionListeners.delete(callback);
    }

    /**
     * Add call listener (for incoming calls)
     */
    onCall(callback: (call: any) => void): void {
        this.callListeners.add(callback);
    }

    /**
     * Remove call listener
     */
    offCall(callback: (call: any) => void): void {
        this.callListeners.delete(callback);
    }

    /**
     * Destroy the peer connection
     */
    destroy(): void {
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
            this.peerId = '';
        }
        this.connectionListeners.clear();
        this.callListeners.clear();
        this.eventListeners.forEach(set => set.clear());
    }
}

// Export singleton instance
export const peerService = new PeerService();
