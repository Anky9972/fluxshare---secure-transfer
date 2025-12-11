import React, { useState, useEffect, useRef } from 'react';
import { Clipboard, Pin, Copy, Trash2, Search, Filter, Check, X, Code, Link, FileText, Share2, AlertCircle, Zap, Timer, Upload, Download, Wifi, Users, Send } from 'lucide-react';
import { clipboardService } from '../services/clipboardService';
import { storageService } from '../services/storageService';
import { notificationService } from '../services/notificationService';
import { audioService } from '../services/audioService';
import type { ClipboardItem as ClipItem } from '../types';

declare const Peer: any;

const ClipSync: React.FC = () => {
    const [clips, setClips] = useState<ClipItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'text' | 'code' | 'url' | 'other'>('all');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [autoCapture, setAutoCapture] = useState(false);
    const [batchCapture, setBatchCapture] = useState(false);
    const [batchTimeRemaining, setBatchTimeRemaining] = useState(0);
    const [lastClipboardContent, setLastClipboardContent] = useState<string>('');

    // P2P Sharing State
    const [peerId, setPeerId] = useState<string>('');
    const [targetId, setTargetId] = useState<string>('');
    const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [receivedClipIds, setReceivedClipIds] = useState<Set<string>>(new Set());
    const [sentClipIds, setSentClipIds] = useState<Set<string>>(new Set());
    const [idCopied, setIdCopied] = useState(false);
    const [myUsername, setMyUsername] = useState<string>('');
    const [peerUsername, setPeerUsername] = useState<string>('');

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const peerRef = useRef<any>(null);
    const connRef = useRef<any>(null);

    // Load clips on mount and set up refresh interval
    useEffect(() => {
        refreshClips();
        const interval = setInterval(refreshClips, 1000);
        return () => clearInterval(interval);
    }, [searchQuery, categoryFilter]);

    // Auto-capture clipboard monitoring
    useEffect(() => {
        if (!autoCapture) return;

        const monitorClipboard = async () => {
            try {
                const text = await navigator.clipboard.readText();
                // Only save if clipboard content changed and is not empty
                if (text && text.trim() !== '' && text !== lastClipboardContent) {
                    setLastClipboardContent(text);
                    clipboardService.saveClip(text);
                    refreshClips();
                    audioService.playSound('message');
                }
            } catch (error) {
                // Silently fail - clipboard permissions may be denied
                console.debug('Auto-capture clipboard read failed:', error);
            }
        };

        // Check clipboard every 2 seconds
        const interval = setInterval(monitorClipboard, 2000);
        return () => clearInterval(interval);
    }, [autoCapture, lastClipboardContent]);

    // Batch capture monitoring (30 second timer)
    useEffect(() => {
        if (!batchCapture) return;

        const monitorClipboard = async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text && text.trim() !== '' && text !== lastClipboardContent) {
                    setLastClipboardContent(text);
                    clipboardService.saveClip(text);
                    refreshClips();
                    audioService.playSound('message');
                }
            } catch (error) {
                console.debug('Batch capture clipboard read failed:', error);
            }
        };

        const interval = setInterval(monitorClipboard, 1000);
        return () => clearInterval(interval);
    }, [batchCapture, lastClipboardContent]);

    // Batch capture timer countdown
    useEffect(() => {
        if (!batchCapture || batchTimeRemaining <= 0) return;

        const timer = setInterval(() => {
            setBatchTimeRemaining(prev => {
                if (prev <= 1) {
                    setBatchCapture(false);
                    notificationService.showToast({ type: 'info', message: 'Batch capture completed!' });
                    audioService.playSound('success');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [batchCapture, batchTimeRemaining]);

    const refreshClips = () => {
        let result = clipboardService.getHistory();

        if (searchQuery) {
            result = clipboardService.searchClips(searchQuery);
        }

        if (categoryFilter !== 'all') {
            result = result.filter(clip => clip.category === categoryFilter);
        }

        setClips(result);
    };

    const handleCaptureClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text || text.trim() === '') {
                notificationService.showToast({ type: 'info', message: 'Clipboard is empty' });
                return;
            }

            const savedClip = clipboardService.saveClip(text);
            refreshClips();
            audioService.playSound('success');
            notificationService.showToast({ type: 'success', message: 'Clip saved!' });

            // Scroll to top
            scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error('Failed to read clipboard:', error);
            notificationService.showToast({ type: 'error', message: 'Failed to access clipboard' });
        }
    };

    const handleCopyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
            audioService.playSound('success');
            notificationService.showToast({ type: 'success', message: 'Copied to clipboard!' });
        } catch (error) {
            notificationService.showToast({ type: 'error', message: 'Failed to copy' });
        }
    };

    const handlePin = (id: string, isPinned: boolean) => {
        if (isPinned) {
            clipboardService.unpinClip(id);
            audioService.playSound('message');
        } else {
            clipboardService.pinClip(id);
            audioService.playSound('success');
        }
        refreshClips();
    };

    const handleDelete = (id: string) => {
        clipboardService.deleteClip(id);
        refreshClips();
        audioService.playSound('message');
        notificationService.showToast({ type: 'info', message: 'Clip deleted' });
    };

    const handleClearAll = () => {
        if (confirm('Clear all clipboard history? (Pinned clips will be kept)')) {
            clipboardService.clearHistory(true);
            refreshClips();
            notificationService.showToast({ type: 'success', message: 'History cleared' });
        }
    };

    const handleStartBatchCapture = () => {
        setBatchCapture(true);
        setBatchTimeRemaining(30); // 30 seconds
        audioService.playSound('success');
        notificationService.showToast({
            type: 'success',
            message: 'Batch capture started! Copy items now (30s)'
        });
    };

    const handleStopBatchCapture = () => {
        setBatchCapture(false);
        setBatchTimeRemaining(0);
        audioService.playSound('message');
        notificationService.showToast({ type: 'info', message: 'Batch capture stopped' });
    };

    const handleExportClips = () => {
        const allClips = clipboardService.getHistory();
        if (allClips.length === 0) {
            notificationService.showToast({ type: 'info', message: 'No clips to export' });
            return;
        }

        const dataStr = JSON.stringify(allClips, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `clipboard-history-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        audioService.playSound('success');
        notificationService.showToast({
            type: 'success',
            message: `Exported ${allClips.length} clips!`
        });
    };

    const handleImportClips = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const importedClips = JSON.parse(content) as ClipItem[];

                if (!Array.isArray(importedClips)) {
                    throw new Error('Invalid format');
                }

                // Import clips
                let imported = 0;
                importedClips.forEach(clip => {
                    if (clip.text && clip.text.trim() !== '') {
                        clipboardService.saveClip(clip.text, clip.category);
                        imported++;
                    }
                });

                refreshClips();
                audioService.playSound('success');
                notificationService.showToast({
                    type: 'success',
                    message: `Imported ${imported} clips!`
                });
            } catch (error) {
                console.error('Import failed:', error);
                notificationService.showToast({
                    type: 'error',
                    message: 'Failed to import - invalid JSON file'
                });
            }
        };
        reader.readAsText(file);

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // P2P Peer Initialization
    useEffect(() => {
        if (typeof Peer === 'undefined') return;
        const id = `CLIP-${Math.floor(Math.random() * 9000) + 1000}`;
        const iceServers = (import.meta.env.VITE_ICE_SERVERS || 'stun:stun.l.google.com:19302').split(',').map((url: string) => ({ urls: url.trim() }));
        const peerConfig: any = { debug: 2, config: { iceServers } };
        const envHost = import.meta.env.VITE_PEER_HOST;
        if (envHost && envHost.trim() !== '') {
            peerConfig.host = envHost;
            peerConfig.port = Number(import.meta.env.VITE_PEER_PORT) || 443;
            peerConfig.path = import.meta.env.VITE_PEER_PATH || '/';
            peerConfig.secure = import.meta.env.VITE_PEER_SECURE === 'true';
        } else {
            // Use public PeerJS cloud server as default
            peerConfig.host = '0.peerjs.com';
            peerConfig.port = 443;
            peerConfig.path = '/';
            peerConfig.secure = true;
        }
        const peer = new Peer(id, peerConfig);
        peer.on('open', (id: string) => setPeerId(id));
        peer.on('connection', (conn: any) => {
            connRef.current = conn;
            setConnectionStatus('connected');
            conn.on('data', (data: any) => {
                if (data.type === 'clip') {
                    const savedClip = clipboardService.saveClip(data.text, data.category);
                    setReceivedClipIds(prev => new Set([...prev, savedClip.id]));
                    refreshClips();
                    audioService.playSound('receive');
                    const senderName = data.username ? `${data.username}` : 'peer';
                    notificationService.showToast({ type: 'success', message: `Received clip from ${senderName}!` });
                    if (data.username) setPeerUsername(data.username);
                } else if (data.type === 'clips-batch') {
                    data.clips.forEach((clipData: any) => {
                        const savedClip = clipboardService.saveClip(clipData.text, clipData.category);
                        setReceivedClipIds(prev => new Set([...prev, savedClip.id]));
                    });
                    refreshClips();
                    audioService.playSound('receive');
                    const senderName = data.username ? `${data.username}` : 'peer';
                    notificationService.showToast({ type: 'success', message: `Received ${data.clips.length} clips from ${senderName}!` });
                    if (data.username) setPeerUsername(data.username);
                }
            });
            conn.on('open', () => { audioService.playSound('connect'); notificationService.showToast({ type: 'success', message: 'Connected!' }); });
            conn.on('close', () => { setConnectionStatus('disconnected'); connRef.current = null; audioService.playSound('disconnect'); });
        });
        peerRef.current = peer;
        return () => { if (peerRef.current) peerRef.current.destroy(); };
    }, []);


    const handleCopyPeerId = async () => {
        if (!peerId) return;
        try {
            await navigator.clipboard.writeText(peerId);
            setIdCopied(true);
            setTimeout(() => setIdCopied(false), 2000);
            audioService.playSound('success');
            notificationService.showToast({ type: 'success', message: 'Peer ID copied!' });
        } catch (error) {
            notificationService.showToast({ type: 'error', message: 'Failed to copy ID' });
        }
    };

    const handleConnect = () => {
        if (!targetId || !peerRef.current) return;
        setConnectionStatus('connecting');
        const conn = peerRef.current.connect(targetId);
        connRef.current = conn;
        conn.on('open', () => {
            setConnectionStatus('connected');
            audioService.playSound('connect');
            const displayName = peerUsername ? `${peerUsername} (${targetId})` : targetId;
            notificationService.showToast({ type: 'success', message: `Connected to ${displayName}!` });
        });
        conn.on('data', (data: any) => {
            if (data.type === 'clip') {
                const savedClip = clipboardService.saveClip(data.text, data.category);
                setReceivedClipIds(prev => new Set([...prev, savedClip.id]));
                refreshClips();
                audioService.playSound('receive');
                const senderName = data.username ? `${data.username}` : 'peer';
                notificationService.showToast({ type: 'success', message: `Received clip from ${senderName}!` });
                if (data.username) setPeerUsername(data.username);
            } else if (data.type === 'clips-batch') {
                data.clips.forEach((clipData: any) => {
                    const savedClip = clipboardService.saveClip(clipData.text, clipData.category);
                    setReceivedClipIds(prev => new Set([...prev, savedClip.id]));
                });
                refreshClips();
                audioService.playSound('receive');
                const senderName = data.username ? `${data.username}` : 'peer';
                notificationService.showToast({ type: 'success', message: `Received ${data.clips.length} clips from ${senderName}!` });
                if (data.username) setPeerUsername(data.username);
            }
        });
        conn.on('close', () => { setConnectionStatus('disconnected'); connRef.current = null; audioService.playSound('disconnect'); });
    };

    const handleDisconnect = () => {
        if (connRef.current) connRef.current.close();
        setConnectionStatus('disconnected');
        connRef.current = null;
    };

    const handleShareClip = (clip: ClipItem) => {
        if (!connRef.current || connectionStatus !== 'connected') {
            notificationService.showToast({ type: 'error', message: 'Not connected to peer' });
            return;
        }
        connRef.current.send({ type: 'clip', text: clip.text, category: clip.category, timestamp: Date.now() });
        setSentClipIds(prev => new Set([...prev, clip.id]));
        audioService.playSound('send');
        notificationService.showToast({ type: 'success', message: 'Clip shared!' });
    };

    const handleShareAll = () => {
        if (!connRef.current || connectionStatus !== 'connected') {
            notificationService.showToast({ type: 'error', message: 'Not connected to peer' });
            return;
        }
        const allClips = clipboardService.getHistory();
        if (allClips.length === 0) {
            notificationService.showToast({ type: 'info', message: 'No clips to share' });
            return;
        }
        connRef.current.send({ type: 'clips-batch', clips: allClips.map(c => ({ text: c.text, category: c.category })), timestamp: Date.now() });
        allClips.forEach(clip => setSentClipIds(prev => new Set([...prev, clip.id])));
        audioService.playSound('send');
        notificationService.showToast({ type: 'success', message: `Shared ${allClips.length} clips!` });
    };

    const formatTimestamp = (timestamp: number): string => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'code': return <Code size={16} className="text-[#bc13fe]" />;
            case 'url': return <Link size={16} className="text-[#00f3ff]" />;
            case 'text': return <FileText size={16} className="text-[#00ff9d]" />;
            default: return <Clipboard size={16} className="text-gray-500" />;
        }
    };

    const truncateText = (text: string, maxLength: number = 100): string => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    const stats = clipboardService.getStats();
    const pinnedClips = clips.filter(c => c.isPinned);
    const regularClips = clips.filter(c => !c.isPinned);

    return (
        <div className="flex flex-col h-full gap-6 animate-fadeIn">
            {/* Header */}
            <div className="bg-[#050510]/95 border border-[#f3ff00]/30 rounded-xl p-6 backdrop-blur-xl shadow-[0_0_30px_rgba(243,255,0,0.1)]">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#f3ff00]/20 flex items-center justify-center">
                            <Clipboard size={20} className="text-[#f3ff00]" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-display font-bold text-white tracking-tight">CLIP SYNC</h2>
                            <p className="text-xs text-gray-500 font-mono uppercase tracking-wider">Clipboard Management</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#f3ff00] animate-pulse"></span>
                            {stats.totalClips} CLIPS
                        </span>
                        <span className="text-gray-700">|</span>
                        <span className="flex items-center gap-1">
                            <Pin size={12} className="text-[#f3ff00]" />
                            {stats.pinnedCount} PINNED
                        </span>
                        {autoCapture && (
                            <>
                                <span className="text-gray-700">|</span>
                                <span className="flex items-center gap-1 text-[#00ff9d]">
                                    <Zap size={12} className="animate-pulse" />
                                    AUTO
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    {/* Toggle Auto-Capture */}
                    <div className="flex items-center gap-3 p-3 bg-[#0a0a12] border border-[#333] rounded-lg">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Zap size={14} className="text-[#00ff9d]" />
                                <span className="text-sm font-display font-bold text-white uppercase tracking-wider">Auto-Capture</span>
                            </div>
                            <p className="text-xs text-gray-500 font-mono">Automatically save all clipboard changes</p>
                        </div>
                        <button
                            onClick={() => {
                                setAutoCapture(!autoCapture);
                                audioService.playSound(autoCapture ? 'message' : 'success');
                                notificationService.showToast({
                                    type: autoCapture ? 'info' : 'success',
                                    message: autoCapture ? 'Auto-capture disabled' : 'Auto-capture enabled!'
                                });
                            }}
                            className={`relative w-14 h-7 rounded-full transition-all ${autoCapture
                                ? 'bg-[#00ff9d]'
                                : 'bg-[#333]'
                                }`}
                        >
                            <div
                                className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${autoCapture ? 'translate-x-7' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Batch Capture */}
                    <div className="flex items-center gap-3 p-3 bg-[#0a0a12] border border-[#333] rounded-lg">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Timer size={14} className="text-[#bc13fe]" />
                                <span className="text-sm font-display font-bold text-white uppercase tracking-wider">Batch Capture</span>
                                {batchCapture && (
                                    <span className="text-xs font-mono text-[#bc13fe] bg-[#bc13fe]/10 px-2 py-0.5 rounded">
                                        {batchTimeRemaining}s
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 font-mono">Capture multiple items for 30 seconds</p>
                        </div>
                        <button
                            onClick={batchCapture ? handleStopBatchCapture : handleStartBatchCapture}
                            disabled={autoCapture}
                            className={`px-4 py-2 rounded-lg font-display text-xs uppercase tracking-wider transition-all ${autoCapture
                                ? 'bg-[#222] border border-[#333] text-gray-600 cursor-not-allowed'
                                : batchCapture
                                    ? 'bg-[#ff0055]/20 border border-[#ff0055] text-[#ff0055] hover:bg-[#ff0055]/30'
                                    : 'bg-[#bc13fe]/20 border border-[#bc13fe] text-[#bc13fe] hover:bg-[#bc13fe]/30'
                                }`}
                        >
                            {batchCapture ? 'Stop' : 'Start'}
                        </button>
                        {/* P2P Connection Panel */}
                        <div className="flex flex-wrap items-center justify-center gap-3 p-3 bg-[#0a0a12] border border-[#00f3ff]/30 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Wifi size={14} className="text-[#00f3ff]" />
                                <div className="text-xs font-mono text-[#00f3ff]">MY ID: {peerId || 'INITIALIZING...'}</div>
                                {peerId && (
                                    <button
                                        onClick={handleCopyPeerId}
                                        className="p-1 hover:bg-[#00f3ff]/10 rounded transition-colors"
                                        title="Copy Peer ID"
                                    >
                                        {idCopied ? <Check size={12} className="text-[#00ff9d]" /> : <Copy size={12} className="text-[#00f3ff]" />}
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={targetId}
                                        onChange={(e) => setTargetId(e.target.value)}
                                        placeholder="Peer ID to connect"
                                        className="flex-1 bg-black/50 border border-[#333] rounded px-2 py-1 text-white text-xs font-mono outline-none focus:border-[#00f3ff]"
                                        disabled={connectionStatus === 'connected'}
                                    />
                                    {connectionStatus === 'connected' ? (
                                        <button
                                            onClick={handleDisconnect}
                                            className="bg-[#ff0055]/20 border border-[#ff0055] text-[#ff0055] px-3 py-1 rounded text-xs hover:bg-[#ff0055]/30 transition-all"
                                        >
                                            Disconnect
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleConnect}
                                            disabled={!targetId || connectionStatus === 'connecting'}
                                            className="bg-[#00f3ff]/20 border border-[#00f3ff] text-[#00f3ff] px-3 py-1 rounded text-xs hover:bg-[#00f3ff]/30 transition-all disabled:opacity-50"
                                        >
                                            {connectionStatus === 'connecting' ? 'Connecting...' : 'Connect'}
                                        </button>
                                    )}
                                </div>
                            </div>
                            {connectionStatus === 'connected' && (
                                <button
                                    onClick={handleShareAll}
                                    className="bg-[#00ff9d]/20 border border-[#00ff9d] text-[#00ff9d] px-4 py-2 rounded text-xs hover:bg-[#00ff9d]/30 transition-all flex items-center gap-1"
                                >
                                    <Send size={12} /> Share All
                                </button>
                            )}
                        </div>


                    </div>

                    {/* Manual Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleCaptureClipboard}
                            disabled={autoCapture || batchCapture}
                            className={`flex-1 px-4 py-3 rounded-lg font-display text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${autoCapture || batchCapture
                                ? 'bg-[#222] border border-[#333] text-gray-600 cursor-not-allowed'
                                : 'bg-[#f3ff00]/20 border border-[#f3ff00] text-[#f3ff00] hover:bg-[#f3ff00] hover:text-black'
                                }`}
                        >
                            <Clipboard size={16} />
                            Capture Now
                        </button>

                        {/* Import / Export */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleImportClips}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-[#00f3ff]/10 border border-[#00f3ff]/30 text-[#00f3ff] px-4 py-3 rounded-lg hover:bg-[#00f3ff]/20 hover:border-[#00f3ff] transition-all font-display text-sm uppercase tracking-wider flex items-center gap-2"
                            title="Import clipboard history from JSON file"
                        >
                            <Upload size={16} />
                        </button>
                        <button
                            onClick={handleExportClips}
                            className="bg-[#00f3ff]/10 border border-[#00f3ff]/30 text-[#00f3ff] px-4 py-3 rounded-lg hover:bg-[#00f3ff]/20 hover:border-[#00f3ff] transition-all font-display text-sm uppercase tracking-wider flex items-center gap-2"
                            title="Export clipboard history to JSON file"
                        >
                            <Download size={16} />
                        </button>

                        <button
                            onClick={handleClearAll}
                            className="bg-[#222] border border-[#ff0055]/30 text-[#ff0055] px-4 py-3 rounded-lg hover:bg-[#ff0055]/20 hover:border-[#ff0055] transition-all font-display text-sm uppercase tracking-wider flex items-center gap-2"
                        >
                            <Trash2 size={16} />
                            Clear All
                        </button>
                    </div>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="flex gap-3">
                <div className="flex-1 relative">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search clips..."
                        className="w-full bg-[#0a0a12] border border-[#333] text-white pl-10 pr-4 py-2 rounded-lg font-mono text-sm focus:border-[#f3ff00] focus:outline-none transition-colors"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as any)}
                    className="bg-[#0a0a12] border border-[#333] text-white px-4 py-2 rounded-lg font-mono text-sm focus:border-[#f3ff00] focus:outline-none transition-colors"
                >
                    <option value="all">All</option>
                    <option value="text">Text</option>
                    <option value="code">Code</option>
                    <option value="url">URL</option>
                    <option value="other">Other</option>
                </select>
            </div>

            {/* Clips Container */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin space-y-6">
                {/* Pinned Clips */}
                {pinnedClips.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Pin size={14} className="text-[#f3ff00]" />
                            <h3 className="text-sm font-display font-bold text-[#f3ff00] uppercase tracking-wider">Pinned</h3>
                            <div className="flex-1 h-px bg-[#f3ff00]/20"></div>
                        </div>
                        <div className="space-y-3">
                            {pinnedClips.map((clip) => (
                                <ClipCard
                                    key={clip.id}
                                    clip={clip}
                                    copiedId={copiedId}
                                    expandedId={expandedId}
                                    onCopy={handleCopyToClipboard}
                                    onPin={handlePin}
                                    onDelete={handleDelete}
                                    onToggleExpand={setExpandedId}
                                    formatTimestamp={formatTimestamp}
                                    getCategoryIcon={getCategoryIcon}
                                    truncateText={truncateText}
                                    connectionStatus={connectionStatus}
                                    onShare={handleShareClip}
                                    isSent={sentClipIds.has(clip.id)}
                                    isReceived={receivedClipIds.has(clip.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Regular Clips */}
                {regularClips.length > 0 && (
                    <div>
                        {pinnedClips.length > 0 && (
                            <div className="flex items-center gap-2 mb-3">
                                <Clipboard size={14} className="text-gray-500" />
                                <h3 className="text-sm font-display font-bold text-gray-500 uppercase tracking-wider">History</h3>
                                <div className="flex-1 h-px bg-[#333]"></div>
                            </div>
                        )}
                        <div className="space-y-3">
                            {regularClips.map((clip) => (
                                <ClipCard
                                    key={clip.id}
                                    clip={clip}
                                    copiedId={copiedId}
                                    expandedId={expandedId}
                                    onCopy={handleCopyToClipboard}
                                    onPin={handlePin}
                                    onDelete={handleDelete}
                                    onToggleExpand={setExpandedId}
                                    formatTimestamp={formatTimestamp}
                                    getCategoryIcon={getCategoryIcon}
                                    truncateText={truncateText}
                                    connectionStatus={connectionStatus}
                                    onShare={handleShareClip}
                                    isSent={sentClipIds.has(clip.id)}
                                    isReceived={receivedClipIds.has(clip.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {clips.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#222] flex items-center justify-center mb-4">
                            <AlertCircle size={32} className="text-gray-600" />
                        </div>
                        <h3 className="text-lg font-display text-gray-500 mb-2">NO_CLIPS_FOUND</h3>
                        <p className="text-sm text-gray-700 font-mono">Capture clipboard to start saving clips</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Clip Card Component
interface ClipCardProps {
    clip: ClipItem;
    copiedId: string | null;
    expandedId: string | null;
    onCopy: (text: string, id: string) => void;
    onPin: (id: string, isPinned: boolean) => void;
    onDelete: (id: string) => void;
    onToggleExpand: (id: string | null) => void;
    formatTimestamp: (timestamp: number) => string;
    getCategoryIcon: (category: string) => JSX.Element;
    truncateText: (text: string, maxLength?: number) => string;
    // P2P Props
    connectionStatus: 'disconnected' | 'connecting' | 'connected';
    onShare?: (clip: ClipItem) => void;
    isSent?: boolean;
    isReceived?: boolean;
}

const ClipCard: React.FC<ClipCardProps> = ({
    clip,
    copiedId,
    expandedId,
    onCopy,
    onPin,
    onDelete,
    onToggleExpand,
    formatTimestamp,
    getCategoryIcon,
    truncateText,
    connectionStatus,
    onShare,
    isSent = false,
    isReceived = false
}) => {
    const isExpanded = expandedId === clip.id;
    const displayText = isExpanded ? clip.text : truncateText(clip.text);

    return (
        <div className="relative bg-[#0a0a12] border border-[#333] hover:border-[#f3ff00]/50 rounded-lg p-4 transition-all group">
            {/* P2P Status Badges */}
            {isReceived && (
                <div className="absolute top-2 right-2 bg-[#00f3ff]/20 border border-[#00f3ff] text-[#00f3ff] px-2 py-0.5 rounded text-[10px] font-mono z-10">
                    📥 RECEIVED
                </div>
            )}
            {isSent && !isReceived && (
                <div className="absolute top-2 right-2 bg-[#00ff9d]/20 border border-[#00ff9d] text-[#00ff9d] px-2 py-0.5 rounded text-[10px] font-mono z-10">
                    📤 SENT
                </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    {getCategoryIcon(clip.category)}
                    <span className="text-xs text-gray-500 font-mono uppercase">{clip.category}</span>
                    {clip.language && (
                        <span className="text-xs text-[#bc13fe] font-mono">({clip.language})</span>
                    )}
                </div>
                <span className="text-xs text-gray-700 font-mono">{formatTimestamp(clip.timestamp)}</span>
            </div>

            {/* Content */}
            <div
                onClick={() => onToggleExpand(isExpanded ? null : clip.id)}
                className="mb-3 cursor-pointer"
            >
                <pre className={`text-sm text-white font-mono leading-relaxed whitespace-pre-wrap break-words ${clip.category === 'code' ? 'bg-black/50 p-2 rounded border border-[#333]' : ''}`}>
                    {displayText}
                </pre>
                {clip.text.length > 100 && (
                    <button className="text-xs text-[#f3ff00] hover:underline mt-1 font-mono">
                        {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onCopy(clip.text, clip.id)}
                    className="flex-1 bg-[#f3ff00]/10 border border-[#f3ff00]/30 text-[#f3ff00] px-3 py-1.5 rounded text-xs font-mono uppercase hover:bg-[#f3ff00]/20 transition-colors flex items-center justify-center gap-2"
                >
                    {copiedId === clip.id ? <Check size={14} /> : <Copy size={14} />}
                    {copiedId === clip.id ? 'Copied!' : 'Copy'}
                </button>

                <button
                    onClick={() => onPin(clip.id, clip.isPinned)}
                    className={`px-3 py-1.5 rounded text-xs font-mono uppercase transition-colors flex items-center gap-2 ${clip.isPinned
                        ? 'bg-[#f3ff00]/20 border border-[#f3ff00] text-[#f3ff00]'
                        : 'bg-[#222] border border-[#333] text-gray-500 hover:text-white hover:border-white'
                        }`}
                >
                    <Pin size={14} />
                </button>

                <button
                    onClick={() => onDelete(clip.id)}
                    className="px-3 py-1.5 rounded text-xs font-mono uppercase bg-[#222] border border-[#333] text-gray-500 hover:text-[#ff0055] hover:border-[#ff0055] transition-colors flex items-center gap-2"
                >
                    <Trash2 size={14} />
                </button>

                {connectionStatus === 'connected' && onShare && (
                    <button
                        onClick={() => onShare(clip)}
                        className="px-3 py-1.5 rounded text-xs font-mono uppercase bg-[#00f3ff]/10 border border-[#00f3ff] text-[#00f3ff] hover:bg-[#00f3ff]/20 transition-colors flex items-center gap-2"
                        title="Share clip"
                    >
                        <Share2 size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default ClipSync;
