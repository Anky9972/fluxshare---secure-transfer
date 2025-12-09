// CommunicationHub V2 - Google Meet Style UI
// Modern, responsive video call interface with floating controls
import React, { useState, useEffect, useRef } from 'react';
import {
    Video, Mic, MicOff, VideoOff, Phone, PhoneOff, Send, Monitor,
    Minimize2, Maximize2, ChevronLeft, ChevronRight, Play, Pause, Square, Smile
} from 'lucide-react';
import { ChatMessage, VoiceRecording } from '../types';
import CyberpunkEmojiPicker from './shared/EmojiPicker';
import { audioService } from '../services/audioService';
import { notificationService } from '../services/notificationService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import WhiteboardPanel from './WhiteboardPanel';

declare const Peer: any;

const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const CommunicationHubV2: React.FC = () => {
    // Connection state
    const [myId, setMyId] = useState<string>('');
    const [targetId, setTargetId] = useState<string>('');
    const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle');
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

    // Chat state
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isRecordingVoice, setIsRecordingVoice] = useState(false);
    const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

    // Screen sharing state
    const [isScreenSharing, setIsScreenSharing] = useState(false);

    // UI state
    const [activeTab, setActiveTab] = useState<'chat' | 'whiteboard'>('chat');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isVideoMinimized, setIsVideoMinimized] = useState(false);
    const [remoteStrokes, setRemoteStrokes] = useState<any[]>([]);

    // Refs
    const peerRef = useRef<any>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteStreamRef = useRef<MediaStream | null>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const currentCallRef = useRef<any>(null);
    const connRef = useRef<any>(null);

    // Initialize PeerJS
    useEffect(() => {
        const initPeer = async () => {
            try {
                const id = `FLUX-CALL-${Math.floor(Math.random() * 10000)}`;
                const iceServers = (import.meta.env.VITE_ICE_SERVERS || 'stun:stun.l.google.com:19302')
                    .split(',').map((server: string) => ({ urls: server.trim() }));

                const peerConfig: any = {
                    config: { iceServers },
                    debug: 0
                };

                const envHost = import.meta.env.VITE_PEER_HOST;
                if (envHost && envHost.trim() !== '') {
                    peerConfig.host = envHost;
                    peerConfig.port = Number(import.meta.env.VITE_PEER_PORT) || 443;
                    peerConfig.path = import.meta.env.VITE_PEER_PATH || '/';
                }

                if (import.meta.env.VITE_ENV === 'development') {
                    peerConfig.secure = false;
                } else {
                    peerConfig.secure = true;
                }

                const peer = new Peer(id, peerConfig);

                peer.on('open', (id: string) => {
                    setMyId(id);
                    console.log('Peer ID:', id);
                });

                peer.on('call', (call: any) => {
                    currentCallRef.current = call;
                    setCallStatus('incoming');
                    notificationService.showToast({ type: 'info', message: 'Incoming call!' });
                    audioService.playSound('connect');
                });

                peer.on('connection', (conn: any) => {
                    handleDataConnection(conn);
                });

                peerRef.current = peer;

                // Get local stream
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode },
                    audio: true
                });

                localStreamRef.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error('Failed to initialize:', err);
                notificationService.showToast({ type: 'error', message: 'Camera/mic access denied' });
            }
        };

        initPeer();

        return () => {
            if (peerRef.current) {
                peerRef.current.destroy();
            }
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Handle data connection
    const handleDataConnection = (conn: any) => {
        connRef.current = conn;

        conn.on('data', (data: any) => {
            if (data.type === 'chat') {
                setChatHistory(prev => [...prev, {
                    id: generateUUID(),
                    sender: 'peer',
                    text: data.text,
                    timestamp: data.timestamp
                }]);
                notificationService.notifyNewMessage('Peer', data.text);
                audioService.playSound('receive');
            } else if (data.type === 'voice') {
                const recording = data.recording;
                setChatHistory(prev => [...prev, {
                    id: generateUUID(),
                    sender: 'peer',
                    text: '',
                    timestamp: Date.now(),
                    voiceRecording: recording
                }]);
                notificationService.notifyNewMessage('Peer', '🎤 Voice message');
                audioService.playSound('receive');
            } else if (data.type === 'whiteboard') {
                setRemoteStrokes(prev => [...prev, data.stroke]);
            } else if (data.type === 'whiteboard-clear') {
                setRemoteStrokes([]);
            }
        });

        conn.on('open', () => {
            console.log('Data connection opened');
        });
    };

    // Call functions
    const startCall = () => {
        if (!targetId || !peerRef.current || !localStreamRef.current) return;

        setCallStatus('calling');
        console.log('Calling:', targetId);

        const conn = peerRef.current.connect(targetId);
        handleDataConnection(conn);

        const call = peerRef.current.call(targetId, localStreamRef.current);
        currentCallRef.current = call;

        call.on('stream', (remoteStream: MediaStream) => {
            setCallStatus('connected');
            remoteStreamRef.current = remoteStream;
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
            audioService.playSound('connect');
        });

        call.on('close', () => {
            endCall();
        });
    };

    const answerCall = async () => {
        if (!currentCallRef.current || !localStreamRef.current) return;

        const call = currentCallRef.current;
        call.answer(localStreamRef.current);
        setCallStatus('connected');

        call.on('stream', (remoteStream: MediaStream) => {
            remoteStreamRef.current = remoteStream;
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
            }
            audioService.playSound('connect');
        });

        call.on('close', () => {
            endCall();
        });
    };

    const rejectCall = () => {
        if (currentCallRef.current) {
            currentCallRef.current.close();
        }
        setCallStatus('idle');
        audioService.playSound('disconnect');
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
        audioService.playSound('disconnect');
    };

    // Media controls
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

    const toggleScreenShare = async () => {
        if (!isScreenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];

                if (currentCallRef.current) {
                    const sender = currentCallRef.current.peerConnection
                        .getSenders()
                        .find((s: any) => s.track?.kind === 'video');

                    if (sender) {
                        await sender.replaceTrack(screenTrack);
                    }
                }

                screenTrack.onended = () => {
                    toggleScreenShare();
                };

                setIsScreenSharing(true);
                notificationService.showToast({ type: 'success', message: 'Screen sharing started' });
            } catch (err) {
                console.error('Screen share error:', err);
            }
        } else {
            const videoTrack = localStreamRef.current?.getVideoTracks()[0];
            if (videoTrack && currentCallRef.current) {
                const sender = currentCallRef.current.peerConnection
                    .getSenders()
                    .find((s: any) => s.track?.kind === 'video');

                if (sender) {
                    await sender.replaceTrack(videoTrack);
                }
            }
            setIsScreenSharing(false);
            notificationService.showToast({ type: 'info', message: 'Screen sharing stopped' });
        }
    };

    // Chat functions
    const sendChat = () => {
        if (!chatInput.trim() || !connRef.current) return;

        connRef.current.send({ type: 'chat', text: chatInput, timestamp: Date.now() });
        setChatHistory(prev => [...prev, {
            id: generateUUID(),
            sender: 'me',
            text: chatInput,
            timestamp: Date.now()
        }]);
        setChatInput('');
        audioService.playSound('send');
    };

    const handleEmojiSelect = (emoji: string) => {
        setChatInput(prev => prev + emoji);
    };

    const startVoiceRecording = async () => {
        try {
            await audioService.startRecording();
            setIsRecordingVoice(true);
        } catch (err) {
            console.error('Recording error:', err);
        }
    };

    const stopVoiceRecording = async () => {
        try {
            const recording = await audioService.stopRecording();
            setIsRecordingVoice(false);

            if (recording && connRef.current) {
                const audioData = audioService.recordingToBase64(recording);
                connRef.current.send({
                    type: 'voice',
                    recording: {
                        id: recording.id,
                        audioData,
                        duration: recording.duration,
                        timestamp: recording.timestamp,
                        waveformData: recording.waveformData
                    }
                });

                setChatHistory(prev => [...prev, {
                    id: recording.id,
                    sender: 'me',
                    text: '',
                    timestamp: recording.timestamp,
                    voiceRecording: recording
                }]);
            }
        } catch (err) {
            setIsRecordingVoice(false);
            console.error('Recording stop error:', err);
        }
    };

    const playVoiceMessage = async (recording: VoiceRecording) => {
        try {
            setPlayingVoiceId(recording.id);
            if (recording.audioData) {
                const rec = audioService.base64ToRecording(recording.audioData, recording.duration, recording.waveformData);
                await audioService.playRecording(rec);
            } else if (recording.blob) {
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

    return (
        <div className="h-screen overflow-hidden bg-[#050510] flex flex-col">
            {/* Top Bar */}
            <div className="bg-[#0a0a1a] border-b border-[#333] px-4 py-2 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    {/* V2 Indicator */}
                    <div className="bg-[#00ff9d] text-black px-2 py-0.5 rounded text-[10px] font-bold">V2</div>

                    <div className={`w-2 h-2 rounded-full ${callStatus === 'connected' ? 'bg-[#00ff9d]' : callStatus === 'calling' ? 'bg-[#f3ff00] animate-pulse' : 'bg-gray-600'}`} />
                    <span className="text-xs font-mono text-gray-400">
                        {callStatus === 'connected' ? 'CONNECTED' : callStatus === 'calling' ? 'CALLING...' : callStatus === 'incoming' ? 'INCOMING_CALL' : 'READY'}
                    </span>
                    {myId && <span className="text-xs font-mono text-[#00f3ff]">ID: {myId.slice(0, 12)}...</span>}
                </div>
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="text-[#00f3ff] hover:text-white transition-colors text-xs font-medium flex items-center gap-1"
                >
                    {isSidebarCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                    {isSidebarCollapsed ? 'SHOW' : 'HIDE'} SIDEBAR
                </button>
            </div>

            {/* Main Content - Grid Layout */}
            <div className="flex-1 overflow-hidden grid transition-all duration-300" style={{
                gridTemplateColumns: isSidebarCollapsed ? '1fr' : 'minmax(0, 1fr) 400px'
            }}>
                {/* Video Area */}
                <div className="relative bg-black overflow-hidden">
                    {/* Remote Video (Full Screen) */}
                    {callStatus === 'connected' && remoteStreamRef.current && (
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                    )}

                    {/* No Call Placeholder */}
                    {(callStatus !== 'connected' || !remoteStreamRef.current) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#050510] to-[#0a0a1a]">
                            <div className="text-center">
                                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-[#00f3ff]/10 flex items-center justify-center">
                                    <Phone className="text-[#00f3ff]" size={48} />
                                </div>
                                <p className="text-white font-display text-2xl mb-2">FluxCall V2</p>
                                <p className="text-gray-500 text-sm font-mono">
                                    {callStatus === 'idle' ? 'Enter peer ID to start call' : callStatus === 'calling' ? 'Calling peer...' : 'Initializing call...'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Floating Self-View (Picture-in-Picture) */}
                    {!isVideoMinimized && (
                        <div className="absolute bottom-20 right-4 w-64 h-48 bg-[#0a0a1a] border-2 border-[#00f3ff] rounded-lg overflow-hidden shadow-2xl z-10">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                                style={{ transform: 'scaleX(-1)' }}
                            />
                            <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs text-white font-mono">
                                YOU
                            </div>
                            <button
                                onClick={() => setIsVideoMinimized(true)}
                                className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1 rounded transition-colors"
                            >
                                <Minimize2 size={14} />
                            </button>
                        </div>
                    )}

                    {/* Minimized Self-View Button */}
                    {isVideoMinimized && (
                        <button
                            onClick={() => setIsVideoMinimized(false)}
                            className="absolute bottom-20 right-4 bg-[#00f3ff] hover:bg-white text-black px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all z-10"
                        >
                            <Maximize2 size={16} />
                            Self View
                        </button>
                    )}

                    {/* Fixed Bottom Controls */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
                        <div className="flex items-center justify-center gap-3">
                            {callStatus === 'idle' && (
                                <>
                                    <input
                                        type="text"
                                        placeholder="PEER_ID"
                                        value={targetId}
                                        onChange={(e) => setTargetId(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && targetId && startCall()}
                                        className="bg-black/70 border border-[#00f3ff]/50 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-[#00f3ff] focus:outline-none w-64"
                                    />
                                    <button
                                        onClick={startCall}
                                        disabled={!targetId || !myId}
                                        className="bg-[#00ff9d] hover:bg-[#00ff9d]/80 text-black px-6 py-3 rounded-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                                    >
                                        <Phone size={18} />
                                        CALL
                                    </button>
                                </>
                            )}

                            {callStatus === 'incoming' && (
                                <>
                                    <button
                                        onClick={answerCall}
                                        className="bg-[#00ff9d] hover:bg-[#00ff9d]/80 text-black p-4 rounded-full transition-all shadow-lg"
                                    >
                                        <Phone size={24} />
                                    </button>
                                    <button
                                        onClick={rejectCall}
                                        className="bg-[#ff0055] hover:bg-[#ff0055]/80 text-white p-4 rounded-full transition-all shadow-lg"
                                    >
                                        <PhoneOff size={24} />
                                    </button>
                                </>
                            )}

                            {(callStatus === 'calling' || callStatus === 'connected') && (
                                <>
                                    <button
                                        onClick={toggleVideo}
                                        className={`p-4 rounded-full transition-all shadow-lg ${isVideoEnabled ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-[#ff0055] text-white'}`}
                                    >
                                        {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                                    </button>

                                    <button
                                        onClick={toggleAudio}
                                        className={`p-4 rounded-full transition-all shadow-lg ${isAudioEnabled ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-[#ff0055] text-white'}`}
                                    >
                                        {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                                    </button>

                                    <button
                                        onClick={toggleScreenShare}
                                        className={`p-4 rounded-full transition-all shadow-lg ${isScreenSharing ? 'bg-[#00ff9d] text-black' : 'bg-white/20 hover:bg-white/30 text-white'}`}
                                    >
                                        <Monitor size={20} />
                                    </button>

                                    <button
                                        onClick={endCall}
                                        className="bg-[#ff0055] hover:bg-[#ff0055]/80 text-white p-4 rounded-full transition-all shadow-lg"
                                    >
                                        <PhoneOff size={20} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar - Chat/Whiteboard */}
                {!isSidebarCollapsed && (
                    <div className="border-l border-[#333] bg-[#0a0a1a] flex flex-col overflow-hidden">
                        {/* Tab Headers */}
                        <div className="flex border-b border-[#333] flex-shrink-0">
                            <button
                                onClick={() => setActiveTab('chat')}
                                className={`flex-1 px-4 py-3 text-xs font-mono transition-all ${activeTab === 'chat'
                                    ? 'bg-[#050510] text-[#00f3ff] border-b-2 border-[#00f3ff]'
                                    : 'text-gray-500 hover:text-white'
                                    }`}
                            >
                                💬 CHAT
                            </button>
                            <button
                                onClick={() => setActiveTab('whiteboard')}
                                className={`flex-1 px-4 py-3 text-xs font-mono transition-all ${activeTab === 'whiteboard'
                                    ? 'bg-[#050510] text-[#bc13fe] border-b-2 border-[#bc13fe]'
                                    : 'text-gray-500 hover:text-white'
                                    }`}
                            >
                                🎨 WHITEBOARD
                            </button>
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'chat' ? (
                            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                                {/* Chat Messages */}
                                <div className="flex-1 p-4 overflow-y-auto space-y-2">
                                    {chatHistory.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.sender === 'me'
                                                ? 'bg-[#00f3ff]/10 text-[#00f3ff] border border-[#00f3ff]/30'
                                                : msg.sender === 'system'
                                                    ? 'bg-[#f3ff00]/10 text-[#f3ff00] border border-[#f3ff00]/30 text-center'
                                                    : 'bg-[#bc13fe]/10 text-[#bc13fe] border border-[#bc13fe]/30'
                                                }`}>
                                                {msg.voiceRecording ? (
                                                    <div className="flex items-center gap-2 min-w-[150px]">
                                                        <button
                                                            onClick={() => msg.voiceRecording && playVoiceMessage(msg.voiceRecording)}
                                                            className="text-white hover:text-[#00f3ff] transition-colors"
                                                        >
                                                            {playingVoiceId === msg.id ? <Pause size={16} /> : <Play size={16} />}
                                                        </button>
                                                        <div className="flex-1 flex gap-0.5 items-center h-8">
                                                            {msg.voiceRecording.waveformData?.map((height, i) => (
                                                                <div
                                                                    key={i}
                                                                    className={`w-1 bg-current rounded-full transition-all ${playingVoiceId === msg.id ? 'opacity-100' : 'opacity-60'}`}
                                                                    style={{ height: `${height}%` }}
                                                                />
                                                            ))}
                                                        </div>
                                                        <span className="text-xs opacity-70">
                                                            {msg.voiceRecording.duration.toFixed(1)}s
                                                        </span>
                                                    </div>
                                                ) : (
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
                                                        }}
                                                    >
                                                        {msg.text}
                                                    </ReactMarkdown>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Chat Input */}
                                <div className="p-3 border-t border-[#333] flex gap-2 items-center flex-shrink-0">
                                    <CyberpunkEmojiPicker onEmojiSelect={handleEmojiSelect} />
                                    {!isRecordingVoice ? (
                                        <button
                                            onClick={startVoiceRecording}
                                            disabled={!connRef.current}
                                            className="text-[#bc13fe] hover:text-white transition-colors disabled:opacity-30"
                                        >
                                            <Mic size={18} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={stopVoiceRecording}
                                            className="text-[#ff0055] animate-pulse"
                                        >
                                            <Square size={18} />
                                        </button>
                                    )}
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && sendChat()}
                                        placeholder={isRecordingVoice ? "RECORDING..." : "Message..."}
                                        disabled={isRecordingVoice}
                                        className="flex-1 bg-transparent border-none focus:outline-none text-white font-mono text-sm px-2 disabled:opacity-50"
                                    />
                                    <button
                                        onClick={sendChat}
                                        disabled={isRecordingVoice || !chatInput.trim()}
                                        className="text-[#00f3ff] hover:text-white transition-colors disabled:opacity-30"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 p-2 overflow-hidden">
                                <WhiteboardPanel
                                    className="h-full"
                                    remoteStrokes={remoteStrokes}
                                    onStrokeDraw={(stroke) => {
                                        if (connRef.current && connRef.current.open) {
                                            connRef.current.send({ type: 'whiteboard', stroke });
                                        }
                                    }}
                                    onClear={() => {
                                        setRemoteStrokes([]);
                                        if (connRef.current && connRef.current.open) {
                                            connRef.current.send({ type: 'whiteboard-clear' });
                                        }
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommunicationHubV2;
