// Network Discovery Service - Find peers on the same local network
// Uses PeerJS broadcast channel for peer discovery

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

const DISCOVERY_CHANNEL = 'FLUXSHARE-DISCOVERY';
const HEARTBEAT_INTERVAL = 5000; // 5 seconds
const PEER_TIMEOUT = 15000; // 15 seconds - peer considered offline
const STORAGE_KEY = 'fluxshare_my_codename';

class NetworkDiscoveryService {
  private peers: Map<string, DiscoveredPeer> = new Map();
  private myCodename: string = '';
  private myPeerId: string = '';
  private discoveryConn: any = null;
  private heartbeatTimer: number | null = null;
  private cleanupTimer: number | null = null;
  private callbacks: Set<DiscoveryCallback> = new Set();
  private peerInstance: any = null;
  private isActive: boolean = false;

  // Initialize discovery with a peer instance
  async initialize(peer: any, peerId: string): Promise<string> {
    this.peerInstance = peer;
    this.myPeerId = peerId;
    
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

    return this.myCodename;
  }

  // Start broadcasting presence and listening for peers
  startDiscovery(): void {
    if (this.isActive || !this.peerInstance) return;
    this.isActive = true;

    // Set up listener for incoming discovery pings
    this.peerInstance.on('connection', (conn: any) => {
      conn.on('data', (data: any) => {
        if (data.type === 'discovery-ping') {
          this.handleDiscoveryPing(data, conn);
        } else if (data.type === 'discovery-pong') {
          this.handleDiscoveryPong(data);
        }
      });
    });

    // Start heartbeat - broadcast presence periodically
    this.heartbeatTimer = window.setInterval(() => {
      this.broadcastPresence();
    }, HEARTBEAT_INTERVAL);

    // Start cleanup - remove stale peers
    this.cleanupTimer = window.setInterval(() => {
      this.cleanupStalePeers();
    }, PEER_TIMEOUT / 2);

    // Initial broadcast
    this.broadcastPresence();
    
    console.log('[Discovery] Started with codename:', this.myCodename);
  }

  // Stop discovery
  stopDiscovery(): void {
    this.isActive = false;
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    console.log('[Discovery] Stopped');
  }

  // Broadcast our presence to a known peer
  private broadcastPresence(): void {
    if (!this.peerInstance || !this.isActive) return;

    // We need to ping known peers to discover them
    // In a real scenario, we'd use a discovery server or mDNS
    // For now, we'll try connecting to recently seen peers
    
    const settings = storageService.getSettings();
    const status = 'online'; // Could be based on user setting

    // Send to all currently known peers
    this.peers.forEach((peer, peerId) => {
      try {
        const conn = this.peerInstance.connect(peerId, { reliable: true });
        conn.on('open', () => {
          conn.send({
            type: 'discovery-ping',
            peerId: this.myPeerId,
            codename: this.myCodename,
            displayName: settings.username,
            status,
            timestamp: Date.now()
          });
          // Close after sending
          setTimeout(() => conn.close(), 1000);
        });
      } catch (err) {
        // Peer might be offline
      }
    });
  }

  // Handle incoming discovery ping
  private handleDiscoveryPing(data: any, conn: any): void {
    const { peerId, codename, displayName, status, timestamp } = data;
    
    if (peerId === this.myPeerId) return; // Ignore self

    // Update or add peer
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
    conn.send({
      type: 'discovery-pong',
      peerId: this.myPeerId,
      codename: this.myCodename,
      displayName: settings.username,
      status: 'online',
      timestamp: Date.now()
    });
  }

  // Handle discovery pong response
  private handleDiscoveryPong(data: any): void {
    const { peerId, codename, displayName, status, timestamp } = data;
    
    if (peerId === this.myPeerId) return; // Ignore self

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
    const latency = Date.now() - timestamp;
    if (latency < 100) return 'strong';
    if (latency < 500) return 'medium';
    return 'weak';
  }

  // Remove peers that haven't been seen recently
  private cleanupStalePeers(): void {
    const now = Date.now();
    let changed = false;

    this.peers.forEach((peer, peerId) => {
      if (now - peer.lastSeen > PEER_TIMEOUT) {
        this.peers.delete(peerId);
        changed = true;
      }
    });

    if (changed) {
      this.notifyCallbacks();
    }
  }

  // Manually scan for peers by trying to connect to discovery channel
  async scanForPeers(): Promise<DiscoveredPeer[]> {
    // Try to connect to the discovery channel on the peer server
    // This is a simple approach - in production you'd use a proper discovery mechanism
    
    return Array.from(this.peers.values());
  }

  // Manually add a peer ID to discover
  discoverPeer(peerId: string): void {
    if (peerId === this.myPeerId || !this.peerInstance) return;

    try {
      const conn = this.peerInstance.connect(peerId, { reliable: true });
      const settings = storageService.getSettings();
      
      conn.on('open', () => {
        // Send discovery ping
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
        setTimeout(() => conn.close(), 5000);
      });

      conn.on('error', () => {
        // Peer not reachable
      });
    } catch (err) {
      console.error('[Discovery] Error discovering peer:', err);
    }
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
    return this.myCodename;
  }

  // Subscribe to peer updates
  subscribe(callback: DiscoveryCallback): () => void {
    this.callbacks.add(callback);
    // Immediately call with current peers
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
