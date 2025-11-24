import React, { useState, useEffect, useRef } from 'react';
import { Radio, Users, Send, RefreshCw, Activity, Shield, Globe } from 'lucide-react';

declare const Peer: any;

// Helper for UUID generation
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const BroadcastHub: React.FC = () => {
    const [myId, setMyId] = useState<string>('');
    const [activePeers, setActivePeers] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    const peerRef = useRef<any>(null);

    useEffect(() => {
        const initPeer = async () => {
            try {
                const id = `FLUX-CAST-${Math.floor(Math.random() * 9000) + 1000}`;

                // Parse ICE servers from env
                // @ts-ignore
                const iceServers = (import.meta.env.VITE_ICE_SERVERS || 'stun:stun.l.google.com:19302')
                    .split(',')
                    .map((url: string) => ({ urls: url.trim() }));

                const peerConfig: any = {
                    debug: 2,
                    config: {
                        iceServers: iceServers
                    }
                };

                // Add optional self-hosted config
                // @ts-ignore
                const envHost = import.meta.env.VITE_PEER_HOST;
                if (envHost && envHost.trim() !== '') {
                    // @ts-ignore
                    peerConfig.host = envHost;
                    // @ts-ignore
                    peerConfig.port = Number(import.meta.env.VITE_PEER_PORT) || 443;
                    // @ts-ignore
                    peerConfig.path = import.meta.env.VITE_PEER_PATH || '/';
                }
                // Set secure flag based on environment
                if (import.meta.env.VITE_ENV === 'development') {
                    peerConfig.secure = false;
                } else {
                    peerConfig.secure = true;
                }

                const peer = new Peer(id, peerConfig);

                peer.on('open', (id: string) => {
                    setMyId(id);
                    addLog(`Broadcast Node Online: ${id}`);
                    fetchActivePeers();
                });

                peer.on('connection', (conn: any) => {
                    conn.on('data', (data: any) => {
                        if (data.type === 'broadcast') {
                            addLog(`BROADCAST RECEIVED from ${conn.peer}: ${data.text}`);
                        }
                    });
                });

                peer.on('error', (err: any) => {
                    addLog(`Error: ${err.type}`);
                });

                peerRef.current = peer;

            } catch (err) {
                console.error("Init failed", err);
            }
        };

        initPeer();

        return () => {
            if (peerRef.current) {
                peerRef.current.destroy();
            }
        };
    }, []);

    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 50)]);
    };

    const fetchActivePeers = async () => {
        setIsScanning(true);
        addLog("Scanning network for active nodes...");

        try {
            // Construct API URL based on env
            // @ts-ignore
            const host = import.meta.env.VITE_PEER_HOST || '0.peerjs.com';
            // @ts-ignore
            const port = import.meta.env.VITE_PEER_PORT || 443;
            // @ts-ignore
            const path = import.meta.env.VITE_PEER_PATH || '/';
            // @ts-ignore
            const protocol = import.meta.env.VITE_ENV === 'development' ? 'http' : 'https';

            // Clean path to ensure it doesn't have double slashes if not needed, 
            // but PeerJS server usually expects /peerjs/peers or similar depending on mount
            // Standard PeerJS server mounts at /path/key/peers
            // Default key is 'peerjs'

            const cleanPath = path.endsWith('/') ? path : `${path}/`;
            const url = `${protocol}://${host}:${port}${cleanPath}peerjs/peers`;

            addLog(`Querying: ${url}`);

            const response = await fetch(url);
            if (!response.ok) throw new Error(`Server returned ${response.status}`);

            const peers = await response.json();
            // Filter out self
            const otherPeers = peers.filter((p: string) => p !== myId);
            setActivePeers(otherPeers);
            addLog(`Scan complete. Found ${otherPeers.length} other peers.`);

        } catch (err) {
            addLog(`Scan failed: ${(err as Error).message}`);
            addLog("Note: Peer listing may be disabled on public servers.");
        } finally {
            setIsScanning(false);
        }
    };

    const broadcastMessage = async () => {
        if (!message.trim()) return;
        if (activePeers.length === 0) {
            addLog("No peers to broadcast to.");
            return;
        }

        setIsBroadcasting(true);
        addLog(`Initiating broadcast to ${activePeers.length} peers...`);

        let sentCount = 0;

        // Send to all peers
        const promises = activePeers.map(peerId => {
            return new Promise<void>((resolve) => {
                if (!peerRef.current) return resolve();

                const conn = peerRef.current.connect(peerId);

                conn.on('open', () => {
                    conn.send({ type: 'broadcast', text: message, from: myId });
                    sentCount++;
                    setTimeout(() => {
                        conn.close();
                        resolve();
                    }, 500); // Give it a moment to send
                });

                conn.on('error', () => {
                    // Failed to connect to this one
                    resolve();
                });

                // Timeout if connection hangs
                setTimeout(resolve, 5000);
            });
        });

        await Promise.all(promises);

        addLog(`Broadcast complete. Sent to ${sentCount}/${activePeers.length} peers.`);
        setMessage('');
        setIsBroadcasting(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
            {/* Left Panel: Network Status */}
            <div className="lg:col-span-1 flex flex-col gap-4">
                <div className="bg-[#050510]/80 border border-[#00f3ff]/30 p-6 rounded-xl backdrop-blur-md">
                    <h3 className="text-[#00f3ff] font-display font-bold mb-2 flex items-center gap-2">
                        <Globe size={18} /> NETWORK_STATUS
                    </h3>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-400 font-mono text-xs">ACTIVE_NODES</span>
                        <span className="text-[#00f3ff] font-mono font-bold text-xl">{activePeers.length}</span>
                    </div>
                    <button
                        onClick={fetchActivePeers}
                        disabled={isScanning}
                        className="w-full bg-[#00f3ff]/10 border border-[#00f3ff] text-[#00f3ff] py-2 rounded hover:bg-[#00f3ff] hover:text-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isScanning ? "animate-spin" : ""} />
                        {isScanning ? 'SCANNING...' : 'SCAN_NETWORK'}
                    </button>
                </div>

                <div className="bg-[#050510]/80 border border-[#333] p-6 rounded-xl backdrop-blur-md flex-1 overflow-hidden flex flex-col">
                    <h3 className="text-gray-400 font-display font-bold mb-4 flex items-center gap-2 text-xs tracking-widest">
                        <Users size={14} /> DETECTED_PEERS
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        {activePeers.length === 0 ? (
                            <div className="text-gray-600 font-mono text-xs text-center mt-10">NO_PEERS_DETECTED</div>
                        ) : (
                            activePeers.map(peer => (
                                <div key={peer} className="bg-white/5 border border-white/10 p-2 rounded flex items-center gap-2 font-mono text-xs text-gray-300">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    {peer}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Right Panel: Broadcast Console */}
            <div className="lg:col-span-2 flex flex-col gap-4">
                {/* Logs */}
                <div className="flex-1 bg-black/80 border border-[#333] rounded-xl p-4 font-mono text-xs overflow-y-auto relative">
                    <div className="absolute top-0 right-0 p-2 text-[#bc13fe] text-[10px] tracking-widest opacity-50">
                        BROADCAST_LOGS
                    </div>
                    {logs.map((log, i) => (
                        <div key={i} className="mb-1 text-gray-400 border-b border-white/5 pb-1 last:border-0">
                            <span className="text-[#bc13fe] mr-2">➜</span>
                            {log}
                        </div>
                    ))}
                </div>

                {/* Input Area */}
                <div className="bg-[#050510]/80 border border-[#bc13fe]/30 p-6 rounded-xl backdrop-blur-md">
                    <h3 className="text-[#bc13fe] font-display font-bold mb-4 flex items-center gap-2">
                        <Radio size={18} /> BROADCAST_TRANSMITTER
                    </h3>
                    <div className="flex gap-4">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="ENTER_GLOBAL_MESSAGE..."
                            className="flex-1 bg-black/50 border border-[#bc13fe]/30 rounded px-4 py-3 text-white font-mono placeholder-[#bc13fe]/30 focus:border-[#bc13fe] focus:outline-none transition-colors"
                            onKeyDown={(e) => e.key === 'Enter' && broadcastMessage()}
                        />
                        <button
                            onClick={broadcastMessage}
                            disabled={isBroadcasting || !message.trim()}
                            className="bg-[#bc13fe] text-white px-6 py-3 rounded font-bold hover:bg-[#a010d6] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={18} />
                            SEND
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BroadcastHub;
