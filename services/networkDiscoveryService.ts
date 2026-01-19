// Network Discovery Service - Find peers on the same local network
// Uses PeerJS server API for peer discovery

import { generateCodename, generateCodenameFromSeed } from '../utils/codenameGenerator';
import { storageService } from './storageService';

export interface DiscoveredPeer {
  peerId: string;
  codename: string;
  displayName?: string;
  lastSeen: number;
  signalStrength: 'strong' | 'medium' | 'weak';
  status: 'online' | 'busy' | 'away';
}

type DiscoveryCallback = (peers: DiscoveredPeer[]) => void;

const STORAGE_KEY = 'fluxshare_my_codename';
const SCAN_INTERVAL = 10000; // 10 seconds
const PEER_TIMEOUT = 30000; // 30 seconds

// Discovery API endpoint - same server as PeerJS
const getDiscoveryApiUrl = (): string => {
  // Check for production (Render deployment)
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // In production, use the deployed peer server
    return 'https://peer-server-g3ji.onrender.com';
  }
  // Local development - same port as PeerJS server
  return 'http://localhost:9000';
};

class NetworkDiscoveryService {
  private peers: Map<string, DiscoveredPeer> = new Map();
  private myCodename: string = '';
  private myPeerId: string = '';
  private scanTimer: number | null = null;
  private callbacks: Set<DiscoveryCallback> = new Set();
  private peerInstance: any = null;
  private isActive: boolean = false;
  private apiUrl: string = '';

  // Initialize discovery with a peer instance
  async initialize(peer: any, peerId: string): Promise<string> {
    this.peerInstance = peer;
    this.myPeerId = peerId;
    this.apiUrl = getDiscoveryApiUrl();
    
    // Load or generate codename
    const savedCodename = localStorage.getItem(STORAGE_KEY);
    if (savedCodename) {
      this.myCodename = savedCodename;
    } else {
      // Use username from settings if available, otherwise generate
      const settings = storageService.getSettings();
      if (settings.username && settings.username !== 'Anonymous') {
        this.myCodename = `${settings.username}-${Math.floor(1000 + Math.random() * 9000)}`;
      } else {
        this.myCodename = generateCodename();
      }
      localStorage.setItem(STORAGE_KEY, this.myCodename);
    }

    // Register our metadata with the server
    await this.registerMetadata();

    return this.myCodename;
  }

  // Register our metadata with the discovery server
  private async registerMetadata(): Promise<void> {
    try {
      const settings = storageService.getSettings();
      await fetch(`${this.apiUrl}/api/peers/${this.myPeerId}/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codename: this.myCodename,
          displayName: settings.username,
          status: 'online'
        })
      });
    } catch (err) {
      console.warn('[Discovery] Failed to register metadata:', err);
    }
  }

  // Start scanning for peers
  startDiscovery(): void {
    if (this.isActive) return;
    this.isActive = true;

    // Set up listener for incoming discovery messages via PeerJS
    if (this.peerInstance) {
      this.peerInstance.on('connection', (conn: any) => {
        conn.on('data', (data: any) => {
          if (data.type === 'discovery-ping') {
            this.handleDiscoveryPing(data, conn);
          } else if (data.type === 'discovery-pong') {
            this.handleDiscoveryPong(data);
          }
        });
      });
    }

    // Initial scan
    this.scanForPeers();

    // Periodic scan
    this.scanTimer = window.setInterval(() => {
      this.scanForPeers();
    }, SCAN_INTERVAL);

    console.log('[Discovery] Started with codename:', this.myCodename);
  }

  // Stop discovery
  stopDiscovery(): void {
    this.isActive = false;
    
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }

    console.log('[Discovery] Stopped');
  }

  // Scan for peers via server API
  async scanForPeers(): Promise<DiscoveredPeer[]> {
    if (!this.myPeerId) return [];

    try {
      const response = await fetch(`${this.apiUrl}/api/peers?exclude=${this.myPeerId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && Array.isArray(data.peers)) {
        // Update our peers map
        const now = Date.now();
        
        for (const serverPeer of data.peers) {
          const existingPeer = this.peers.get(serverPeer.id);
          
          // Generate codename from peer ID if server doesn't have it
          const codename = serverPeer.codename || generateCodenameFromSeed(serverPeer.id);
          
          this.peers.set(serverPeer.id, {
            peerId: serverPeer.id,
            codename: codename,
            displayName: serverPeer.displayName || undefined,
            lastSeen: serverPeer.lastSeen || now,
            signalStrength: this.calculateSignalStrength(serverPeer.lastSeen || now),
            status: serverPeer.status || 'online'
          });
        }

        // Remove peers that are no longer on the server
        const serverPeerIds = new Set(data.peers.map((p: any) => p.id));
        this.peers.forEach((_, peerId) => {
          if (!serverPeerIds.has(peerId)) {
            this.peers.delete(peerId);
          }
        });

        this.notifyCallbacks();

        // Also ping discovered peers for extra info
        for (const serverPeer of data.peers) {
          this.pingPeer(serverPeer.id);
        }
      }
    } catch (err) {
      console.warn('[Discovery] Scan failed:', err);
      // Don't clear peers on error, keep showing last known
    }

    return this.getPeers();
  }

  // Ping a peer directly for real-time info
  private pingPeer(peerId: string): void {
    if (!this.peerInstance || peerId === this.myPeerId) return;

    try {
      const conn = this.peerInstance.connect(peerId, { reliable: true });
      const settings = storageService.getSettings();
      
      conn.on('open', () => {
        conn.send({
          type: 'discovery-ping',
          peerId: this.myPeerId,
          codename: this.myCodename,
          displayName: settings.username,
          status: 'online',
          timestamp: Date.now()
        });

        // Listen for response
        conn.on('data', (data: any) => {
          if (data.type === 'discovery-pong') {
            this.handleDiscoveryPong(data);
          }
        });

        // Close after timeout
        setTimeout(() => {
          try { conn.close(); } catch {}
        }, 3000);
      });

      conn.on('error', () => {
        // Peer not reachable directly
      });
    } catch (err) {
      // Ignore connection errors
    }
  }

  // Handle incoming discovery ping
  private handleDiscoveryPing(data: any, conn: any): void {
    const { peerId, codename, displayName, status, timestamp } = data;
    
    if (peerId === this.myPeerId) return;

    // Update peer info
    this.addOrUpdatePeer({
      peerId,
      codename: codename || generateCodenameFromSeed(peerId),
      displayName,
      lastSeen: timestamp || Date.now(),
      signalStrength: this.calculateSignalStrength(timestamp),
      status: status || 'online'
    });

    // Send pong response
    const settings = storageService.getSettings();
    try {
      conn.send({
        type: 'discovery-pong',
        peerId: this.myPeerId,
        codename: this.myCodename,
        displayName: settings.username,
        status: 'online',
        timestamp: Date.now()
      });
    } catch {}
  }

  // Handle discovery pong response
  private handleDiscoveryPong(data: any): void {
    const { peerId, codename, displayName, status, timestamp } = data;
    
    if (peerId === this.myPeerId) return;

    this.addOrUpdatePeer({
      peerId,
      codename: codename || generateCodenameFromSeed(peerId),
      displayName,
      lastSeen: timestamp || Date.now(),
      signalStrength: this.calculateSignalStrength(timestamp),
      status: status || 'online'
    });
  }

  // Add or update a discovered peer
  private addOrUpdatePeer(peer: DiscoveredPeer): void {
    const existing = this.peers.get(peer.peerId);
    
    if (!existing || peer.lastSeen > existing.lastSeen) {
      this.peers.set(peer.peerId, peer);
      this.notifyCallbacks();
    }
  }

  // Calculate signal strength based on response time
  private calculateSignalStrength(timestamp: number): 'strong' | 'medium' | 'weak' {
    const age = Date.now() - timestamp;
    if (age < 5000) return 'strong';
    if (age < 15000) return 'medium';
    return 'weak';
  }

  // Manually add a peer ID to discover
  discoverPeer(peerId: string): void {
    if (peerId === this.myPeerId || !this.peerInstance) return;
    this.pingPeer(peerId);
  }

  // Get all discovered peers
  getPeers(): DiscoveredPeer[] {
    return Array.from(this.peers.values())
      .sort((a, b) => b.lastSeen - a.lastSeen);
  }

  // Get my codename
  getMyCodename(): string {
    return this.myCodename;
  }

  // Regenerate codename
  regenerateCodename(): string {
    this.myCodename = generateCodename();
    localStorage.setItem(STORAGE_KEY, this.myCodename);
    this.registerMetadata(); // Update server
    return this.myCodename;
  }

  // Subscribe to peer updates
  subscribe(callback: DiscoveryCallback): () => void {
    this.callbacks.add(callback);
    callback(this.getPeers());
    
    return () => {
      this.callbacks.delete(callback);
    };
  }

  // Notify all subscribers
  private notifyCallbacks(): void {
    const peers = this.getPeers();
    this.callbacks.forEach(cb => cb(peers));
  }

  // Clear all discovered peers
  clearPeers(): void {
    this.peers.clear();
    this.notifyCallbacks();
  }
}

export const networkDiscoveryService = new NetworkDiscoveryService();
export default networkDiscoveryService;
