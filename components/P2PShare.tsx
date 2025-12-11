import React, { useState, useRef, useEffect } from 'react';
import { Send, Download, Monitor, Video, Copy, QrCode, X, FileText, Image as ImageIcon, Music, Film, Archive, RefreshCw, Smartphone, Shield, AlertTriangle, Check, Clock, Globe, Zap, Search, Sun, Moon, Link, Eye, Share2, BarChart2, ArrowRight, Bot, Sparkles, Terminal, MessageSquare, ShieldCheck, UploadCloud, Lock, Unlock, Loader2, CheckCircle2, Wifi, Pause, Play, XCircle } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { FileTransfer, ChatMessage } from '../types';
import FilePreviewModal from './FilePreviewModal';
import QRCodeGenerator from './shared/QRCodeGenerator';
import FavoritesPanel from './FavoritesPanel';
import TransferHistoryPanel from './TransferHistoryPanel';
import AnalyticsDashboard from './AnalyticsDashboard';
import { storageService } from '../services/storageService';
import { audioService } from '../services/audioService';
import { notificationService } from '../services/notificationService';
import { encryptionService } from '../services/encryptionService';
import { transferQueueService, QueuedFile } from '../services/transferQueueService';
import { resumableTransferService } from '../services/resumableTransferService';

declare const Peer: any;
const CHUNK_SIZE = 16 * 1024;

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

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
    const [idCopied, setIdCopied] = useState(false);
    const [myUsername, setMyUsername] = useState('Anonymous');
    const [peerUsername, setPeerUsername] = useState('Peer');

    // File State
    const [files, setFiles] = useState<File[]>([]); // Changed to array for multiple files
    const [transferProgress, setTransferProgress] = useState(0);
    const [currentSpeed, setCurrentSpeed] = useState(0);
    const [receivedFileUrl, setReceivedFileUrl] = useState<string | null>(null);
    const [receivedMeta, setReceivedMeta] = useState<{ name: string, size: number, mime: string, isEncrypted?: boolean } | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const [showQR, setShowQR] = useState(false);
    const [encryptFile, setEncryptFile] = useState(false);
    const [filePassword, setFilePassword] = useState('');
    const [decryptPassword, setDecryptPassword] = useState('');
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

    // Queue State
    const [fileQueue, setFileQueue] = useState<QueuedFile[]>([]);
    const [currentTransferId, setCurrentTransferId] = useState<string | null>(null);
    const [isPaused, setIsPaused] = useState(false);

    // AI Analysis State
    const [aiAnalysis, setAiAnalysis] = useState<Record<string, any>>({});
    const [analyzingFiles, setAnalyzingFiles] = useState<Record<string, boolean>>({});

    const peerRef = useRef<any>(null);
    const connRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const receivedChunksRef = useRef<ArrayBuffer[]>([]);
    const receivedSizeRef = useRef(0);
    const transferStartTimeRef = useRef<number>(0);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Sync queue state
    useEffect(() => {
        const handleQueueUpdate = () => {
            setFileQueue(transferQueueService.getAllFiles());
        };

        transferQueueService.on(handleQueueUpdate);
        return () => transferQueueService.off(handleQueueUpdate);
    }, []);

    useEffect(() => {
        const initPeer = () => {
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

                // @ts-ignore
                const iceServers = (import.meta.env.VITE_ICE_SERVERS || 'stun:stun.l.google.com:19302')
                    .split(',')
                    .map((url: string) => ({ urls: url.trim() }));

                const peerConfig: any = {
                    debug: 2,
                    config: { iceServers }
                };

                // @ts-ignore
                const envHost = import.meta.env.VITE_PEER_HOST;
                if (envHost && envHost.trim() !== '') {
                    // @ts-ignore
                    peerConfig.host = envHost;
                    // @ts-ignore
                    peerConfig.port = Number(import.meta.env.VITE_PEER_PORT) || 443;
                    // @ts-ignore
                    peerConfig.path = import.meta.env.VITE_PEER_PATH || '/';
                    // @ts-ignore
                    peerConfig.secure = import.meta.env.VITE_ENV !== 'development';
                } else {
                    // Use local peer server by default
                    peerConfig.host = 'localhost';
                    peerConfig.port = 9000;
                    peerConfig.path = '/';
                    peerConfig.secure = false;
                }

                const peer = new Peer(customId, peerConfig);

                peer.on('open', (id: string) => {
                    setPeerId(id);
                    addLog(`System initialized. ID: ${id}`);
                    addSystemMessage("Secure terminal ready.");
                    setConnectionStatus('disconnected');
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

            const history = storageService.getHistory();
            if (!history.find(h => h.peerId === conn.peer)) {
                storageService.saveTransfer({
                    id: Date.now().toString(),
                    peerId: conn.peer,
                    fileName: 'Connection',
                    fileSize: 0, // Handle 0kb check if needed, mainly logical
                    timestamp: Date.now(),
                    direction: 'sent',
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

    // Store encryption metadata temporarily
    const encryptionMetaRef = useRef<{ salt: string, iv: string, originalMime: string, originalName: string } | null>(null);

    const handleData = (data: any) => {
        if (data.type === 'encryption-meta') {
            // Store encryption metadata for later decryption
            encryptionMetaRef.current = {
                salt: data.salt,
                iv: data.iv,
                originalMime: data.originalMime,
                originalName: data.originalName
            };
            addLog('Encrypted file incoming - password will be required');
        } else if (data.type === 'meta') {
            receivedChunksRef.current = [];
            receivedSizeRef.current = 0;
            setReceivedMeta({
                name: data.name,
                size: data.size,
                mime: data.mime,
                isEncrypted: data.isEncrypted
            });
            if (data.username) setPeerUsername(data.username);
            setTransferProgress(0);
            addLog(`Receiving stream: ${data.name}${data.isEncrypted ? ' (Encrypted)' : ''}`);
            addSystemMessage(`Incoming data stream: ${data.name}`);
            transferStartTimeRef.current = Date.now();

            // Show password prompt if encrypted
            if (data.isEncrypted) {
                setShowPasswordPrompt(true);
            }
        } else if (data.type === 'chunk') {
            receivedChunksRef.current.push(data.data);
            receivedSizeRef.current += data.data.byteLength;
            if (receivedMeta) {
                setTransferProgress(Math.round((receivedSizeRef.current / receivedMeta.size) * 100));
                // Calculate Speed
                const elapsed = (Date.now() - transferStartTimeRef.current) / 1000;
                if (elapsed > 0) {
                    setCurrentSpeed(receivedSizeRef.current / elapsed);
                }
            }
        } else if (data.type === 'end') {
            addLog('Transfer complete. Reassembling...');
            addSystemMessage('Data stream verified. Transfer complete.');
            const blob = new Blob(receivedChunksRef.current, { type: receivedMeta?.mime || 'application/octet-stream' });

            // If encrypted, we'll decrypt when user provides password
            if (receivedMeta?.isEncrypted) {
                // Store encrypted blob temporarily
                const url = URL.createObjectURL(blob);
                setReceivedFileUrl(url);
                setShowPasswordPrompt(true);
                addSystemMessage('File received. Enter password to decrypt.');
            } else {
                const url = URL.createObjectURL(blob);
                setReceivedFileUrl(url);

                // Create a file object with correct metadata for preview
                if (receivedMeta) {
                    const receivedFile = new File([blob], receivedMeta.name, {
                        type: receivedMeta.mime,
                        lastModified: Date.now()
                    });
                    setPreviewFile(receivedFile);
                }
            }

            setTransferProgress(100);
            setCurrentSpeed(0);
            audioService.playSound('success');

            // Save to history
            if (receivedMeta && connRef.current) {
                storageService.saveTransfer({
                    id: generateUUID(),
                    peerId: connRef.current.peer,
                    fileName: receivedMeta.name,
                    fileSize: receivedMeta.size,
                    timestamp: Date.now(),
                    direction: 'received',
                    speed: receivedMeta.size / Math.max(0.001, (Date.now() - transferStartTimeRef.current) / 1000),
                    success: true
                });
            }
        } else if (data.type === 'chat') {
            setChatHistory(prev => [...prev, { id: generateUUID(), sender: 'peer', text: data.text, timestamp: data.timestamp }]);
            audioService.playSound('message');
            if (activeTab !== 'chat') {
                setUnreadCount(prev => prev + 1);
            }
        } else if (data.type === 'clipboard') {
            // Handle incoming clipboard sync
            addLog(`Clipboard received from peer: ${data.text.substring(0, 50)}...`);
            addSystemMessage('Peer sent clipboard content');

            // Show notification with option to copy
            if (confirm(`Peer shared clipboard:\n\n"${data.text.substring(0, 100)}${data.text.length > 100 ? '...' : ''}"\n\nCopy to your clipboard?`)) {
                navigator.clipboard.writeText(data.text).then(() => {
                    notificationService.showToast({ type: 'success', message: 'Copied to clipboard!' });
                    audioService.playSound('success');
                }).catch((err) => {
                    console.error('Clipboard write failed:', err);
                    notificationService.showToast({ type: 'error', message: 'Failed to copy to clipboard' });
                });
            }
        }
    };

    // Decrypt received file
    const decryptReceivedFile = async () => {
        if (!receivedFileUrl || !receivedMeta || !decryptPassword) {
            notificationService.showToast({ type: 'error', message: 'Missing file or password' });
            return;
        }

        try {
            addLog('Decrypting file...');

            // Fetch the encrypted blob
            const response = await fetch(receivedFileUrl);
            const encryptedBlob = await response.blob();

            if (!encryptionMetaRef.current) {
                throw new Error('Encryption metadata not found');
            }

            // Create encrypted file object
            const encryptedFileData = {
                encryptedData: await encryptedBlob.arrayBuffer(),
                salt: encryptionMetaRef.current.salt,
                iv: encryptionMetaRef.current.iv,
                fileName: encryptionMetaRef.current.originalName,
                mimeType: encryptionMetaRef.current.originalMime,
                originalSize: receivedMeta.size
            };

            // Decrypt
            const decryptedFile = await encryptionService.decryptFile(encryptedFileData, decryptPassword);

            // Create new URL for decrypted file
            const decryptedUrl = URL.createObjectURL(decryptedFile);
            setReceivedFileUrl(decryptedUrl);
            setPreviewFile(decryptedFile);
            setShowPasswordPrompt(false);
            setDecryptPassword('');

            addLog('File decrypted successfully!');
            addSystemMessage('Decryption complete.');
            audioService.playSound('success');
            notificationService.showToast({ type: 'success', message: 'File decrypted successfully!' });

        } catch (error: any) {
            console.error('Decryption failed:', error);
            addLog(`Decryption failed: ${error.message}`);
            notificationService.showToast({ type: 'error', message: 'Decryption failed - wrong password?' });
        }
    };

    const resetTransfer = () => {
        setTransferProgress(0);
        setFiles([]);
        setReceivedFileUrl(null);
        setReceivedMeta(null);
        receivedChunksRef.current = [];
        receivedSizeRef.current = 0;
    };

    const sendFile = async () => {
        if (files.length === 0 || !connRef.current) return;

        // Add files to queue
        files.forEach((file) => {
            transferQueueService.addFile(file, encryptFile, filePassword);
        });

        // Clear file selection
        setFiles([]);
        setFilePassword('');

        // Start processing queue
        processQueue();
    };

    const processQueue = async () => {
        const nextFile = transferQueueService.getNextFile();
        if (!nextFile || !connRef.current) return;

        const { id, file, encrypted, password } = nextFile;
        setCurrentTransferId(id);
        transferQueueService.startFile(id);

        addLog(`Starting upload: ${file.name}${encrypted ? ' (Encrypted)' : ''}`);
        addSystemMessage(`Initiating upload: ${file.name} (${formatBytes(file.size)})`);

        try {
            let fileToSend = file;
            let finalMime = file.type;
            let finalSize = file.size;
            let isEncrypted = false;

            // Encrypt file if requested
            if (encrypted && password) {
                addLog('Encrypting file...');
                const encryptedData = await encryptionService.encryptFile(file, password);
                fileToSend = new File(
                    [encryptedData.encryptedData],
                    file.name,
                    { type: 'application/octet-stream' }
                );
                finalMime = 'application/octet-stream';
                finalSize = encryptedData.encryptedData.byteLength;
                isEncrypted = true;

                // Send encryption metadata
                connRef.current.send({
                    type: 'encryption-meta',
                    salt: encryptedData.salt,
                    iv: encryptedData.iv,
                    originalMime: encryptedData.mimeType,
                    originalName: encryptedData.fileName
                });
            }

            // Check for resumable transfer
            const resumeState = resumableTransferService.findMatchingTransfer(
                file.name,
                file.size,
                connRef.current.peer,
                'send'
            );

            let offset = resumeState ? resumableTransferService.getResumeOffset(resumeState.transferId) : 0;

            // Create or update transfer state
            const transferState = resumeState || resumableTransferService.createTransferState(
                file.name,
                file.size,
                file.type,
                connRef.current.peer,
                'send',
                isEncrypted
            );

            // Send Metadata
            connRef.current.send({
                type: 'meta',
                username: myUsername,
                name: file.name,
                size: finalSize,
                mime: finalMime,
                isEncrypted,
                transferId: transferState.transferId,
                resumeOffset: offset
            });

            transferStartTimeRef.current = Date.now();

            // Handle empty files immediately
            if (finalSize === 0) {
                connRef.current.send({ type: 'end' });
                transferQueueService.completeFile(id);
                addLog('Empty file sent successfully.');
                addSystemMessage('Upload complete (Empty file).');
                audioService.playSound('success');

                storageService.saveTransfer({
                    id: generateUUID(),
                    peerId: connRef.current.peer,
                    fileName: file.name,
                    fileSize: 0,
                    timestamp: Date.now(),
                    direction: 'sent',
                    speed: 0,
                    success: true
                });

                resumableTransferService.removeTransferState(transferState.transferId);
                processQueue(); // Process next file
                return;
            }

            const reader = new FileReader();
            let chunkIndex = Math.floor(offset / CHUNK_SIZE);

            reader.onerror = (err) => {
                console.error("FileReader error:", err);
                addLog(`Error reading file: ${reader.error?.message}`);
                addSystemMessage('Upload failed: Read error.');
                transferQueueService.failFile(id, reader.error?.message || 'Read error');
                resumableTransferService.removeTransferState(transferState.transferId);
            };

            reader.onload = (e) => {
                if (e.target?.result && !isPaused) {
                    const chunk = e.target.result as ArrayBuffer;

                    if (chunk.byteLength > 0) {
                        connRef.current.send({
                            type: 'chunk',
                            data: chunk,
                            chunkIndex: chunkIndex
                        });
                    }

                    offset += chunk.byteLength;
                    chunkIndex++;

                    const progress = Math.min(100, Math.round((offset / finalSize) * 100));
                    setTransferProgress(progress);

                    // Calculate Speed
                    const elapsed = (Date.now() - transferStartTimeRef.current) / 1000;
                    const speed = elapsed > 0 ? offset / elapsed : 0;
                    setCurrentSpeed(speed);

                    // Update queue and resumable state
                    transferQueueService.updateProgress(id, offset, finalSize, speed);
                    resumableTransferService.updateProgress(transferState.transferId, offset, chunkIndex);

                    if (offset < finalSize) {
                        readNextChunk();
                    } else {
                        connRef.current.send({ type: 'end' });
                        transferQueueService.completeFile(id);
                        addLog('Upload successfully completed.');
                        addSystemMessage('Upload complete.');
                        setCurrentSpeed(0);
                        audioService.playSound('success');

                        // Save to history
                        storageService.saveTransfer({
                            id: generateUUID(),
                            peerId: connRef.current.peer,
                            fileName: file.name,
                            fileSize: file.size,
                            timestamp: Date.now(),
                            direction: 'sent',
                            speed: finalSize / Math.max(0.001, (Date.now() - transferStartTimeRef.current) / 1000),
                            success: true
                        });

                        resumableTransferService.removeTransferState(transferState.transferId);
                        setCurrentTransferId(null);

                        // Process next file in queue
                        setTimeout(() => processQueue(), 100);
                    }
                }
            };

            const readNextChunk = () => {
                if (isPaused) return;

                requestAnimationFrame(() => {
                    if (offset < finalSize) {
                        const slice = fileToSend.slice(offset, offset + CHUNK_SIZE);
                        reader.readAsArrayBuffer(slice);
                    }
                });
            };

            // Start reading
            readNextChunk();

        } catch (error: any) {
            console.error('Send file error:', error);
            addLog(`Upload failed: ${error.message}`);
            transferQueueService.failFile(id, error.message);
        }
    };

    const sendChatMessage = (text: string = chatInput) => {
        if (!text.trim() || !connRef.current) return;

        const msg = { type: 'chat', text: text, timestamp: Date.now() };
        connRef.current.send(msg);

        setChatHistory(prev => [...prev, { id: generateUUID(), sender: 'me', text: text, timestamp: Date.now() }]);
        setChatInput('');
        setQuickReplies([]);
    };

    // Clipboard sync feature
    const syncClipboard = async () => {
        if (!connRef.current) {
            notificationService.showToast({ type: 'error', message: 'No active connection' });
            return;
        }

        try {
            const clipboardText = await navigator.clipboard.readText();
            if (!clipboardText || clipboardText.trim() === '') {
                notificationService.showToast({ type: 'info', message: 'Clipboard is empty' });
                return;
            }

            // Send clipboard content
            connRef.current.send({
                type: 'clipboard',
                text: clipboardText,
                timestamp: Date.now()
            });

            addLog(`Clipboard synced: ${clipboardText.substring(0, 50)}...`);
            addSystemMessage('Clipboard content sent to peer');
            audioService.playSound('success');
            notificationService.showToast({ type: 'success', message: 'Clipboard synced!' });
        } catch (error) {
            console.error('Clipboard read failed:', error);
            notificationService.showToast({ type: 'error', message: 'Failed to read clipboard' });
        }
    };

    const handleAiAssist = async () => {
        if (!connRef.current) return;
        setAiLoading(true);
        const lastPeerMsg = [...chatHistory].reverse().find(m => m.sender === 'peer')?.text || '';
        const suggestions = await geminiService.generateQuickReplies(lastPeerMsg);
        setQuickReplies(suggestions);
        setAiLoading(false);
    };

    // --- FILE HANDLING WITH AI ---
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            processNewFiles(newFiles);
        }
    };

    //Handle folder drag and drop
    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const items = e.dataTransfer.items;
        const newFiles: File[] = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i].webkitGetAsEntry();
            if (item) {
                await traverseFileTree(item, '', newFiles);
            }
        }

        if (newFiles.length > 0) {
            processNewFiles(newFiles);
        }
    };

    // Traverse directory tree recursively
    const traverseFileTree = async (item: any, path: string, files: File[]): Promise<void> => {
        return new Promise((resolve) => {
            if (item.isFile) {
                item.file((file: File) => {
                    // Create new file with path info
                    const newFile = new File([file], path + file.name, { type: file.type });
                    files.push(newFile);
                    resolve();
                });
            } else if (item.isDirectory) {
                const dirReader = item.createReader();
                dirReader.readEntries(async (entries: any[]) => {
                    for (const entry of entries) {
                        await traverseFileTree(entry, path + item.name + '/', files);
                    }
                    resolve();
                });
            }
        });
    };

    // Process new files (common for both file input and drag-drop)
    const processNewFiles = (newFiles: File[]) => {
        setFiles(prev => [...prev, ...newFiles]);

        // Trigger AI Analysis for each new file
        newFiles.forEach(async (file) => {
            const fileId = `${file.name}-${file.size}`;
            setAnalyzingFiles(prev => ({ ...prev, [fileId]: true }));

            try {
                let analysis;
                if (file.type.startsWith('image/')) {
                    // Convert to base64 for vision API
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        const base64 = reader.result as string;
                        analysis = await geminiService.analyzeImage(base64);
                        setAiAnalysis(prev => ({ ...prev, [fileId]: analysis }));
                        setAnalyzingFiles(prev => ({ ...prev, [fileId]: false }));
                    };
                    reader.readAsDataURL(file);
                } else {
                    // Standard metadata analysis
                    analysis = await geminiService.analyzeFile(file);
                    setAiAnalysis(prev => ({ ...prev, [fileId]: analysis }));
                    setAnalyzingFiles(prev => ({ ...prev, [fileId]: false }));
                }
            } catch (err) {
                console.error("AI Analysis failed", err);
                setAnalyzingFiles(prev => ({ ...prev, [fileId]: false }));
            }
        });
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    // RENDER HELPERS
    if (mode === 'menu') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                <button
                    onClick={() => setMode('send')}
                    className="group relative bg-[#050510]/90 backdrop-blur-md border border-[#00f3ff]/30 hover:border-[#00f3ff] flex flex-col items-center justify-center transition-all duration-500 overflow-hidden rounded-lg active:scale-95 h-[240px] shadow-[0_0_20px_rgba(0,243,255,0.1)]"
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
                    className="group relative bg-[#050510]/90 backdrop-blur-md border border-[#bc13fe]/30 hover:border-[#bc13fe] flex flex-col items-center justify-center transition-all duration-500 overflow-hidden rounded-lg active:scale-95 h-[240px] shadow-[0_0_20px_rgba(188,19,254,0.1)]"
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
                    className="group relative bg-[#050510]/90 backdrop-blur-md border border-[#00ff9d]/30 hover:border-[#00ff9d] flex flex-col items-center justify-center transition-all duration-500 overflow-hidden rounded-lg active:scale-95 h-[240px] shadow-[0_0_20px_rgba(0,255,157,0.1)]"
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
                    className="group relative bg-[#050510]/90 backdrop-blur-md border border-[#f3ff00]/30 hover:border-[#f3ff00] flex flex-col items-center justify-center transition-all duration-500 overflow-hidden rounded-lg active:scale-95 h-[240px] shadow-[0_0_20px_rgba(243,255,0,0.1)]"
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

    if (mode === 'history') {
        return (
            <div className="animate-fadeIn">
                <button onClick={() => setMode('menu')} className="flex items-center gap-2 text-gray-500 hover:text-white font-mono text-xs uppercase tracking-widest transition-colors mb-6">
                    <ArrowRight size={16} className="rotate-180" /> Back to Menu
                </button>
                <TransferHistoryPanel />
            </div>
        );
    }

    if (mode === 'analytics') {
        return (
            <div className="animate-fadeIn">
                <button onClick={() => setMode('menu')} className="flex items-center gap-2 text-gray-500 hover:text-white font-mono text-xs uppercase tracking-widest transition-colors mb-6">
                    <ArrowRight size={16} className="rotate-180" /> Back to Menu
                </button>
                <AnalyticsDashboard metrics={{
                    currentSpeed: currentSpeed,
                    peersConnected: connectionStatus === 'connected' ? 1 : 0,
                    activeTransfers: transferProgress > 0 && transferProgress < 100 ? 1 : 0,
                    latency: 0 // Cannot easily measure without ping/pong, keeping 0 to avoid hardcoding fake data
                }} />
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
                {/* Left Panel: Connection & Files */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    {/* ID Card */}
                    <div className="bg-[#050510]/95 border border-[#00f3ff]/30 p-6 rounded-xl backdrop-blur-xl relative overflow-hidden group shadow-[0_0_30px_rgba(0,243,255,0.1)]">
                        <span className="text-[#00f3ff] font-mono text-[10px] uppercase tracking-widest absolute top-2 left-3">LOCAL_NODE_ID</span>
                        <div className="mt-4 flex items-center gap-2">
                            <div className="flex-1 flex items-center bg-[#000] p-2 rounded border border-[#00f3ff]/10">
                                <span className="font-mono text-lg text-white tracking-wider truncate mr-2">{peerId || '...'}</span>
                            </div>
                            <button
                                onClick={async () => {
                                    if (!peerId) {
                                        notificationService.showToast({ type: 'error', message: 'No ID to copy yet!' });
                                        return;
                                    }
                                    try {
                                        await navigator.clipboard.writeText(peerId);
                                        setIdCopied(true);
                                        setTimeout(() => setIdCopied(false), 2000);
                                        audioService.playSound('success');
                                        notificationService.showToast({ type: 'success', message: 'ID copied!' });
                                    } catch (error) {
                                        console.error('Copy failed:', error);
                                        // Fallback for browsers that don't support clipboard API
                                        const textArea = document.createElement('textarea');
                                        textArea.value = peerId;
                                        document.body.appendChild(textArea);
                                        textArea.select();
                                        try {
                                            document.execCommand('copy');
                                            setIdCopied(true);
                                            setTimeout(() => setIdCopied(false), 2000);
                                            audioService.playSound('success');
                                            notificationService.showToast({ type: 'success', message: 'ID copied!' });
                                        } catch (fallbackError) {
                                            notificationService.showToast({ type: 'error', message: 'Failed to copy ID' });
                                        } finally {
                                            document.body.removeChild(textArea);
                                        }
                                    }
                                }}
                                disabled={!peerId}
                                className="text-[#00f3ff] hover:text-white transition-colors shrink-0 p-2 bg-[#000] border border-[#00f3ff]/10 rounded min-w-[36px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Copy ID"
                            >
                                {idCopied ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                            <button onClick={() => setShowQR(!showQR)} className="text-[#bc13fe] hover:text-white transition-colors shrink-0 p-2 bg-[#000] border border-[#bc13fe]/10 rounded" title="Show QR Code">
                                <QrCode size={16} />
                            </button>
                        </div>
                        {showQR && peerId && (
                            <div className="mt-3 flex justify-center">
                                <QRCodeGenerator value={peerId} title="SCAN_TO_CONNECT" size={150} showActions={true} className="w-full" />
                            </div>
                        )}
                    </div>

                    <FavoritesPanel onPeerSelect={(id) => { setTargetId(id); setTimeout(() => { const connectBtn = document.querySelector('[data-connect-btn]'); connectBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100); }} className="shrink-0" />

                    {connectionStatus !== 'connected' && (
                        <div className="p-4 border border-[#bc13fe]/30 bg-[#0a0a15] rounded-lg shrink-0">
                            <label className="text-[#bc13fe] font-mono text-[10px] uppercase tracking-widest block mb-2">TARGET_NODE_ID</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={targetId}
                                    onChange={(e) => setTargetId(e.target.value)}
                                    placeholder="Enter Peer ID to connect..."
                                    className="flex-1 bg-black/80 border border-[#333] rounded px-4 py-2 text-white font-mono placeholder-gray-600 focus:border-[#bc13fe] outline-none transition-colors"
                                />
                                <button
                                    onClick={connectToPeer}
                                    disabled={connectionStatus === 'connecting'}
                                    className="bg-[#bc13fe]/20 border border-[#bc13fe] text-[#bc13fe] px-4 py-2 rounded hover:bg-[#bc13fe] hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                                >          <Search size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 flex flex-col border border-[#333] bg-[#0a0a12] rounded-lg overflow-hidden">
                        <div className="flex border-b border-[#333]">
                            <button onClick={() => setActiveTab('logs')} className={`flex-1 py-2 font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 ${activeTab === 'logs' ? 'bg-[#222] text-white' : 'bg-[#0a0a12] text-gray-500 hover:text-gray-300'}`}>
                                <Terminal size={12} /> System Logs
                            </button>
                            <button onClick={() => setActiveTab('chat')} className={`flex-1 py-2 font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 relative ${activeTab === 'chat' ? 'bg-[#222] text-[#00f3ff]' : 'bg-[#0a0a12] text-gray-500 hover:text-gray-300'}`}>
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
                                                    <div className={`max-w-[85%] p-2 rounded text-xs font-mono leading-relaxed break-words ${msg.sender === 'me' ? 'bg-[#00f3ff]/10 text-[#00f3ff] border border-[#00f3ff]/20 rounded-tr-none' : 'bg-[#bc13fe]/10 text-[#bc13fe] border border-[#bc13fe]/20 rounded-tl-none'}`}>
                                                        {msg.text}
                                                    </div>
                                                )}
                                                {msg.sender !== 'system' && <span className="text-[8px] text-gray-700 mt-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                            </div>
                                        ))}
                                        <div ref={chatEndRef} />
                                    </div>
                                    {quickReplies.length > 0 && (
                                        <div className="flex gap-2 p-2 bg-[#0a0a15] overflow-x-auto scrollbar-none border-t border-[#222]">
                                            {quickReplies.map((reply, i) => (
                                                <button key={i} onClick={() => sendChatMessage(reply)} className="whitespace-nowrap bg-[#00f3ff]/10 border border-[#00f3ff]/30 text-[#00f3ff] text-[10px] px-2 py-1 rounded hover:bg-[#00f3ff]/20 transition-colors font-mono">
                                                    {reply}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <div className="p-2 border-t border-[#333] bg-[#0a0a12] flex gap-2">
                                        <button onClick={handleAiAssist} disabled={aiLoading || connectionStatus !== 'connected'} className="p-2 rounded bg-[#222] text-[#bc13fe] hover:bg-[#bc13fe]/20 disabled:opacity-30 border border-[#333] transition-colors" title="AI Assist">
                                            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Bot size={16} />}
                                        </button>
                                        <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()} disabled={connectionStatus !== 'connected'} placeholder={connectionStatus === 'connected' ? "Enter secure message..." : "Waiting for link..."} className="flex-1 bg-black border border-[#333] rounded px-3 py-1 text-xs text-white font-mono outline-none focus:border-[#00f3ff] placeholder-gray-700" />
                                        <button onClick={() => sendChatMessage()} disabled={!chatInput.trim() || connectionStatus !== 'connected'} className="text-[#00f3ff] hover:text-white disabled:opacity-30 transition-colors p-1">
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel: File Transfer Area */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                    <div className="flex-1 bg-[#050510]/95 border border-[#333] rounded-xl p-6 backdrop-blur-xl relative overflow-hidden flex flex-col items-center justify-center shadow-lg">
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `radial-gradient(${mode === 'send' ? '#00f3ff' : '#bc13fe'} 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />

                        {connectionStatus === 'connected' ? (
                            <div className="w-full max-w-md relative z-10">
                                {mode === 'send' ? (
                                    <div className="space-y-6 animate-fadeIn">
                                        {files.length === 0 ? (
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                onDrop={handleDrop}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDragEnter={(e) => e.preventDefault()}
                                                className="h-64 border-2 border-dashed border-[#333] hover:border-[#00f3ff] hover:bg-[#00f3ff]/5 rounded-xl flex flex-col items-center justify-center cursor-pointer group transition-all duration-300"
                                            >
                                                <div className="w-20 h-20 rounded-full bg-[#222] group-hover:bg-[#00f3ff]/20 flex items-center justify-center mb-6 transition-colors">
                                                    <UploadCloud size={32} className="text-gray-400 group-hover:text-[#00f3ff] transition-colors" />
                                                </div>
                                                <span className="font-display text-lg text-gray-400 group-hover:text-white tracking-wide">SELECT DATA PACKET</span>
                                                <span className="font-mono text-xs text-[#00f3ff] mt-2 opacity-0 group-hover:opacity-100 transition-opacity">CLICK OR DROP FILES/FOLDERS</span>
                                                <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {/* File List */}
                                                {files.map((file, idx) => {
                                                    const fileId = `${file.name}-${file.size}`;
                                                    const analysis = aiAnalysis[fileId];
                                                    const isAnalyzing = analyzingFiles[fileId];

                                                    return (
                                                        <div key={idx} className="bg-[#111] border border-[#00f3ff]/50 rounded-xl p-4 shadow-[0_0_30px_rgba(0,243,255,0.1)] relative">
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div className="flex items-center gap-4">
                                                                    <FileText size={32} className="text-[#00f3ff]" />
                                                                    <div>
                                                                        <h4 className="text-white font-bold truncate max-w-[200px]">{file.name}</h4>
                                                                        <span className="text-xs text-gray-500 font-mono">{formatBytes(file.size)}</span>
                                                                    </div>
                                                                </div>
                                                                <button onClick={() => removeFile(idx)}><X className="text-gray-500 hover:text-white" /></button>
                                                            </div>

                                                            {/* AI Badge */}
                                                            <div className="mb-4">
                                                                {isAnalyzing ? (
                                                                    <div className="flex items-center gap-2 text-xs text-[#00f3ff] font-mono animate-pulse">
                                                                        <Sparkles size={12} /> Analyzing content...
                                                                    </div>
                                                                ) : analysis ? (
                                                                    <div className="bg-[#00f3ff]/5 border border-[#00f3ff]/20 rounded p-2 text-xs animate-fadeIn">
                                                                        <div className="flex items-center gap-1.5 text-[#00f3ff] mb-1 font-bold">
                                                                            <Bot size={12} />
                                                                            {file.type.startsWith('image/') ? 'AI VISION' : 'AI ANALYSIS'}
                                                                        </div>
                                                                        <p className="text-gray-300 mb-1.5">
                                                                            {analysis.description || analysis.caption || "Content analyzed."}
                                                                        </p>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {(analysis.tags || analysis.keywords || []).map((tag: string, i: number) => (
                                                                                <span key={i} className="bg-[#00f3ff]/10 text-[#00f3ff] px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono uppercase">
                                                                                    #{tag}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {/* Encryption Controls */}
                                                <div className="bg-[#0a0a15] border border-[#00f3ff]/20 rounded-lg p-4 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            {encryptFile ? <Lock size={16} className="text-[#00f3ff]" /> : <Unlock size={16} className="text-gray-500" />}
                                                            <span className="text-xs font-mono uppercase tracking-wider text-gray-400">Encryption</span>
                                                        </div>
                                                        <button
                                                            onClick={() => setEncryptFile(!encryptFile)}
                                                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${encryptFile ? 'bg-[#00f3ff] text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                                        >
                                                            {encryptFile ? 'ENABLED' : 'DISABLED'}
                                                        </button>
                                                    </div>
                                                    {encryptFile && (
                                                        <input
                                                            type="password"
                                                            value={filePassword}
                                                            onChange={(e) => setFilePassword(e.target.value)}
                                                            placeholder="Enter encryption password..."
                                                            className="w-full bg-black border border-[#00f3ff]/30 rounded px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:border-[#00f3ff] outline-none"
                                                        />
                                                    )}
                                                </div>

                                                <button onClick={sendFile} disabled={encryptFile && !filePassword} className="w-full py-4 bg-[#00f3ff] text-black font-bold font-display tracking-widest hover:bg-[#00c2cc] transition-colors rounded-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
                                                    <Send size={20} /> {encryptFile ? 'ENCRYPT & TRANSFER' : 'INITIATE TRANSFER'} ({files.length})
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center space-y-6 animate-fadeIn">
                                        {receivedFileUrl ? (
                                            <div className="bg-[#050510]/95 border border-[#bc13fe] rounded-xl p-8 backdrop-blur-xl shadow-[0_0_30px_rgba(188,19,254,0.3)]">
                                                <CheckCircle2 size={64} className="text-[#bc13fe] mx-auto mb-4" />
                                                <h3 className="text-2xl font-bold text-white mb-2">TRANSFER COMPLETE</h3>
                                                <p className="text-gray-400 mb-6 font-mono text-sm">{receivedMeta?.name}</p>
                                                <div className="flex gap-4 justify-center">
                                                    <a href={receivedFileUrl} download={receivedMeta?.name} className="flex items-center gap-2 bg-[#bc13fe] text-white px-6 py-3 rounded hover:bg-[#a010d8] transition-colors font-bold">
                                                        <Download size={20} /> SAVE FILE
                                                    </a>
                                                    <button
                                                        onClick={async () => {
                                                            if (receivedFileUrl && receivedMeta) {
                                                                const response = await fetch(receivedFileUrl);
                                                                const blob = await response.blob();
                                                                const file = new File([blob], receivedMeta.name, { type: receivedMeta.mime });
                                                                setPreviewFile(file);
                                                                setShowPreview(true);
                                                            }
                                                        }}
                                                        className="flex items-center gap-2 bg-[#222] text-white px-6 py-3 rounded hover:bg-[#333] transition-colors border border-[#333]"
                                                    >
                                                        <Eye size={20} /> PREVIEW
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="animate-pulse">
                                                <div className="w-24 h-24 rounded-full border-4 border-[#bc13fe] border-t-transparent animate-spin mx-auto mb-6"></div>
                                                <h3 className="text-xl font-bold text-white tracking-widest">AWAITING INCOMING STREAM...</h3>
                                                <p className="text-[#bc13fe] font-mono text-xs mt-2">CHANNEL_OPEN // LISTENING</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Progress Bar */}
                                {(transferProgress > 0 && transferProgress < 100) && (
                                    <div className="mt-8">
                                        <div className="flex justify-between items-center text-xs font-mono text-gray-400 mb-2">
                                            <span>TRANSFER_STATUS</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[#00f3ff]">{formatBytes(currentSpeed)}/s</span>
                                                <span>{transferProgress}%</span>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-[#222] rounded-full overflow-hidden mb-3">
                                            <div className="h-full bg-gradient-to-r from-[#00f3ff] to-[#bc13fe] transition-all duration-300" style={{ width: `${transferProgress}%` }}></div>
                                        </div>
                                        {/* Pause/Resume Controls */}
                                        {mode === 'send' && currentTransferId && (
                                            <div className="flex gap-2 justify-center">
                                                <button
                                                    onClick={() => setIsPaused(!isPaused)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-[#222] border border-[#00f3ff]/30 text-[#00f3ff] rounded hover:bg-[#00f3ff]/10 transition-colors text-xs font-mono uppercase"
                                                >
                                                    {isPaused ? (
                                                        <><Play size={14} /> RESUME</>
                                                    ) : (
                                                        <><Pause size={14} /> PAUSE</>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (currentTransferId) {
                                                            transferQueueService.cancelFile(currentTransferId);
                                                            setCurrentTransferId(null);
                                                            setIsPaused(false);
                                                            setTransferProgress(0);
                                                            setCurrentSpeed(0);
                                                            resetTransfer();
                                                        }
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-2 bg-[#222] border border-[#ff0055]/30 text-[#ff0055] rounded hover:bg-[#ff0055]/10 transition-colors text-xs font-mono uppercase"
                                                >
                                                    <XCircle size={14} /> CANCEL
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center opacity-50">
                                <Wifi size={64} className="text-gray-600 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-gray-600">ESTABLISH CONNECTION TO BEGIN</h3>
                            </div>
                        )}
                    </div>
                </div>

                {showPreview && previewFile && (
                    <FilePreviewModal
                        isOpen={showPreview}
                        onClose={() => setShowPreview(false)}
                        file={previewFile}
                        fileUrl={receivedFileUrl || undefined}
                        fileSize={receivedMeta?.size}
                    />
                )}

                {/* Password Decryption Modal */}
                {showPasswordPrompt && receivedMeta?.isEncrypted && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
                        <div className="bg-[#0a0a15] border-2 border-[#bc13fe] rounded-xl p-8 max-w-md w-full mx-4 shadow-[0_0_50px_rgba(188,19,254,0.5)] animate-scaleIn">
                            <div className="flex items-center gap-3 mb-6">
                                <Lock size={32} className="text-[#bc13fe]" />
                                <h3 className="text-2xl font-bold text-white font-display">ENCRYPTED FILE</h3>
                            </div>
                            <p className="text-gray-400 mb-6 font-mono text-sm">
                                This file is encrypted. Enter the password to decrypt and view.
                            </p>
                            <div className="space-y-4">
                                <input
                                    type="password"
                                    value={decryptPassword}
                                    onChange={(e) => setDecryptPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && decryptReceivedFile()}
                                    placeholder="Enter decryption password..."
                                    autoFocus
                                    className="w-full bg-black border border-[#bc13fe]/50 rounded px-4 py-3 text-white font-mono placeholder-gray-600 focus:border-[#bc13fe] outline-none"
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={decryptReceivedFile}
                                        disabled={!decryptPassword}
                                        className="flex-1 bg-[#bc13fe] text-white px-6 py-3 rounded font-bold hover:bg-[#a010d8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <Unlock size={20} /> DECRYPT
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowPasswordPrompt(false);
                                            setDecryptPassword('');
                                        }}
                                        className="px-6 py-3 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                                    >
                                        CANCEL
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default P2PShare;
