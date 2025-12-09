
import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, X, Download, CheckCircle2, Loader2, Wifi, File as FileIcon, Send, Radio, Copy, ShieldCheck, RefreshCw, Search, ArrowRight, MessageSquare, Terminal, Bot, Eye, QrCode, Clock, BarChart2, Lock, Unlock } from 'lucide-react';
import { FileTransfer, ChatMessage } from '../types';
import { generateQuickReplies } from '../services/geminiService';
import FilePreviewModal from './FilePreviewModal';
import QRCodeGenerator from './shared/QRCodeGenerator';
import FavoritesPanel from './FavoritesPanel';
import TransferHistoryPanel from './TransferHistoryPanel';
import AnalyticsDashboard from './AnalyticsDashboard';
import { storageService } from '../services/storageService';
import { audioService } from '../services/audioService';
import { notificationService } from '../services/notificationService';
import { encryptionService } from '../services/encryptionService';

declare const Peer: any;
const CHUNK_SIZE = 16 * 1024;

// Helper for UUID generation (crypto.randomUUID not available in insecure contexts)
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const P2PShare: React.FC = () => {
    const [mode, setMode] = useState<'send' | 'receive' | 'menu' | 'history' | 'analytics'>('menu');
    const [peerId, setPeerId] = useState<string>('');
    const [targetId, setTargetId] = useState<string>('');
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
    const [logs, setLogs] = useState<string[]>([]);

    // Chat State
    const [activeTab, setActiveTab] = useState<'logs' | 'chat'>('logs');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [quickReplies, setQuickReplies] = useState<string[]>([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // File State
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [transferProgress, setTransferProgress] = useState(0);
    const [receivedFileUrl, setReceivedFileUrl] = useState<string | null>(null);
    const [receivedMeta, setReceivedMeta] = useState<{ name: string, size: number, mime: string } | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const [showQR, setShowQR] = useState(false);
    const [encryptFile, setEncryptFile] = useState(false);
    const [filePassword, setFilePassword] = useState('');

    const peerRef = useRef<any>(null);
    const connRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const receivedChunksRef = useRef<ArrayBuffer[]>([]);
    const receivedSizeRef = useRef(0);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initPeer = () => {
            // Safety check for PeerJS global
            if (typeof Peer === 'undefined') {
                console.error('PeerJS not loaded');
                setConnectionStatus('error');
                addLog('CRITICAL ERROR: PeerJS library not loaded. Check internet connection or ad blockers.');
                addSystemMessage('System failure: PeerJS missing.');
                return;
            }

            try {
                const customId = `NODE-${Math.floor(Math.random() * 9000) + 1000}`;
                console.log("Initializing Peer with ID:", customId);

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
                // Set secure flag based on environment (development => ws, production => wss)
                if (import.meta.env.VITE_ENV === 'development') {
                    peerConfig.secure = false;
                } else {
                    peerConfig.secure = true;
                }

                console.log("Peer Config:", peerConfig);
                const peer = new Peer(customId, peerConfig);

                peer.on('open', (id: string) => {
                    setPeerId(id);
                    addLog(`System initialized. ID: ${id}`);
                    addSystemMessage("Secure terminal ready.");
                    setConnectionStatus('disconnected'); // Ready to connect
                });

                peer.on('connection', (conn: any) => {
                    handleConnection(conn);
                });

                peer.on('error', (err: any) => {
                    console.error("Peer error:", err);
                    setConnectionStatus('error');
                    addLog(`CRITICAL ERROR: ${err.type} - ${err.message || ''}`);
                    addSystemMessage(`Error: ${err.type}`);
                });

                peer.on('disconnected', () => {
                    addLog('Peer disconnected from server. Reconnecting...');
                    peer.reconnect();
                });

                peerRef.current = peer;
            } catch (err: any) {
                console.error("Peer initialization exception:", err);
                setConnectionStatus('error');
                addLog(`INIT EXCEPTION: ${err.message || err}`);
            }
        };

        initPeer();
        return () => {
            if (peerRef.current) {
                peerRef.current.destroy();
                peerRef.current = null;
            }
        };
    }, []);

    // Scroll to bottom of chat
    useEffect(() => {
        if (activeTab === 'chat') {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setUnreadCount(0);
        }
    }, [chatHistory, activeTab]);

    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 50)]);
    };

    const addSystemMessage = (text: string) => {
        setChatHistory(prev => [...prev, { id: generateUUID(), sender: 'system', text, timestamp: Date.now() }]);
    };

    const handleConnection = (conn: any) => {
        connRef.current = conn;
        setConnectionStatus('connecting');
        addLog(`Incoming handshake from ${conn.peer}...`);

        conn.on('open', () => {
            setConnectionStatus('connected');
            addLog('Secure tunnel established.');
            addSystemMessage(`Uplink established with ${conn.peer}`);
            setActiveTab('chat');
            audioService.playSound('connect');
            notificationService.notifyPeerConnected(conn.peer);
            // Save to recent peers
            const history = storageService.getHistory();
            if (!history.find(h => h.peerId === conn.peer)) {
                storageService.saveTransfer({
                    id: Date.now().toString(),
                    peerId: conn.peer,
                    fileName: 'Connection',
                    fileSize: 0,
                    timestamp: Date.now(),
                    direction: 'received',
                    speed: 0,
                    success: true
                });
            }
        });

        conn.on('data', (data: any) => {
            handleData(data);
        });

        conn.on('close', () => {
            setConnectionStatus('disconnected');
            addLog('Connection severed.');
            addSystemMessage('Connection lost.');
            audioService.playSound('disconnect');
            notificationService.notifyPeerDisconnected(conn.peer);
            resetTransfer();
        });
    };

    const connectToPeer = () => {
        if (!targetId) return;
        if (!peerRef.current) return;

        addLog(`Targeting peer: ${targetId}...`);
        setConnectionStatus('connecting');
        const conn = peerRef.current.connect(targetId, { reliable: true });
        handleConnection(conn);
    };

    const handleData = (data: any) => {
        if (data.type === 'meta') {
            receivedChunksRef.current = [];
            receivedSizeRef.current = 0;
            setReceivedMeta({ name: data.name, size: data.size, mime: data.mime });
            setTransferProgress(0);
            addLog(`Receiving stream: ${data.name}`);
            addSystemMessage(`Incoming data stream: ${data.name}`);
        } else if (data.type === 'chunk') {
            receivedChunksRef.current.push(data.data);
            receivedSizeRef.current += data.data.byteLength;
            if (receivedMeta) {
                setTransferProgress(Math.round((receivedSizeRef.current / receivedMeta.size) * 100));
            }
        } else if (data.type === 'end') {
            addLog('Transfer complete. Reassembling...');
            addSystemMessage('Data stream verified. Transfer complete.');
            const blob = new Blob(receivedChunksRef.current, { type: receivedMeta?.mime || 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            setReceivedFileUrl(url);
            setTransferProgress(100);
        } else if (data.type === 'chat') {
            setChatHistory(prev => [...prev, { id: generateUUID(), sender: 'peer', text: data.text, timestamp: data.timestamp }]);
            if (activeTab !== 'chat') {
                setUnreadCount(prev => prev + 1);
            }
        }
    };

    const resetTransfer = () => {
        setTransferProgress(0);
        setSelectedFile(null);
        setReceivedFileUrl(null);
        setReceivedMeta(null);
        receivedChunksRef.current = [];
        receivedSizeRef.current = 0;
    };

    const sendFile = async () => {
        if (!selectedFile || !connRef.current) return;

        const file = selectedFile;
        addLog(`Starting upload: ${file.name}`);
        addSystemMessage(`Initiating upload: ${file.name}`);

        connRef.current.send({ type: 'meta', name: file.name, size: file.size, mime: file.type });

        const reader = new FileReader();
        let offset = 0;

        reader.onload = (e) => {
            if (e.target?.result) {
                connRef.current.send({ type: 'chunk', data: e.target.result });
                offset += CHUNK_SIZE;
                setTransferProgress(Math.min(100, Math.round((offset / file.size) * 100)));
                if (offset < file.size) readNextChunk();
                else {
                    connRef.current.send({ type: 'end' });
                    addLog('Upload successfully completed.');
                    addSystemMessage('Upload complete.');
                }
            }
        };
        const readNextChunk = () => {
            const slice = file.slice(offset, offset + CHUNK_SIZE);
            reader.readAsArrayBuffer(slice);
        };
        readNextChunk();
    };

    // --- CHAT LOGIC ---
    const sendChatMessage = (text: string = chatInput) => {
        if (!text.trim() || !connRef.current) return;

        const msg = { type: 'chat', text: text, timestamp: Date.now() };
        connRef.current.send(msg);

        setChatHistory(prev => [...prev, { id: generateUUID(), sender: 'me', text: text, timestamp: Date.now() }]);
        setChatInput('');
        setQuickReplies([]);
    };

    const handleAiAssist = async () => {
        if (!connRef.current) return;
        setAiLoading(true);
        // Get last peer message for context
        const lastPeerMsg = [...chatHistory].reverse().find(m => m.sender === 'peer')?.text || '';

        const suggestions = await generateQuickReplies(lastPeerMsg);
        setQuickReplies(suggestions);
        setAiLoading(false);
    };

    // MAIN MENU
    if (mode === 'menu') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                <button
                    onClick={() => setMode('send')}
                    className="group relative bg-[#00f3ff]/5 border border-[#00f3ff]/30 hover:border-[#00f3ff] flex flex-col items-center justify-center transition-all duration-500 overflow-hidden rounded-lg active:scale-95 h-[240px]"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#00f3ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-scanline"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <Send size={56} className="text-[#00f3ff] mb-4 group-hover:scale-110 transition-transform duration-500 group-hover:animate-pulse" />
                        <h3 className="text-3xl font-display font-bold text-white tracking-tighter group-hover:text-[#00f3ff] transition-colors">TRANSMITTER</h3>
                        <p className="font-mono text-[#00f3ff] text-xs mt-2 tracking-[0.3em]">INIT_SOURCE_PROTOCOL</p>
                    </div>
                </button>

                <button
                    onClick={() => setMode('receive')}
                    className="group relative bg-[#bc13fe]/5 border border-[#bc13fe]/30 hover:border-[#bc13fe] flex flex-col items-center justify-center transition-all duration-500 overflow-hidden rounded-lg active:scale-95 h-[240px]"
                >
                    <div className="absolute inset-0 bg-gradient-to-bl from-[#bc13fe]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-scanline"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <Download size={56} className="text-[#bc13fe] mb-4 group-hover:scale-110 transition-transform duration-500 group-hover:animate-pulse" />
                        <h3 className="text-3xl font-display font-bold text-white tracking-tighter group-hover:text-[#bc13fe] transition-colors">RECEIVER</h3>
                        <p className="font-mono text-[#bc13fe] text-xs mt-2 tracking-[0.3em]">INIT_TARGET_PROTOCOL</p>
                    </div>
                </button>

                <button
                    onClick={() => setMode('history')}
                    className="group relative bg-[#00ff9d]/5 border border-[#00ff9d]/30 hover:border-[#00ff9d] flex flex-col items-center justify-center transition-all duration-500 overflow-hidden rounded-lg active:scale-95 h-[240px]"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#00ff9d]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-scanline"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <Clock size={56} className="text-[#00ff9d] mb-4 group-hover:scale-110 transition-transform duration-500 group-hover:animate-pulse" />
                        <h3 className="text-3xl font-display font-bold text-white tracking-tighter group-hover:text-[#00ff9d] transition-colors">HISTORY</h3>
                        <p className="font-mono text-[#00ff9d] text-xs mt-2 tracking-[0.3em]">VIEW_TRANSFERS</p>
                    </div>
                </button>

                <button
                    onClick={() => setMode('analytics')}
                    className="group relative bg-[#f3ff00]/5 border border-[#f3ff00]/30 hover:border-[#f3ff00] flex flex-col items-center justify-center transition-all duration-500 overflow-hidden rounded-lg active:scale-95 h-[240px]"
                >
                    <div className="absolute inset-0 bg-gradient-to-bl from-[#f3ff00]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-scanline"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <BarChart2 size={56} className="text-[#f3ff00] mb-4 group-hover:scale-110 transition-transform duration-500 group-hover:animate-pulse" />
                        <h3 className="text-3xl font-display font-bold text-white tracking-tighter group-hover:text-[#f3ff00] transition-colors">ANALYTICS</h3>
                        <p className="font-mono text-[#f3ff00] text-xs mt-2 tracking-[0.3em]">VIEW_STATS</p>
                    </div>
                </button>
            </div>
        );
    }

    // HISTORY VIEW
    if (mode === 'history') {
        return (
            <div className="animate-fadeIn">
                <button
                    onClick={() => setMode('menu')}
                    className="flex items-center gap-2 text-gray-500 hover:text-white font-mono text-xs uppercase tracking-widest transition-colors mb-6"
                >
                    <ArrowRight size={16} className="rotate-180" /> Back to Menu
                </button>
                <TransferHistoryPanel />
            </div>
        );
    }

    // ANALYTICS VIEW
    if (mode === 'analytics') {
        return (
            <div className="animate-fadeIn">
                <button
                    onClick={() => setMode('menu')}
                    className="flex items-center gap-2 text-gray-500 hover:text-white font-mono text-xs uppercase tracking-widest transition-colors mb-6"
                >
                    <ArrowRight size={16} className="rotate-180" /> Back to Menu
                </button>
                <AnalyticsDashboard />
            </div>
        );
    }

    return (
        <div className="animate-fadeIn flex flex-col gap-6">
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-[#333] pb-4">
                <button
                    onClick={() => setMode('menu')}
                    className="flex items-center gap-2 text-gray-500 hover:text-white font-mono text-xs uppercase tracking-widest transition-colors"
                >
                    <ArrowRight size={16} className="rotate-180" /> Abort Sequence
                </button>
                <div className={`px-4 py-1 font-display text-sm font-bold uppercase tracking-wider rounded-full flex items-center gap-2 ${connectionStatus === 'connected' ? 'bg-[#00f3ff]/20 text-[#00f3ff]' : 'bg-[#222] text-gray-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-[#00f3ff] animate-pulse' : 'bg-gray-500'}`}></div>
                    {connectionStatus}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT COLUMN: Connection Info & CHAT */}
                <div className="lg:col-span-5 space-y-4 flex flex-col h-[600px]">
                    {/* My ID */}
                    <div className="p-4 border border-[#00f3ff]/30 bg-[#0a0a15] relative overflow-hidden rounded-lg shrink-0">
                        <span className="text-[#00f3ff] font-mono text-[10px] uppercase tracking-widest absolute top-2 left-3">LOCAL_NODE_ID</span>
                        <div className="mt-4 flex items-center gap-2">
                            <div className="flex-1 flex items-center bg-[#000] p-2 rounded border border-[#00f3ff]/10">
                                <span className="font-mono text-lg text-white tracking-wider truncate mr-2">{peerId || '...'}</span>
                            </div>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(peerId);
                                    audioService.playSound('success');
                                    notificationService.showToast({ type: 'success', message: 'ID copied!' });
                                }}
                                className="text-[#00f3ff] hover:text-white transition-colors shrink-0 p-2 bg-[#000] border border-[#00f3ff]/10 rounded"
                                title="Copy ID"
                            >
                                <Copy size={16} />
                            </button>
                            <button
                                onClick={() => setShowQR(!showQR)}
                                className="text-[#bc13fe] hover:text-white transition-colors shrink-0 p-2 bg-[#000] border border-[#bc13fe]/10 rounded"
                                title="Show QR Code"
                            >
                                <QrCode size={16} />
                            </button>
                        </div>
                        {/* QR Code Panel */}
                        {showQR && peerId && (
                            <div className="mt-3 flex justify-center">
                                <QRCodeGenerator
                                    value={peerId}
                                    title="SCAN_TO_CONNECT"
                                    size={150}
                                    showActions={true}
                                    className="w-full"
                                />
                            </div>
                        )}
                    </div>

                    {/* Favorites Panel */}
                    <FavoritesPanel
                        onPeerSelect={(id) => {
                            setTargetId(id);
                            // Auto-scroll to connect button
                            setTimeout(() => {
                                const connectBtn = document.querySelector('[data-connect-btn]');
                                connectBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }, 100);
                        }}
                        className="shrink-0"
                    />

                    {/* Connect Form */}
                    {connectionStatus !== 'connected' && (
                        <div className="p-4 border border-[#bc13fe]/30 bg-[#0a0a15] rounded-lg shrink-0">
                            <label className="text-[#bc13fe] font-mono text-[10px] uppercase tracking-widest block mb-2">TARGET_NODE_ID</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={targetId}
                                    onChange={(e) => setTargetId(e.target.value.toUpperCase())}
                                    className="flex-1 bg-black border border-[#333] rounded p-2 text-white font-mono text-sm outline-none focus:border-[#bc13fe] transition-colors"
                                    placeholder="PASTE ID HERE"
                                />
                                <button
                                    data-connect-btn
                                    onClick={connectToPeer}
                                    disabled={!targetId}
                                    className="bg-[#bc13fe] text-white p-2 rounded hover:bg-[#a010d8] transition-colors disabled:opacity-50"
                                >
                                    <Search size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TABBED INTERFACE: CHAT & LOGS */}
                    <div className="flex-1 flex flex-col border border-[#333] bg-[#0a0a12] rounded-lg overflow-hidden">
                        <div className="flex border-b border-[#333]">
                            <button
                                onClick={() => setActiveTab('logs')}
                                className={`flex-1 py-2 font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 ${activeTab === 'logs' ? 'bg-[#222] text-white' : 'bg-[#0a0a12] text-gray-500 hover:text-gray-300'}`}
                            >
                                <Terminal size={12} /> System Logs
                            </button>
                            <button
                                onClick={() => setActiveTab('chat')}
                                className={`flex-1 py-2 font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 relative ${activeTab === 'chat' ? 'bg-[#222] text-[#00f3ff]' : 'bg-[#0a0a12] text-gray-500 hover:text-gray-300'}`}
                            >
                                <MessageSquare size={12} /> Secure Uplink
                                {unreadCount > 0 && <span className="absolute top-1 right-2 bg-[#bc13fe] text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center">{unreadCount}</span>}
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            {activeTab === 'logs' ? (
                                <div className="h-full p-4 font-mono text-[10px] text-green-400/80 overflow-y-auto scrollbar-thin">
                                    {logs.map((log, i) => <div key={i} className="mb-1">{log}</div>)}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col">
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin bg-[#050508]">
                                        {chatHistory.length === 0 && (
                                            <div className="text-center text-gray-600 font-mono text-xs mt-10 opacity-50">
                                                <ShieldCheck size={24} className="mx-auto mb-2" />
                                                ENCRYPTED CHANNEL IDLE
                                            </div>
                                        )}
                                        {chatHistory.map((msg) => (
                                            <div key={msg.id} className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : msg.sender === 'system' ? 'items-center' : 'items-start'}`}>
                                                {msg.sender === 'system' ? (
                                                    <span className="text-[9px] text-gray-600 font-mono border border-gray-800 px-2 py-0.5 rounded-full my-1">{msg.text}</span>
                                                ) : (
                                                    <div className={`max-w-[85%] p-2 rounded text-xs font-mono leading-relaxed break-words ${msg.sender === 'me'
                                                        ? 'bg-[#00f3ff]/10 text-[#00f3ff] border border-[#00f3ff]/20 rounded-tr-none'
                                                        : 'bg-[#bc13fe]/10 text-[#bc13fe] border border-[#bc13fe]/20 rounded-tl-none'
                                                        }`}>
                                                        {msg.text}
                                                    </div>
                                                )}
                                                {msg.sender !== 'system' && <span className="text-[8px] text-gray-700 mt-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                            </div>
                                        ))}
                                        <div ref={chatEndRef} />
                                    </div>

                                    {/* Quick Replies */}
                                    {quickReplies.length > 0 && (
                                        <div className="flex gap-2 p-2 bg-[#0a0a15] overflow-x-auto scrollbar-none border-t border-[#222]">
                                            {quickReplies.map((reply, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => sendChatMessage(reply)}
                                                    className="whitespace-nowrap bg-[#00f3ff]/10 border border-[#00f3ff]/30 text-[#00f3ff] text-[10px] px-2 py-1 rounded hover:bg-[#00f3ff]/20 transition-colors font-mono"
                                                >
                                                    {reply}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Input Area */}
                                    <div className="p-2 border-t border-[#333] bg-[#0a0a12] flex gap-2">
                                        <button
                                            onClick={handleAiAssist}
                                            disabled={aiLoading || connectionStatus !== 'connected'}
                                            className="p-2 rounded bg-[#222] text-[#bc13fe] hover:bg-[#bc13fe]/20 disabled:opacity-30 border border-[#333] transition-colors"
                                            title="AI Assist"
                                        >
                                            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
                                        </button>
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                                            disabled={connectionStatus !== 'connected'}
                                            placeholder={connectionStatus === 'connected' ? "Enter secure message..." : "Waiting for link..."}
                                            className="flex-1 bg-black border border-[#333] rounded px-3 py-1 text-xs text-white font-mono outline-none focus:border-[#00f3ff] placeholder-gray-700"
                                        />
                                        <button
                                            onClick={() => sendChatMessage()}
                                            disabled={!chatInput.trim() || connectionStatus !== 'connected'}
                                            className="text-[#00f3ff] hover:text-white disabled:opacity-30 transition-colors p-1"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Action Area */}
                <div className="lg:col-span-7 border border-[#333] bg-[#0a0a12] rounded-lg relative min-h-[600px] flex flex-col items-center justify-center p-8 overflow-hidden">
                    {/* Background Grid */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none"
                        style={{
                            backgroundImage: `radial-gradient(${mode === 'send' ? '#00f3ff' : '#bc13fe'} 1px, transparent 1px)`,
                            backgroundSize: '30px 30px'
                        }}
                    />

                    {connectionStatus === 'connected' ? (
                        <div className="w-full max-w-md relative z-10">
                            {mode === 'send' ? (
                                <div className="space-y-6 animate-fadeIn">
                                    {!selectedFile ? (
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="h-64 border-2 border-dashed border-[#333] hover:border-[#00f3ff] hover:bg-[#00f3ff]/5 rounded-xl flex flex-col items-center justify-center cursor-pointer group transition-all duration-300"
                                        >
                                            <div className="w-20 h-20 rounded-full bg-[#222] group-hover:bg-[#00f3ff]/20 flex items-center justify-center mb-6 transition-colors">
                                                <UploadCloud size={32} className="text-gray-400 group-hover:text-[#00f3ff] transition-colors" />
                                            </div>
                                            <span className="font-display text-lg text-gray-400 group-hover:text-white tracking-wide">SELECT DATA PACKET</span>
                                            <span className="font-mono text-xs text-[#00f3ff] mt-2 opacity-0 group-hover:opacity-100 transition-opacity">CLICK TO BROWSE</span>
                                            <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                                        </div>
                                    ) : (
                                        <div className="bg-[#111] border border-[#00f3ff]/50 rounded-xl p-6 shadow-[0_0_30px_rgba(0,243,255,0.1)]">
                                            <div className="flex justify-between items-start mb-8">
                                                <div className="flex items-center gap-4">
                                                    <FileIcon size={32} className="text-[#00f3ff]" />
                                                    <div>
                                                        <h4 className="text-white font-bold truncate max-w-[200px]">{selectedFile.name}</h4>
                                                        <span className="text-xs text-gray-500 font-mono">{(selectedFile.size / 1024).toFixed(2)} KB</span>
                                                    </div>
                                                </div>
                                                {transferProgress === 0 && <button onClick={() => setSelectedFile(null)}><X className="text-gray-500 hover:text-white" /></button>}
                                            </div>

                                            {/* Encryption Toggle */}
                                            <div className="mb-6 bg-[#0a0a1a] border border-[#333] rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        {encryptFile ? (
                                                            <Lock size={18} className="text-[#00ff9d]" />
                                                        ) : (
                                                            <Unlock size={18} className="text-gray-500" />
                                                        )}
                                                        <span className="text-sm font-medium text-white">File Encryption</span>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setEncryptFile(!encryptFile);
                                                            if (!encryptFile) {
                                                                audioService.playSound('success');
                                                            }
                                                        }}
                                                        className={`relative w-12 h-6 rounded-full transition-colors ${encryptFile ? 'bg-[#00ff9d]' : 'bg-[#333]'
                                                            }`}
                                                    >
                                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${encryptFile ? 'translate-x-7' : 'translate-x-1'
                                                            }`} />
                                                    </button>
                                                </div>
                                                {encryptFile && (
                                                    <div className="animate-fadeIn">
                                                        <input
                                                            type="password"
                                                            value={filePassword}
                                                            onChange={(e) => setFilePassword(e.target.value)}
                                                            placeholder="Enter encryption password"
                                                            className="w-full bg-[#050510] border border-[#00ff9d]/30 rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-[#00ff9d] transition-colors"
                                                        />
                                                        <p className="text-xs text-gray-500 mt-2 font-mono">
                                                            🔒 File will be encrypted with AES-256 before transfer
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {transferProgress > 0 ? (
                                                <div>
                                                    <div className="h-2 bg-[#222] w-full mb-3 rounded-full overflow-hidden relative">
                                                        <div className="absolute inset-0 bg-[#00f3ff]/20 animate-pulse"></div>
                                                        <div className="h-full bg-[#00f3ff] transition-all duration-300 relative overflow-hidden" style={{ width: `${transferProgress}%` }}>
                                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1s_infinite]"></div>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between font-mono text-[10px] text-[#00f3ff]">
                                                        <span>TRANSMITTING...</span>
                                                        <span>{transferProgress}%</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={sendFile}
                                                    className="w-full py-3 bg-[#00f3ff] text-black font-bold font-display uppercase tracking-widest hover:bg-white transition-colors rounded-lg shadow-lg shadow-[#00f3ff]/20 animate-pulse-glow active:scale-95"
                                                >
                                                    INITIATE UPLOAD
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // RECEIVE UI
                                <div className="text-center animate-fadeIn">
                                    {!receivedMeta ? (
                                        <div className="animate-pulse opacity-50 flex flex-col items-center relative">
                                            <div className="absolute inset-0 animate-scanline opacity-30 pointer-events-none"></div>
                                            <div className="w-24 h-24 rounded-full border-4 border-[#bc13fe]/30 flex items-center justify-center mb-6 animate-[spin_4s_linear_infinite]">
                                                <Radio size={48} className="text-[#bc13fe]" />
                                            </div>
                                            <h3 className="font-display text-2xl text-white tracking-widest animate-text-shimmer">AWAITING SIGNAL</h3>
                                            <p className="font-mono text-xs text-[#bc13fe] mt-2">CHANNEL OPEN</p>
                                        </div>
                                    ) : (
                                        <div className="bg-[#111] border border-[#bc13fe]/50 rounded-xl p-6 shadow-[0_0_30px_rgba(188,19,254,0.1)]">
                                            <h4 className="text-white font-bold mb-6 font-display tracking-wider">INCOMING DATA DETECTED</h4>
                                            <div className="flex items-center gap-3 mb-6 bg-[#222] p-3 rounded">
                                                <FileIcon size={20} className="text-[#bc13fe]" />
                                                <span className="text-sm font-mono">{receivedMeta.name}</span>
                                            </div>

                                            <div className="h-2 bg-[#222] w-full mb-4 rounded-full overflow-hidden relative">
                                                <div className="absolute inset-0 bg-[#bc13fe]/20 animate-pulse"></div>
                                                <div className="h-full bg-[#bc13fe] transition-all duration-300 relative overflow-hidden" style={{ width: `${transferProgress}%` }}>
                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1s_infinite]"></div>
                                                </div>
                                            </div>

                                            {receivedFileUrl ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            // Create File object from blob URL for preview
                                                            fetch(receivedFileUrl)
                                                                .then(res => res.blob())
                                                                .then(blob => {
                                                                    const file = new File([blob], receivedMeta.name, { type: receivedMeta.mime });
                                                                    setPreviewFile(file);
                                                                    setShowPreview(true);
                                                                });
                                                        }}
                                                        className="flex-1 py-3 bg-[#00f3ff]/10 border border-[#00f3ff] text-[#00f3ff] font-bold font-display uppercase tracking-widest hover:bg-[#00f3ff] hover:text-black transition-colors rounded-lg flex items-center justify-center gap-2"
                                                    >
                                                        <Eye size={18} />
                                                        PREVIEW
                                                    </button>
                                                    <a
                                                        href={receivedFileUrl}
                                                        download={receivedMeta.name}
                                                        className="flex-1 py-3 bg-[#bc13fe] text-white font-bold font-display uppercase tracking-widest hover:bg-white hover:text-black transition-colors rounded-lg flex items-center justify-center gap-2"
                                                    >
                                                        <Download size={18} />
                                                        SAVE
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="text-[#bc13fe] font-mono text-xs animate-pulse">RECEIVING PACKETS...</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center opacity-30 flex flex-col items-center">
                            <ShieldCheck size={80} className="mb-4" />
                            <h3 className="font-display text-3xl tracking-widest">LINK REQUIRED</h3>
                            <p className="font-mono text-sm mt-2 max-w-xs">ESTABLISH PEER CONNECTION TO ENABLE TRANSFER PROTOCOLS</p>
                        </div>
                    )}
                </div>
            </div>

            {/* File Preview Modal */}
            <FilePreviewModal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                file={previewFile}
                fileUrl={receivedFileUrl || undefined}
            />
        </div>
    );
};

export default P2PShare;
