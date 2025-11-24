import React, { useState, useEffect, useRef } from 'react';
import { Radio, Users, Send, RefreshCw, Globe, Settings, X, Save, AlertTriangle } from 'lucide-react';

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

interface PeerSettings {
    host: string;
    port: number;
    path: string;
    secure: boolean;
}

const DEFAULT_SETTINGS: PeerSettings = {
    host: 'localhost',
    port: 9000,
    path: '/',
    secure: false
};

const BroadcastHub: React.FC = () => {
    const [myId, setMyId] = useState<string>('');
    const [activePeers, setActivePeers] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    // Settings State
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState<PeerSettings>(DEFAULT_SETTINGS);
    const [tempSettings, setTempSettings] = useState<PeerSettings>(DEFAULT_SETTINGS);

    const peerRef = useRef<any>(null);

    // Load settings from localStorage on mount
    useEffect(() => {
        const savedSettings = localStorage.getItem('fluxshare_peer_settings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                setSettings(parsed);
                setTempSettings(parsed);
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        } else {
            // Fallback to env vars if no local storage
            // @ts-ignore
            const envHost = import.meta.env.VITE_BROADCAST_PEER_HOST;
            // @ts-ignore
            const envPort = import.meta.env.VITE_BROADCAST_PEER_PORT;
            // @ts-ignore
            const envPath = import.meta.env.VITE_BROADCAST_PEER_PATH;

            if (envHost) {
                const envSettings = {
                    host: envHost,
                    port: Number(envPort) || 9000,
                    path: envPath || '/',
                    // @ts-ignore
                    secure: import.meta.env.VITE_ENV === 'production' || envHost !== 'localhost'
                };
                setSettings(envSettings);
                setTempSettings(envSettings);
            }
        }
    }, []);

    // Initialize Peer when settings change
    useEffect(() => {
        const initPeer = async () => {
            // Cleanup previous instance
            if (peerRef.current) {
                peerRef.current.destroy();
                peerRef.current = null;
            }

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
                    },
                    host: settings.host,
                    port: settings.port,
                    path: settings.path,
                    secure: settings.secure
                };

                const peer = new Peer(id, peerConfig);

                peer.on('open', (id: string) => {
                    setMyId(id);
                    addLog(`Broadcast Node Online: ${id}`);
                    addLog(`Connected to: ${settings.host}:${settings.port}`);
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
                    if (err.type === 'network' || err.type === 'peer-unavailable') {
                        addLog(`Could not connect to server at ${settings.host}:${settings.port}`);
                    }
                });

                peerRef.current = peer;

            } catch (err) {
                console.error("Init failed", err);
                addLog("Failed to initialize peer connection.");
            }
        };

        // Only init if we have settings loaded (useEffect runs once on mount, but settings might be default)
        // We want to run this whenever settings change actually.
        initPeer();

        return () => {
            if (peerRef.current) {
                peerRef.current.destroy();
            }
        };
    }, [settings]);

    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 50)]);
    };

    const fetchActivePeers = async () => {
        setIsScanning(true);
        addLog("Scanning network for active nodes...");

        try {
            const { host, port, path, secure } = settings;
            const protocol = secure ? 'https' : 'http';

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
            addLog("ERROR: Could not list peers.");

            if (settings.host === 'localhost' && window.location.hostname !== 'localhost') {
                addLog("⚠️ WARNING: You are on a hosted site trying to connect to localhost.");
                addLog("Please configure a public PeerJS server in Settings.");
            } else {
                addLog("TIP: Ensure the PeerJS server is running and supports peer listing.");
            }
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

    const saveSettings = () => {
        setSettings(tempSettings);
        localStorage.setItem('fluxshare_peer_settings', JSON.stringify(tempSettings));
        setShowSettings(false);
        addLog("Settings saved. Reconnecting...");
    };

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 min-h-[60vh] lg:h-[70vh] overflow-y-auto relative">

            {/* Settings Modal */}
            {showSettings && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#050510] border border-[#00f3ff] p-6 rounded-xl w-full max-w-md shadow-[0_0_30px_rgba(0,243,255,0.2)]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[#00f3ff] font-display font-bold text-xl flex items-center gap-2">
                                <Settings size={20} /> SERVER_CONFIG
                            </h3>
                            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-mono text-gray-400 mb-1">HOST_ADDRESS</label>
                                <input
                                    type="text"
                                    value={tempSettings.host}
                                    onChange={(e) => setTempSettings({ ...tempSettings, host: e.target.value })}
                                    className="w-full bg-black/50 border border-[#333] rounded px-3 py-2 text-white font-mono focus:border-[#00f3ff] outline-none"
                                    placeholder="e.g. localhost or my-peer-server.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-mono text-gray-400 mb-1">PORT</label>
                                    <input
                                        type="number"
                                        value={tempSettings.port}
                                        onChange={(e) => setTempSettings({ ...tempSettings, port: Number(e.target.value) })}
                                        className="w-full bg-black/50 border border-[#333] rounded px-3 py-2 text-white font-mono focus:border-[#00f3ff] outline-none"
                                        placeholder="9000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-mono text-gray-400 mb-1">PATH</label>
                                    <input
                                        type="text"
                                        value={tempSettings.path}
                                        onChange={(e) => setTempSettings({ ...tempSettings, path: e.target.value })}
                                        className="w-full bg-black/50 border border-[#333] rounded px-3 py-2 text-white font-mono focus:border-[#00f3ff] outline-none"
                                        placeholder="/"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="secure"
                                    checked={tempSettings.secure}
                                    onChange={(e) => setTempSettings({ ...tempSettings, secure: e.target.checked })}
                                    className="w-4 h-4 accent-[#00f3ff]"
                                />
                                <label htmlFor="secure" className="text-sm text-gray-300 font-mono">ENABLE_SSL (HTTPS/WSS)</label>
                            </div>

                            <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded text-xs text-yellow-200 flex gap-2 items-start mt-4">
                                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                <div>
                                    For hosted sites, you MUST use a public PeerJS server (not localhost) that supports peer listing.
                                </div>
                            </div>

                            <button
                                onClick={saveSettings}
                                className="w-full bg-[#00f3ff] text-black font-bold py-3 rounded mt-4 hover:bg-[#00c2cc] transition-all flex items-center justify-center gap-2"
                            >
                                <Save size={18} /> SAVE_CONFIGURATION
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Left Panel: Network Status */}
            <div className="lg:col-span-1 flex flex-col gap-4">
                <div className="bg-[#050510]/80 border border-[#00f3ff]/30 p-6 rounded-xl backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                        <button
                            onClick={() => setShowSettings(true)}
                            className="text-[#00f3ff]/50 hover:text-[#00f3ff] transition-colors"
                            title="Server Settings"
                        >
                            <Settings size={18} />
                        </button>
                    </div>

                    <h3 className="text-[#00f3ff] font-display font-bold mb-2 flex items-center gap-2">
                        <Globe size={18} /> NETWORK_STATUS
                    </h3>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-400 font-mono text-xs">ACTIVE_NODES</span>
                        <span className="text-[#00f3ff] font-mono font-bold text-xl">{activePeers.length}</span>
                    </div>

                    <div className="mb-4 text-xs font-mono text-gray-500 truncate">
                        SERVER: {settings.host}:{settings.port}
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

                <div className="bg-[#050510]/80 border border-[#333] p-6 rounded-xl backdrop-blur-md flex-1 overflow-hidden flex flex-col max-h-[300px] lg:max-h-none">
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
                <div className="min-h-[300px] lg:flex-1 bg-black/80 border border-[#333] rounded-xl p-4 font-mono text-xs overflow-y-auto relative">
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
