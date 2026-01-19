// Nearby Peers Panel - Shows discovered peers on the local network
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Wifi, WifiOff, RefreshCw, Signal, SignalLow, SignalMedium, 
  Monitor, Smartphone, Copy, Check, Zap, Radio, Radar, UserPlus,
  ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import { networkDiscoveryService, DiscoveredPeer } from '../services/networkDiscoveryService';
import { audioService } from '../services/audioService';
import { notificationService } from '../services/notificationService';

interface NearbyPeersProps {
  onConnect: (peerId: string) => void;
  isConnected: boolean;
  currentPeerId?: string;
}

const NearbyPeers: React.FC<NearbyPeersProps> = ({ onConnect, isConnected, currentPeerId }) => {
  const [peers, setPeers] = useState<DiscoveredPeer[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [myCodename, setMyCodename] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [manualPeerId, setManualPeerId] = useState('');

  useEffect(() => {
    // Subscribe to peer updates
    const unsubscribe = networkDiscoveryService.subscribe((discoveredPeers) => {
      setPeers(discoveredPeers);
    });

    setMyCodename(networkDiscoveryService.getMyCodename());

    return () => {
      unsubscribe();
    };
  }, []);

  const handleScan = useCallback(async () => {
    setIsScanning(true);
    audioService.playSound('send');
    
    try {
      await networkDiscoveryService.scanForPeers();
      notificationService.showToast({
        type: 'info',
        message: `Found ${peers.length} peer(s) nearby`
      });
    } catch (err) {
      console.error('Scan error:', err);
    }
    
    setTimeout(() => setIsScanning(false), 2000);
  }, [peers.length]);

  const handleConnect = (peer: DiscoveredPeer) => {
    audioService.playSound('connect');
    onConnect(peer.peerId);
    notificationService.showToast({
      type: 'info',
      message: `Connecting to ${peer.displayName || peer.codename}...`
    });
  };

  const handleCopyId = async (peerId: string) => {
    try {
      await navigator.clipboard.writeText(peerId);
      setCopiedId(peerId);
      audioService.playSound('success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleManualDiscover = () => {
    if (!manualPeerId.trim()) return;
    networkDiscoveryService.discoverPeer(manualPeerId.trim());
    setManualPeerId('');
    audioService.playSound('send');
    notificationService.showToast({
      type: 'info',
      message: 'Searching for peer...'
    });
  };

  const getSignalIcon = (strength: DiscoveredPeer['signalStrength']) => {
    switch (strength) {
      case 'strong':
        return <Signal size={14} className="text-[#00ff9d]" />;
      case 'medium':
        return <SignalMedium size={14} className="text-[#f3ff00]" />;
      case 'weak':
        return <SignalLow size={14} className="text-[#ff6b6b]" />;
    }
  };

  const getStatusColor = (status: DiscoveredPeer['status']) => {
    switch (status) {
      case 'online':
        return 'bg-[#00ff9d]';
      case 'busy':
        return 'bg-[#ff6b6b]';
      case 'away':
        return 'bg-[#f3ff00]';
    }
  };

  return (
    <div className="bg-[#050510]/95 border border-[#00ff9d]/30 rounded-xl overflow-hidden backdrop-blur-xl shadow-[0_0_20px_rgba(0,255,157,0.1)]">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#00ff9d]/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Radar size={20} className={`text-[#00ff9d] ${isScanning ? 'animate-pulse' : ''}`} />
            {peers.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#00ff9d] text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                {peers.length}
              </span>
            )}
          </div>
          <div className="text-left">
            <h3 className="text-white font-display font-bold text-sm uppercase tracking-wider">
              Nearby Peers
            </h3>
            <p className="text-[#00ff9d] font-mono text-[10px] tracking-widest">
              LOCAL_NETWORK_SCAN
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp size={16} className="text-gray-500" />
          ) : (
            <ChevronDown size={16} className="text-gray-500" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-[#00ff9d]/10">
          {/* My Codename */}
          <div className="p-3 bg-[#00ff9d]/5 border-b border-[#00ff9d]/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00ff9d] animate-pulse" />
                <span className="text-[10px] text-gray-500 font-mono uppercase">Your Codename</span>
              </div>
              <button
                onClick={() => {
                  const newName = networkDiscoveryService.regenerateCodename();
                  setMyCodename(newName);
                  audioService.playSound('success');
                }}
                className="text-[10px] text-[#00ff9d] hover:text-white font-mono transition-colors"
              >
                Regenerate
              </button>
            </div>
            <p className="text-[#00ff9d] font-mono text-sm mt-1 font-bold">{myCodename}</p>
          </div>

          {/* Scan Button */}
          <div className="p-3 border-b border-[#00ff9d]/10">
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="w-full flex items-center justify-center gap-2 bg-[#00ff9d]/10 hover:bg-[#00ff9d]/20 border border-[#00ff9d]/30 text-[#00ff9d] py-2 px-4 rounded font-mono text-xs uppercase tracking-wider transition-all disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Radio size={14} />
                  Scan Network
                </>
              )}
            </button>
          </div>

          {/* Manual Discovery Input */}
          <div className="p-3 border-b border-[#00ff9d]/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={manualPeerId}
                onChange={(e) => setManualPeerId(e.target.value)}
                placeholder="Enter Peer ID to discover..."
                className="flex-1 bg-[#000] border border-[#333] rounded px-3 py-2 text-white text-xs font-mono placeholder-gray-600 focus:border-[#00ff9d]/50 focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleManualDiscover()}
              />
              <button
                onClick={handleManualDiscover}
                disabled={!manualPeerId.trim()}
                className="bg-[#00ff9d]/20 hover:bg-[#00ff9d]/30 border border-[#00ff9d]/30 text-[#00ff9d] px-3 rounded transition-colors disabled:opacity-50"
              >
                <UserPlus size={14} />
              </button>
            </div>
          </div>

          {/* Peers List */}
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
            {peers.length === 0 ? (
              <div className="p-8 text-center">
                <WifiOff size={32} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-500 font-mono text-xs">No peers discovered yet</p>
                <p className="text-gray-600 font-mono text-[10px] mt-1">
                  Click "Scan Network" or enter a Peer ID
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#00ff9d]/10">
                {peers.map((peer) => (
                  <div
                    key={peer.peerId}
                    className="p-3 hover:bg-[#00ff9d]/5 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Status & Icon */}
                        <div className="relative">
                          <div className="w-10 h-10 rounded-lg bg-[#00ff9d]/10 border border-[#00ff9d]/20 flex items-center justify-center">
                            <Monitor size={18} className="text-[#00ff9d]" />
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${getStatusColor(peer.status)} border-2 border-[#050510]`} />
                        </div>

                        {/* Info */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-mono text-sm font-bold">
                              {peer.displayName || peer.codename.split('-')[0]}
                            </span>
                            {getSignalIcon(peer.signalStrength)}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-gray-500 font-mono text-[10px]">
                              {peer.codename}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyId(peer.peerId);
                              }}
                              className="text-gray-600 hover:text-[#00ff9d] transition-colors"
                            >
                              {copiedId === peer.peerId ? (
                                <Check size={10} />
                              ) : (
                                <Copy size={10} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Connect Button */}
                      <button
                        onClick={() => handleConnect(peer)}
                        disabled={isConnected && currentPeerId === peer.peerId}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-wider transition-all ${
                          isConnected && currentPeerId === peer.peerId
                            ? 'bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/30'
                            : 'bg-[#00ff9d] text-black hover:bg-[#00ff9d]/80'
                        }`}
                      >
                        {isConnected && currentPeerId === peer.peerId ? (
                          <>
                            <Check size={12} />
                            Connected
                          </>
                        ) : (
                          <>
                            <Zap size={12} />
                            Connect
                          </>
                        )}
                      </button>
                    </div>

                    {/* Last Seen */}
                    <div className="mt-2 flex items-center gap-2 text-[9px] text-gray-600 font-mono">
                      <span>Last seen: {new Date(peer.lastSeen).toLocaleTimeString()}</span>
                      <span>•</span>
                      <span className="capitalize">{peer.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {peers.length > 0 && (
            <div className="p-2 bg-[#00ff9d]/5 border-t border-[#00ff9d]/10">
              <p className="text-center text-[9px] text-gray-600 font-mono">
                {peers.length} peer{peers.length !== 1 ? 's' : ''} on local network
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NearbyPeers;
