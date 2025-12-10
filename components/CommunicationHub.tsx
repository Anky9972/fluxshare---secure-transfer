import React, { useState, useEffect, useRef } from 'react';
import { Video, Mic, MicOff, VideoOff, Phone, PhoneOff, Users, MessageSquare, Send, Search, Wifi, ShieldCheck, Activity, SwitchCamera, Smile, Play, Pause, Monitor, MonitorOff, Sparkles, FileText, Loader2, Copy, Check } from 'lucide-react';
import { ChatMessage, VoiceRecording } from '../types';
import CyberpunkEmojiPicker from './shared/EmojiPicker';
import { audioService } from '../services/audioService';
import { notificationService } from '../services/notificationService';
import { geminiService } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import WhiteboardPanel from './WhiteboardPanel';

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

const CommunicationHub: React.FC = () => {
    const [myId, setMyId] = useState<string>('');
    const [targetId, setTargetId] = useState<string>('');
    const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle');
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [logs, setLogs] = useState<string[]>([]);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [chatInput, setChatInput] = useState('');
    const [isRecordingVoice, setIsRecordingVoice] = useState(false);
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [activeTab, setActiveTab] = useState<'chat' | 'whiteboard'>('chat');
    const [isTyping, setIsTyping] = useState(false);
    const [peerTyping, setPeerTyping] = useState(false);
    const [remoteStrokes, setRemoteStrokes] = useState<any[]>([]);
    const [transcribingId, setTranscribingId] = useState<string | null>(null);
    const [isAnalyzingWhiteboard, setIsAnalyzingWhiteboard] = useState(false);
    const [isImprovingMessage, setIsImprovingMessage] = useState(false);
    const [idCopied, setIdCopied] = useState(false);

    const peerRef = useRef<any>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const currentCallRef = useRef<any>(null);
    const connRef = useRef<any>(null);

    useEffect(() => {
        const initPeer = async () => {
            try {
                const id = `FLUX-COMM-${Math.floor(Math.random() * 9000) + 1000}`;

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
                    addLog(`Communication Node Online: ${id}`);
                });

                peer.on('call', (call: any) => {
                    setCallStatus('incoming');
                    addLog(`Incoming call from ${call.peer}`);
                    currentCallRef.current = call;
                });

                peer.on('connection', (conn: any) => {
                    handleDataConnection(conn);
                });

                peer.on('error', (err: any) => {
                    addLog(`Error: ${err.type}`);
                    console.error(err);
                });

                peerRef.current = peer;

                // Get local stream immediately for preview
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    localStreamRef.current = stream;
                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = stream;
                    }
                } catch (err) {
                    addLog("Could not access camera/mic");
                    console.error(err);
                }

            } catch (err) {
                console.error("Init failed", err);
            }
        };

        initPeer();

        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (peerRef.current) {
                peerRef.current.destroy();
            }
        };
    }, []);

    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 20)]);
    };

    const handleDataConnection = (conn: any) => {
        connRef.current = conn;
        conn.on('data', (data: any) => {
            if (data.type === 'chat') {
                setChatHistory(prev => [...prev, {
                    id: generateUUID(),
                    sender: 'peer',
                    text: data.text,
                    timestamp: data.timestamp || Date.now()
                }]);
                notificationService.notifyNewMessage('Peer', data.text);
            } else if (data.type === 'voice') {
                // Receive voice message
                const voiceRecording: VoiceRecording = {
                    id: generateUUID(),
                    audioData: data.audioData,
                    duration: data.duration,
                    timestamp: data.timestamp,
                    waveformData: data.waveformData,
                    blob: new Blob() // Placeholder, will be created from audioData
                };
                setChatHistory(prev => [...prev, {
                    id: generateUUID(),
                    sender: 'peer',
                    text: '',
                    timestamp: data.timestamp,
                    voiceRecording
                }]);
                notificationService.notifyNewMessage('Peer', '🎤 Voice message');
                audioService.playSound('receive');
            } else if (data.type === 'whiteboard') {
                // Receive whiteboard stroke from peer
                setRemoteStrokes(prev => [...prev, data.stroke]);
            } else if (data.type === 'whiteboard-clear') {
                // Clear whiteboard when peer clears
                setRemoteStrokes([]);
            }
        });
        conn.on('open', () => {
            addLog(`Data link established with ${conn.peer}`);
        });
    };

    const answerCall = () => {
        if (!currentCallRef.current || !localStreamRef.current) return;

        const call = currentCallRef.current;
        call.answer(localStreamRef.current);
        setCallStatus('connected');

        call.on('stream', (remoteStream: MediaStream) => {
            remoteStreamRef.current = remoteStream;
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
        });

        call.on('close', () => {
            endCall();
        });
    };

    const startCall = () => {
        if (!targetId || !peerRef.current || !localStreamRef.current) return;

        addLog(`Calling ${targetId}...`);
        setCallStatus('calling');

        // Connect data first
        const conn = peerRef.current.connect(targetId);
        handleDataConnection(conn);

        // Call media
        const call = peerRef.current.call(targetId, localStreamRef.current);
        currentCallRef.current = call;

        call.on('stream', (remoteStream: MediaStream) => {
            setCallStatus('connected');
            remoteStreamRef.current = remoteStream;
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
        });

        call.on('close', () => {
            endCall();
        });

        call.on('error', (err: any) => {
            addLog(`Call error: ${err}`);
            endCall();
        });
    };

    const endCall = () => {
        if (currentCallRef.current) {
            currentCallRef.current.close();
        }
        if (connRef.current) {
            connRef.current.close();
        }
        setCallStatus('idle');
        remoteStreamRef.current = null;
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }
        addLog("Call ended");
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoEnabled(videoTrack.enabled);
            }
        }
    };

    const toggleAudio = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioEnabled(audioTrack.enabled);
            }
        }
    };

    const sendChat = () => {
        if (!chatInput.trim() || !connRef.current) return;
        connRef.current.send({ type: 'chat', text: chatInput, timestamp: Date.now() });
        setChatHistory(prev => [...prev, { id: generateUUID(), sender: 'me', text: chatInput, timestamp: Date.now() }]);
        setChatInput('');
        audioService.playSound('send');
    };

    const startVoiceRecording = async () => {
        try {
            await audioService.startRecording();
            setIsRecordingVoice(true);
        } catch (error) {
            notificationService.showToast({ type: 'error', message: 'Failed to start recording' });
        }
    };

    const stopVoiceRecording = async () => {
        try {
            const recording = await audioService.stopRecording();
            setIsRecordingVoice(false);

            // Send voice message
            if (connRef.current) {
                const audioData = await audioService.recordingToBase64(recording);
                connRef.current.send({
                    type: 'voice',
                    audioData,
                    duration: recording.duration,
                    timestamp: Date.now(),
                    waveformData: recording.waveformData
                });

                // Add to local chat
                setChatHistory(prev => [...prev, {
                    id: generateUUID(),
                    sender: 'me',
                    text: '',
                    timestamp: Date.now(),
                    voiceRecording: recording
                }]);

                audioService.playSound('send');
                notificationService.showToast({ type: 'success', message: 'Voice message sent!' });
            }
        } catch (error) {
            setIsRecordingVoice(false);
            notificationService.showToast({ type: 'error', message: 'Failed to send voice message' });
        }
    };

    const playVoiceMessage = async (recording: VoiceRecording) => {
        try {
            setPlayingVoiceId(recording.id);
            if (recording.audioData) {
                // Convert base64 to blob recording
                const rec = audioService.base64ToRecording(recording.audioData, recording.duration, recording.waveformData);
                await audioService.playRecording(rec);
            } else if (recording.blob) {
                // Play directly if blob exists
                await audioService.playRecording({
                    id: recording.id,
                    blob: recording.blob,
                    duration: recording.duration,
                    timestamp: recording.timestamp,
                    waveformData: recording.waveformData
                });
            }
            setPlayingVoiceId(null);
        } catch (error) {
            setPlayingVoiceId(null);
            console.error('Failed to play voice message:', error);
        }
    };

    const handleEmojiSelect = (emoji: string) => {
        setChatInput(prev => prev + emoji);
    };

    const flipCamera = async () => {
        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';

        try {
            // Stop current tracks
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }

            // Get new stream with flipped camera
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: newFacingMode },
                audio: true
            });

            localStreamRef.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            setFacingMode(newFacingMode);
            addLog(`Switched to ${newFacingMode === 'user' ? 'front' : 'back'} camera`);

            // If in a call, update the stream
            if (currentCallRef.current && callStatus === 'connected') {
                const videoTrack = stream.getVideoTracks()[0];
                const sender = currentCallRef.current.peerConnection
                    .getSenders()
                    .find((s: any) => s.track && s.track.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            }
        } catch (err) {
            addLog('Could not flip camera');
            console.error(err);
        }
    };

    const toggleScreenShare = async () => {
        try {
            if (!isScreenSharing) {
                // Start screen sharing
                const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({
                    video: {
                        cursor: 'always',
                        displaySurface: 'monitor'
                    },
                    audio: false
                });

                // Replace video track with screen track
                const screenTrack = screenStream.getVideoTracks()[0];

                // Handle when user stops sharing via browser UI
                screenTrack.onended = () => {
                    setIsScreenSharing(false);
                    // Restart camera
                    flipCamera().catch(() => {
                        addLog('Could not restart camera after screen share');
                    });
                };

                // Update local video
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = screenStream;
                }

                // Update stream reference
                const oldVideoTrack = localStreamRef.current?.getVideoTracks()[0];
                if (oldVideoTrack) {
                    oldVideoTrack.stop();
                    localStreamRef.current?.removeTrack(oldVideoTrack);
                }
                localStreamRef.current?.addTrack(screenTrack);

                // Update peer connection if in call
                if (currentCallRef.current && callStatus === 'connected') {
                    const sender = currentCallRef.current.peerConnection
                        .getSenders()
                        .find((s: any) => s.track && s.track.kind === 'video');
                    if (sender) {
                        await sender.replaceTrack(screenTrack);
                    }
                }

                setIsScreenSharing(true);
                addLog('Screen sharing started');
                notificationService.showToast({ type: 'success', message: 'Screen sharing started' });
            } else {
                // Stop screen sharing and go back to camera
                const cameraConstraints = {
                    video: {
                        facingMode: facingMode,
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: true
                };

                const cameraStream = await navigator.mediaDevices.getUserMedia(cameraConstraints);
                const videoTrack = cameraStream.getVideoTracks()[0];

                // Update local video
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = cameraStream;
                }

                // Update stream reference
                const oldVideoTrack = localStreamRef.current?.getVideoTracks()[0];
                if (oldVideoTrack) {
                    oldVideoTrack.stop();
                    localStreamRef.current?.removeTrack(oldVideoTrack);
                }
                localStreamRef.current = cameraStream;

                // Update peer connection if in call
                if (currentCallRef.current && callStatus === 'connected') {
                    const sender = currentCallRef.current.peerConnection
                        .getSenders()
                        .find((s: any) => s.track && s.track.kind === 'video');
                    if (sender) {
                        await sender.replaceTrack(videoTrack);
                    }
                }

                setIsScreenSharing(false);
                addLog('Screen sharing stopped');
                notificationService.showToast({ type: 'info', message: 'Screen sharing stopped' });
            }
        } catch (err) {
            addLog('Screen share toggle failed');
            notificationService.showToast({ type: 'error', message: 'Screen sharing not available or denied' });
            console.error(err);
        }
    };



    const handleTranscribe = async (msgId: string, recording: VoiceRecording) => {
        if (!recording.audioData) return;
        setTranscribingId(msgId);
        try {
            const text = await geminiService.transcribeAudio(recording.audioData);
            setChatHistory(prev => prev.map(m => m.id === msgId ? { ...m, text: `[🎤 Transcription]: ${text}` } : m));
            notificationService.showToast({ type: 'success', message: 'Transcription complete' });
        } catch (error) {
            notificationService.showToast({ type: 'error', message: 'Transcription failed' });
        } finally {
            setTranscribingId(null);
        }
    };

    const handleWhiteboardAnalyze = async (imageData: string) => {
        setIsAnalyzingWhiteboard(true);
        try {
            const analysis = await geminiService.analyzeImage(imageData);

            // Send analysis result as a chat message
            const text = `🎨 **AI Whiteboard Analysis**\n\n**${analysis.caption}**\n\n*Keywords: ${analysis.keywords?.join(', ')}*`;

            setChatHistory(prev => [...prev, {
                id: generateUUID(),
                sender: 'me',
                text: text,
                timestamp: Date.now()
            }]);

            if (connRef.current) {
                connRef.current.send({ type: 'chat', text: text, timestamp: Date.now() });
            }

            notificationService.showToast({ type: 'success', message: 'Whiteboard analyzed!' });
            setActiveTab('chat'); // Switch to chat to see result
        } catch (error) {
            notificationService.showToast({ type: 'error', message: 'Analysis failed' });
        } finally {
            setIsAnalyzingWhiteboard(false);
        }
    };

    const handleImproveMessage = async () => {
        if (!chatInput.trim()) return;
        setIsImprovingMessage(true);
        try {
            const improved = await geminiService.improveMessage(chatInput, 'professional');
            setChatInput(improved);
            notificationService.showToast({ type: 'success', message: 'Message improved!' });
        } catch (error) {
            notificationService.showToast({ type: 'error', message: 'Failed to improve message' });
        } finally {
            setIsImprovingMessage(false);
        }
    };

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 min-h-[60vh] lg:h-[70vh] overflow-y-auto">
            {/* Left Panel: Controls & Logs */}
            <div className="lg:col-span-1 flex flex-col gap-4 order-1 lg:order-1">
                {/* ID Card */}
                <div className="bg-[#050510]/95 border border-[#00f3ff]/30 p-6 rounded-xl backdrop-blur-xl relative overflow-hidden group shadow-[0_0_30px_rgba(0,243,255,0.1)]">
                    <div className="absolute inset-0 bg-[#00f3ff]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <h3 className="text-[#00f3ff] font-display font-bold mb-2 flex items-center gap-2 relative z-10">
                        <ShieldCheck size={18} /> MY_IDENTITY
                    </h3>
                    <div className="flex items-center gap-2 mb-2 relative z-10">
                        <div className="font-mono text-2xl text-white tracking-wider">{myId || 'INITIALIZING...'}</div>
                        {myId && (
                            <button
                                onClick={async () => {
                                    if (!myId) {
                                        notificationService.showToast({ type: 'error', message: 'No ID available yet!' });
                                        return;
                                    }
                                    try {
                                        await navigator.clipboard.writeText(myId);
                                        setIdCopied(true);
                                        setTimeout(() => setIdCopied(false), 2000);
                                        audioService.playSound('success');
                                        notificationService.showToast({ type: 'success', message: 'ID copied!' });
                                    } catch (error) {
                                        console.error('Copy failed:', error);
                                        // Fallback for browsers that don't support clipboard API
                                        const textArea = document.createElement('textarea');
                                        textArea.value = myId;
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
                                disabled={!myId}
                                className="text-[#00f3ff] hover:text-white transition-colors p-2 hover:bg-[#00f3ff]/10 rounded disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                title="Copy ID"
                            >
                                {idCopied ? <Check size={20} /> : <Copy size={20} />}
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-[#00f3ff]/60 text-xs relative z-10">
                        <Activity size={12} className="animate-pulse" />
                        <span>ENCRYPTED_UPLINK_ACTIVE</span>
                    </div>
                </div>

                {/* Connection Panel */}
                <div className="bg-[#050510]/95 border border-[#bc13fe]/30 p-6 rounded-xl backdrop-blur-xl flex-1 flex flex-col shadow-[0_0_30px_rgba(188,19,254,0.1)]">
                    <h3 className="text-[#bc13fe] font-display font-bold mb-4 flex items-center gap-2">
                        <Wifi size={18} /> ESTABLISH_LINK
                    </h3>

                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={targetId}
                            onChange={(e) => setTargetId(e.target.value)}
                            placeholder="ENTER_TARGET_ID"
                            className="flex-1 bg-black/80 border border-[#bc13fe]/30 rounded px-4 py-2 text-white font-mono placeholder-[#bc13fe]/30 focus:border-[#bc13fe] focus:outline-none transition-colors"
                        />
                        <button
                            onClick={startCall}
                            disabled={callStatus !== 'idle' || !targetId}
                            className="bg-[#bc13fe]/20 border border-[#bc13fe] text-[#bc13fe] p-2 rounded hover:bg-[#bc13fe] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Phone size={20} />
                        </button>
                    </div>

                    {/* Incoming Call Alert */}
                    {callStatus === 'incoming' && (
                        <div className="bg-[#00f3ff]/10 border border-[#00f3ff] p-4 rounded-lg mb-4 animate-pulse">
                            <div className="text-[#00f3ff] font-bold mb-2 text-center">INCOMING TRANSMISSION</div>
                            <div className="flex justify-center gap-4">
                                <button onClick={answerCall} className="flex items-center gap-2 bg-green-500/20 text-green-400 border border-green-500 px-4 py-2 rounded hover:bg-green-500 hover:text-white transition-all">
                                    <Phone size={16} /> ACCEPT
                                </button>
                                <button onClick={endCall} className="flex items-center gap-2 bg-red-500/20 text-red-400 border border-red-500 px-4 py-2 rounded hover:bg-red-500 hover:text-white transition-all">
                                    <PhoneOff size={16} /> DECLINE
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Logs */}
                    <div className="flex-1 bg-black/80 rounded-lg p-4 font-mono text-xs overflow-y-auto border border-white/10 max-h-[150px] lg:max-h-[200px]">
                        {logs.map((log, i) => (
                            <div key={i} className="mb-1 text-gray-400 border-b border-white/5 pb-1 last:border-0">
                                <span className="text-[#00f3ff] mr-2">➜</span>
                                {log}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Center Panel: Video Feeds */}
            <div className="lg:col-span-2 flex flex-col gap-4 order-2 lg:order-2">
                <div className="min-h-[300px] lg:flex-1 bg-black/90 rounded-xl border border-[#333] relative overflow-hidden backdrop-blur-sm">
                    {/* Remote Video */}
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    {!remoteStreamRef.current && callStatus === 'connected' && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-mono">
                            WAITING_FOR_VIDEO_FEED...
                        </div>
                    )}
                    {!remoteStreamRef.current && callStatus !== 'connected' && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-mono flex-col gap-4">
                            <Users size={48} className="opacity-20" />
                            <span>NO_ACTIVE_TRANSMISSION</span>
                        </div>
                    )}

                    {/* Local Video (PIP) */}
                    <div className="absolute bottom-4 right-4 w-32 h-24 sm:w-48 sm:h-36 bg-[#111]/90 border border-[#00f3ff]/30 rounded-lg overflow-hidden shadow-2xl backdrop-blur-sm">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
                        />
                        {!isVideoEnabled && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#111] text-gray-500">
                                <VideoOff size={24} />
                            </div>
                        )}
                    </div>

                    {/* Controls Overlay */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 sm:gap-4 bg-black/80 backdrop-blur-xl p-2 rounded-full border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                        <button onClick={toggleVideo} className={`p-2 sm:p-3 rounded-full transition-all ${isVideoEnabled ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-500'}`}>
                            {isVideoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
                        </button>
                        <button onClick={toggleAudio} className={`p-2 sm:p-3 rounded-full transition-all ${isAudioEnabled ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-500'}`}>
                            {isAudioEnabled ? <Mic size={18} /> : <MicOff size={18} />}
                        </button>
                        <button onClick={flipCamera} className="p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all">
                            <SwitchCamera size={18} />
                        </button>
                        <button
                            onClick={toggleScreenShare}
                            className={`p-2 sm:p-3 rounded-full transition-all ${isScreenSharing ? 'bg-[#00ff9d]/20 text-[#00ff9d]' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                            title={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
                        >
                            {isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
                        </button>
                        {callStatus === 'connected' && (
                            <button onClick={endCall} className="p-2 sm:p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all">
                                <PhoneOff size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Chat/Whiteboard Tabbed Area */}
                <div className="h-[180px] sm:h-[250px] bg-[#050510]/95 border border-[#333] rounded-xl flex flex-col backdrop-blur-xl shadow-lg">
                    {/* Tab Headers */}
                    <div className="flex border-b border-[#333] bg-[#0a0a1a]/90">
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`flex-1 px-4 py-2 text-xs font-mono transition-all ${activeTab === 'chat'
                                ? 'bg-[#050510] text-[#00f3ff] border-b-2 border-[#00f3ff]'
                                : 'text-gray-500 hover:text-white'
                                }`}
                        >
                            💬 CHAT
                        </button>
                        <button
                            onClick={() => setActiveTab('whiteboard')}
                            className={`flex-1 px-4 py-2 text-xs font-mono transition-all ${activeTab === 'whiteboard'
                                ? 'bg-[#050510] text-[#bc13fe] border-b-2 border-[#bc13fe]'
                                : 'text-gray-500 hover:text-white'
                                }`}
                        >
                            🎨 WHITEBOARD
                        </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'chat' ? (
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <div className="flex-1 p-4 overflow-y-auto space-y-2">
                                {chatHistory.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.sender === 'me'
                                            ? 'bg-[#00f3ff]/10 text-[#00f3ff] border border-[#00f3ff]/30'
                                            : 'bg-[#bc13fe]/10 text-[#bc13fe] border border-[#bc13fe]/30'
                                            }`}>
                                            {msg.voiceRecording ? (
                                                /* Voice Message */
                                                <div className="flex items-center gap-2 min-w-[150px]">
                                                    <button
                                                        onClick={() => msg.voiceRecording && playVoiceMessage(msg.voiceRecording)}
                                                        disabled={playingVoiceId === msg.voiceRecording.id}
                                                        className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors disabled:opacity-50"
                                                    >
                                                        {playingVoiceId === msg.voiceRecording.id ? <Pause size={14} /> : <Play size={14} />}
                                                    </button>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-1 h-6">
                                                            {msg.voiceRecording.waveformData?.slice(0, 20).map((val, i) => (
                                                                <div
                                                                    key={i}
                                                                    className={`w-0.5 ${msg.sender === 'me' ? 'bg-[#00f3ff]' : 'bg-[#bc13fe]'} rounded-full`}
                                                                    style={{ height: `${val * 100}%` }}
                                                                />
                                                            )) || <span className="text-xs">🎤 Voice</span>}
                                                        </div>
                                                        <div className="text-xs opacity-70 mt-1">
                                                            {Math.floor(msg.voiceRecording.duration / 60)}:{(msg.voiceRecording.duration % 60).toString().padStart(2, '0')}
                                                        </div>
                                                    </div>
                                                    {msg.voiceRecording.audioData && (
                                                        <button
                                                            onClick={() => msg.voiceRecording && handleTranscribe(msg.id, msg.voiceRecording)}
                                                            disabled={transcribingId === msg.id}
                                                            className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-[#00f3ff] transition-colors"
                                                            title="Transcribe Voice"
                                                        >
                                                            {transcribingId === msg.id ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                /* Text Message */
                                                <div className="prose prose-invert prose-sm max-w-none">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            p: ({ node, ...props }) => <p className="mb-1" {...props} />,
                                                            code: ({ node, className, children, ...props }: any) => {
                                                                const inline = !className;
                                                                return inline ? (
                                                                    <code className="bg-black/50 px-1 py-0.5 rounded text-xs" {...props}>{children}</code>
                                                                ) : (
                                                                    <code className="block bg-black/50 p-2 rounded text-xs overflow-x-auto" {...props}>{children}</code>
                                                                );
                                                            },
                                                            a: ({ node, ...props }) => <a className="text-[#00f3ff] hover:underline" {...props} target="_blank" rel="noopener noreferrer" />,
                                                            strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
                                                            em: ({ node, ...props }) => <em className="italic" {...props} />,
                                                            ul: ({ node, ...props }) => <ul className="list-disc list-inside text-xs" {...props} />,
                                                            ol: ({ node, ...props }) => <ol className="list-decimal list-inside text-xs" {...props} />,
                                                        }}
                                                    >
                                                        {msg.text}
                                                    </ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-2 border-t border-[#333] flex gap-2 items-center">
                                {/* Emoji Picker */}
                                <CyberpunkEmojiPicker onEmojiSelect={handleEmojiSelect} />

                                {/* Voice Recording Button */}
                                {!isRecordingVoice ? (
                                    <button
                                        onClick={startVoiceRecording}
                                        disabled={!connRef.current}
                                        className="text-[#bc13fe] hover:text-white transition-colors disabled:opacity-30"
                                        title="Record voice message"
                                    >
                                        <Mic size={18} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={stopVoiceRecording}
                                        className="text-[#ff0055] animate-pulse"
                                        title="Stop recording"
                                    >
                                        <MicOff size={18} />
                                    </button>
                                )}

                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                                    placeholder={isRecordingVoice ? "RECORDING..." : "SEND_MESSAGE..."}
                                    disabled={isRecordingVoice}
                                    className="flex-1 bg-transparent border-none focus:outline-none text-white font-mono text-sm px-2 disabled:opacity-50 placeholder-white/30"
                                />

                                {/* AI Improve Message Button */}
                                {chatInput.trim() && !isRecordingVoice && (
                                    <button
                                        onClick={handleImproveMessage}
                                        disabled={isImprovingMessage}
                                        className="text-[#bc13fe] hover:text-white transition-colors disabled:opacity-50"
                                        title="Improve with AI"
                                    >
                                        {isImprovingMessage ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                    </button>
                                )}
                                <button
                                    onClick={sendChat}
                                    disabled={isRecordingVoice}
                                    className="text-[#00f3ff] hover:text-white transition-colors disabled:opacity-30"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Whiteboard Tab */
                        <div className="flex-1 p-2 relative">
                            <WhiteboardPanel
                                className="h-full"
                                remoteStrokes={remoteStrokes}
                                onStrokeDraw={(stroke) => {
                                    // Send stroke to peer via data connection
                                    if (connRef.current && connRef.current.open) {
                                        connRef.current.send({
                                            type: 'whiteboard',
                                            stroke
                                        });
                                    }
                                }}
                                onClear={() => {
                                    // Send clear signal to peer
                                    setRemoteStrokes([]);
                                    if (connRef.current && connRef.current.open) {
                                        connRef.current.send({
                                            type: 'whiteboard-clear'
                                        });
                                    }
                                }}
                                onAnalyze={handleWhiteboardAnalyze}
                            />
                            {isAnalyzingWhiteboard && (
                                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-none">
                                    <div className="bg-[#050510] border border-[#00f3ff] px-4 py-2 rounded-lg flex items-center gap-2 text-[#00f3ff] shadow-xl animate-pulse">
                                        <Sparkles size={16} /> Analyzing Whiteboard...
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommunicationHub;

