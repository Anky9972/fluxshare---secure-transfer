import React, { useState, useEffect, useRef } from 'react';
import { Radio, Users, Send, RefreshCw, Globe, Settings, X, Save, AlertTriangle, MessageSquare, Bot, Sparkles, Languages, FileText, Wand2, Loader2 } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storageService';

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

interface ChatMessage {
    id: string;
    text: string;
    sender: 'me' | 'peer';
    from: string;
    timestamp: number;
    translatedText?: string;
}

const BroadcastHub: React.FC = () => {
    const [myId, setMyId] = useState<string>('');
    const [activePeers, setActivePeers] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    // Chat Widget State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // AI State
    const [quickReplies, setQuickReplies] = useState<string[]>([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);
    const [myUsername, setMyUsername] = useState<string>('');

    // Settings State
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState<PeerSettings>(DEFAULT_SETTINGS);
    const [tempSettings, setTempSettings] = useState<PeerSettings>(DEFAULT_SETTINGS);

    const peerRef = useRef<any>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

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
            // Fallback to env vars
            // @ts-ignore
            const envHost = import.meta.env.VITE_BROADCAST_PEER_HOST;
            // @ts-ignore
            const envPort = import.meta.env.VITE_BROADCAST_PEER_PORT;
            // @ts-ignore
            const envPath = import.meta.env.VITE_BROADCAST_PEER_PATH;

            // @ts-ignore
            const isProd = import.meta.env.VITE_ENV === 'production';

            if (envHost) {
                const envSettings = {
                    host: envHost,
                    port: Number(envPort) || 9000,
                    path: envPath || '/',
                    secure: isProd || envHost !== 'localhost'
                };
                setSettings(envSettings);
                setTempSettings(envSettings);
            }
        }
    }, []);

    // Scroll to bottom of chat
    useEffect(() => {
        if (isChatOpen) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setUnreadCount(0);
        }
    }, [chatMessages, isChatOpen]);

    // Initialize Peer when settings change
    useEffect(() => {
        const initPeer = async () => {
            if (peerRef.current) {
                peerRef.current.destroy();
                peerRef.current = null;
            }

            try {
                const id = `FLUX-CAST-${Math.floor(Math.random() * 9000) + 1000}`;

                // @ts-ignore
                const iceServers = (import.meta.env.VITE_ICE_SERVERS || 'stun:stun.l.google.com:19302')
                    .split(',')
                    .map((url: string) => ({ urls: url.trim() }));

                const peerConfig: any = {
                    debug: 2,
                    config: { iceServers },
                    host: settings.host,
                    port: settings.port,
                    path: settings.path,
                    secure: settings.secure
                };

                const peer = new Peer(id, peerConfig);

                peer.on('open', (id: string) => {
                    setMyId(id);
                    addLog(`Broadcast Node Online: ${id}`);
                    fetchActivePeers();
                });

                peer.on('connection', (conn: any) => {
                    conn.on('data', (data: any) => {
                        if (data.type === 'broadcast') {
                            addLog(`📢 BROADCAST from ${conn.peer}: ${data.text}`);

                            const displayName = data.username ? `${data.username} (${conn.peer})` : conn.peer;
                            const newMessage: ChatMessage = {
                                id: generateUUID(),
                                text: data.text,
                                sender: 'peer',
                                from: displayName,
                                timestamp: Date.now()
                            };

                            setChatMessages(prev => [...prev, newMessage]);

                            if (!isChatOpen) {
                                setIsChatOpen(true);
                                setUnreadCount(prev => prev + 1);
                            }

                            // Trigger AI quick replies
                            generateQuickReplies(data.text);
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

        initPeer();

        return () => {
            if (peerRef.current) {
                peerRef.current.destroy();
            }
        };
    }, [settings]);

    // Get username from settings
    useEffect(() => {
        const username = storageService.getSettings().username || '';
        setMyUsername(username);
    }, []);


    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 50)]);
    };

    const fetchActivePeers = async () => {
        setIsScanning(true);
        addLog("Scanning network...");
        try {
            const { host, port, path, secure } = settings;
            const protocol = secure ? 'https' : 'http';
            const cleanPath = path.endsWith('/') ? path : `${path}/`;
            const url = `${protocol}://${host}:${port}${cleanPath}peerjs/peers`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`Server returned ${response.status}`);

            const peers = await response.json();
            const otherPeers = peers.filter((p: string) => p !== myId);
            setActivePeers(otherPeers);
            addLog(`Found ${otherPeers.length} active peers.`);
        } catch (err) {
            addLog(`Scan failed: ${(err as Error).message}`);
        } finally {
            setIsScanning(false);
        }
    };

    const broadcastMessage = async (text: string = message) => {
        if (!text.trim()) return;
        if (activePeers.length === 0) {
            addLog("No peers to broadcast to.");
            return;
        }

        setIsBroadcasting(true);
        addLog(`Broadcasting to ${activePeers.length} peers...`);

        const promises = activePeers.map(peerId => {
            return new Promise<void>((resolve) => {
                if (!peerRef.current) return resolve();
                const conn = peerRef.current.connect(peerId);
                conn.on('open', () => {
                    conn.send({ type: 'broadcast', text: text, from: myId, username: myUsername });
                    setTimeout(() => { conn.close(); resolve(); }, 1000);
                });
                conn.on('error', resolve);
                setTimeout(resolve, 5000);
            });
        });

        await Promise.all(promises);

        setChatMessages(prev => [...prev, {
            id: generateUUID(),
            text: text,
            sender: 'me',
            from: myId,
            timestamp: Date.now()
        }]);

        setMessage('');
        setIsBroadcasting(false);
        setQuickReplies([]); // Clear replies after sending
    };

    const saveSettings = () => {
        setSettings(tempSettings);
        localStorage.setItem('fluxshare_peer_settings', JSON.stringify(tempSettings));
        setShowSettings(false);
        addLog("Settings saved. Reconnecting...");
    };

    // --- AI FEATURES ---

    const generateQuickReplies = async (context: string) => {
        try {
            const replies = await geminiService.generateQuickReplies(context);
            setQuickReplies(replies);
        } catch (err) {
            console.error("AI Error:", err);
        }
    };

    const handleSummarize = async () => {
        if (chatMessages.length === 0) return;
        setAiLoading(true);
        try {
            const historyText = chatMessages.map(m => `${m.sender}: ${m.text}`).join('\n');
            const result = await geminiService.summarizeChat(historyText);
            setSummary(result);
        } catch (err) {
            addLog("AI Summarization failed.");
        } finally {
            setAiLoading(false);
        }
    };

    const handleTranslate = async (msgId: string, text: string) => {
        setChatMessages(prev => prev.map(m => m.id === msgId ? { ...m, translatedText: 'Translating...' } : m));
        try {
            const translated = await geminiService.translateText(text);
            setChatMessages(prev => prev.map(m => m.id === msgId ? { ...m, translatedText: translated } : m));
        } catch (err) {
            setChatMessages(prev => prev.map(m => m.id === msgId ? { ...m, translatedText: 'Translation failed.' } : m));
        }
    };

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 min-h-[60vh] lg:h-[70vh] relative animate-fadeIn">

            {/* Settings Modal - Kept same as before but compressed for brevity here provided context */}
            {showSettings && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-[#050510] border border-[#00f3ff] p-6 rounded-xl w-full max-w-md shadow-[0_0_30px_rgba(0,243,255,0.2)]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[#00f3ff] font-display font-bold text-xl flex items-center gap-2">
                                <Settings size={20} /> SERVER_CONFIG
                            </h3>
                            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        {/* Settings inputs same as before... re-implementing briefly */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-mono text-gray-400 mb-1">HOST</label>
                                <input type="text" value={tempSettings.host} onChange={e => setTempSettings({ ...tempSettings, host: e.target.value })} className="w-full bg-black/50 border border-[#333] rounded px-3 py-2 text-white font-mono outline-none focus:border-[#00f3ff]" />
                            </div>
                            <div>
                                <label className="block text-xs font-mono text-gray-400 mb-1">PORT</label>
                                <input type="number" value={tempSettings.port} onChange={e => setTempSettings({ ...tempSettings, port: Number(e.target.value) })} className="w-full bg-black/50 border border-[#333] rounded px-3 py-2 text-white font-mono outline-none focus:border-[#00f3ff]" />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={tempSettings.secure} onChange={e => setTempSettings({ ...tempSettings, secure: e.target.checked })} className="accent-[#00f3ff]" />
                                <label className="text-sm text-gray-300 font-mono">SECURE (SSL)</label>
                            </div>
                            <button onClick={saveSettings} className="w-full bg-[#00f3ff] text-black font-bold py-3 rounded mt-4 hover:bg-[#00c2cc] transition-all flex items-center justify-center gap-2">
                                <Save size={18} /> SAVE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Left Panel: Stats */}
            <div className="lg:col-span-1 flex flex-col gap-4">
                <div className="bg-[#050510]/95 border border-[#00f3ff]/30 p-6 rounded-xl backdrop-blur-xl relative overflow-hidden group shadow-[0_0_30px_rgba(0,243,255,0.1)]">
                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#00f3ff]/10 rounded-full blur-3xl group-hover:bg-[#00f3ff]/20 transition-all"></div>
                    <button onClick={() => setShowSettings(true)} className="absolute top-4 right-4 text-[#00f3ff]/50 hover:text-[#00f3ff]"><Settings size={18} /></button>

                    <h3 className="text-[#00f3ff] font-display font-bold mb-2 flex items-center gap-2"><Globe size={18} /> NETWORK</h3>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-400 font-mono text-xs">NODES</span>
                        <span className="text-[#00f3ff] font-mono font-bold text-xl">{activePeers.length}</span>
                    </div>
                    <button onClick={fetchActivePeers} disabled={isScanning} className="w-full bg-[#00f3ff]/10 border border-[#00f3ff] text-[#00f3ff] py-2 rounded hover:bg-[#00f3ff] hover:text-black transition-all flex items-center justify-center gap-2">
                        <RefreshCw size={14} className={isScanning ? "animate-spin" : ""} /> {isScanning ? 'SCANNING' : 'SCAN'}
                    </button>
                </div>

                <div className="bg-[#050510]/95 border border-[#333] p-6 rounded-xl backdrop-blur-xl flex-1 overflow-hidden flex flex-col shadow-lg">
                    <h3 className="text-gray-400 font-display font-bold mb-4 flex items-center gap-2 text-xs tracking-widest"><Users size={14} /> PEERS</h3>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                        {activePeers.map(peer => (
                            <div key={peer} className="bg-white/5 border border-white/10 p-2 rounded flex items-center gap-2 font-mono text-xs text-gray-300">
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_#00ff00]"></div> {peer}
                            </div>
                        ))}
                        {activePeers.length === 0 && <div className="text-gray-600 font-mono text-xs text-center mt-4">NO PEERS FOUND</div>}
                    </div>
                </div>
            </div>

            {/* Right Panel: Logs & Input */}
            <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="min-h-[400px] lg:flex-1 bg-black/90 border border-[#333] rounded-xl p-4 font-mono text-xs overflow-y-auto relative scrollbar-thin font-terminal text-green-500/80 backdrop-blur-sm">
                    <div className="absolute top-0 right-0 p-2 text-[#bc13fe] text-[10px] tracking-widest opacity-50">CONSOLE</div>
                    {logs.map((log, i) => <div key={i} className="mb-1 border-b border-white/5 pb-1 last:border-0">{log}</div>)}
                </div>

                <div className="bg-[#050510]/95 border border-[#bc13fe]/30 p-6 rounded-xl backdrop-blur-xl shadow-[0_0_30px_rgba(188,19,254,0.1)]">
                    <h3 className="text-[#bc13fe] font-display font-bold mb-4 flex items-center gap-2"><Radio size={18} /> TRANSMITTER</h3>
                    <div className="flex gap-4">
                        <input type="text" value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && !isBroadcasting && broadcastMessage()} placeholder="Broadcast global message..." className="flex-1 bg-black/80 border border-[#bc13fe]/30 rounded px-4 py-3 text-white font-mono placeholder-[#bc13fe]/30 focus:border-[#bc13fe] outline-none transition-colors" disabled={isBroadcasting} />
                        <button onClick={() => broadcastMessage()} disabled={isBroadcasting || !message.trim()} className="bg-[#bc13fe] text-white px-6 py-3 rounded font-bold hover:bg-[#a010d6] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isBroadcasting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            {isBroadcasting ? 'SENDING...' : 'SEND'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Floating Chat Widget */}
            {/* Floating Chat Widget */}
            <button
                onClick={() => { setIsChatOpen(!isChatOpen); setUnreadCount(0); }}
                className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 bg-[#00f3ff] hover:bg-[#00c2cc] text-black p-4 rounded-full shadow-2xl transition-all z-50 group hover:scale-110 active:scale-95 duration-300"
            >
                <MessageSquare size={24} />
                {unreadCount > 0 && !isChatOpen && (
                    <div className="absolute -top-2 -right-2 bg-[#ff0055] text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse border-2 border-black">{unreadCount}</div>
                )}
            </button>

            {/* Chat Modal */}
            {isChatOpen && (
                <div className="fixed bottom-24 right-4 lg:right-10 w-[calc(100vw-2rem)] sm:w-80 h-[50vh] sm:h-[500px] max-h-[calc(100vh-8rem)] bg-[#0a0a15] border-2 border-[#00f3ff] rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 origin-bottom-right">
                    {/* Header */}
                    <div className="bg-[#00f3ff]/10 border-b border-[#00f3ff]/30 p-3 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <MessageSquare size={16} className="text-[#00f3ff]" />
                            <h3 className="text-[#00f3ff] font-display font-bold text-xs">BROADCAST CHAT</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleSummarize} disabled={aiLoading || chatMessages.length === 0} className="p-1.5 hover:bg-[#00f3ff]/20 rounded text-[#00f3ff] transition-colors" title="Summarize Chat">
                                {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                            </button>
                            <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
                        </div>
                    </div>

                    {/* Summary Area */}
                    {summary && (
                        <div className="bg-[#bc13fe]/10 p-3 border-b border-[#bc13fe]/30 flex flex-col gap-2 animate-in slide-in-from-top-2">
                            <div className="flex justify-between items-start">
                                <span className="text-[#bc13fe] text-xs font-bold flex items-center gap-1"><Sparkles size={12} /> AI SUMMARY</span>
                                <button onClick={() => setSummary(null)} className="text-gray-500 hover:text-[#bc13fe]"><X size={12} /></button>
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed font-mono">{summary}</p>
                        </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin">
                        {chatMessages.length === 0 ? (
                            <div className="text-center text-gray-600 font-mono text-xs mt-20 flex flex-col items-center gap-2">
                                <MessageSquare size={32} className="opacity-20" />
                                <p>NO MESSAGES YET</p>
                            </div>
                        ) : (
                            chatMessages.map(msg => (
                                <div key={msg.id} className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm relative group ${msg.sender === 'me'
                                        ? 'bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/30 rounded-tr-none'
                                        : 'bg-[#00f3ff]/10 text-[#00f3ff] border border-[#00f3ff]/30 rounded-tl-none'
                                        }`}>
                                        <div className="font-medium break-words leading-relaxed">{msg.text}</div>

                                        {msg.translatedText && (
                                            <div className="mt-2 pt-2 border-t border-white/10 text-xs text-gray-300 font-mono flex gap-2">
                                                <Languages size={12} className="shrink-0 mt-0.5" />
                                                <span className="italic">{msg.translatedText}</span>
                                            </div>
                                        )}

                                        <div className="text-[10px] opacity-50 mt-1 font-mono flex justify-between gap-4 items-center">
                                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            {msg.sender === 'peer' && !msg.translatedText && (
                                                <button onClick={() => handleTranslate(msg.id, msg.text)} className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-white flex items-center gap-1">
                                                    <Globe size={10} /> Translate
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {msg.sender === 'peer' && <span className="text-[10px] text-gray-600 mt-1 ml-1">{msg.from.slice(0, 8)}...</span>}
                                </div>
                            ))
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Quick Replies */}
                    {quickReplies.length > 0 && (
                        <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-none animate-in slide-in-from-bottom-2">
                            {quickReplies.map((reply, i) => (
                                <button
                                    key={i}
                                    onClick={() => broadcastMessage(reply)}
                                    className="bg-[#00f3ff]/10 hover:bg-[#00f3ff]/20 border border-[#00f3ff]/30 text-[#00f3ff] text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors flex items-center gap-1 font-mono"
                                >
                                    <Sparkles size={10} /> {reply}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Chat Input */}
                    <div className="p-3 bg-[#000]/50 border-t border-[#00f3ff]/30 flex gap-2">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && broadcastMessage()}
                            placeholder="Type a message..."
                            className="flex-1 bg-[#1a1a2e] border border-[#333] rounded px-3 py-2 text-white text-sm focus:border-[#00f3ff] outline-none font-mono"
                        />
                        <button
                            onClick={() => broadcastMessage()}
                            disabled={!message.trim() || isBroadcasting}
                            className="text-[#00f3ff] hover:bg-[#00f3ff]/10 p-2 rounded transition-colors disabled:opacity-50"
                        >
                            {isBroadcasting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BroadcastHub;
