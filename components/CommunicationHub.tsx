import React, { useState, useEffect, useRef } from 'react';
import { Video, Mic, MicOff, VideoOff, Phone, PhoneOff, Users, MessageSquare, Send, Search, Wifi, ShieldCheck, Activity } from 'lucide-react';
import { ChatMessage } from '../types';

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
    const [chatInput, setChatInput] = useState('');

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
                setChatHistory(prev => [...prev, { id: generateUUID(), sender: 'peer', text: data.text, timestamp: Date.now() }]);
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
        connRef.current.send({ type: 'chat', text: chatInput });
        setChatHistory(prev => [...prev, { id: generateUUID(), sender: 'me', text: chatInput, timestamp: Date.now() }]);
        setChatInput('');
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
            {/* Left Panel: Controls & Logs */}
            <div className="lg:col-span-1 flex flex-col gap-4">
                {/* ID Card */}
                <div className="bg-[#050510]/80 border border-[#00f3ff]/30 p-6 rounded-xl backdrop-blur-md relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[#00f3ff]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <h3 className="text-[#00f3ff] font-display font-bold mb-2 flex items-center gap-2">
                        <ShieldCheck size={18} /> MY_IDENTITY
                    </h3>
                    <div className="font-mono text-2xl text-white tracking-wider mb-2">{myId || 'INITIALIZING...'}</div>
                    <div className="flex items-center gap-2 text-[#00f3ff]/60 text-xs">
                        <Activity size={12} className="animate-pulse" />
                        <span>ENCRYPTED_UPLINK_ACTIVE</span>
                    </div>
                </div>

                {/* Connection Panel */}
                <div className="bg-[#050510]/80 border border-[#bc13fe]/30 p-6 rounded-xl backdrop-blur-md flex-1 flex flex-col">
                    <h3 className="text-[#bc13fe] font-display font-bold mb-4 flex items-center gap-2">
                        <Wifi size={18} /> ESTABLISH_LINK
                    </h3>

                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={targetId}
                            onChange={(e) => setTargetId(e.target.value)}
                            placeholder="ENTER_TARGET_ID"
                            className="flex-1 bg-black/50 border border-[#bc13fe]/30 rounded px-4 py-2 text-white font-mono placeholder-[#bc13fe]/30 focus:border-[#bc13fe] focus:outline-none transition-colors"
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
                                <button onClick={answerCall} className="bg-green-500/20 text-green-400 border border-green-500 px-4 py-2 rounded hover:bg-green-500 hover:text-white transition-all">
                                    ACCEPT
                                </button>
                                <button onClick={endCall} className="bg-red-500/20 text-red-400 border border-red-500 px-4 py-2 rounded hover:bg-red-500 hover:text-white transition-all">
                                    DECLINE
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Logs */}
                    <div className="flex-1 bg-black/50 rounded-lg p-4 font-mono text-xs overflow-y-auto border border-white/10 max-h-[200px]">
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
            <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="flex-1 bg-black rounded-xl border border-[#333] relative overflow-hidden">
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
                    <div className="absolute bottom-4 right-4 w-48 h-36 bg-[#111] border border-[#00f3ff]/30 rounded-lg overflow-hidden shadow-2xl">
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
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4 bg-black/50 backdrop-blur-md p-2 rounded-full border border-white/10">
                        <button onClick={toggleVideo} className={`p-3 rounded-full transition-all ${isVideoEnabled ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-500'}`}>
                            {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                        </button>
                        <button onClick={toggleAudio} className={`p-3 rounded-full transition-all ${isAudioEnabled ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-500'}`}>
                            {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                        </button>
                        {callStatus === 'connected' && (
                            <button onClick={endCall} className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all">
                                <PhoneOff size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="h-[200px] bg-[#050510]/80 border border-[#333] rounded-xl flex flex-col">
                    <div className="flex-1 p-4 overflow-y-auto space-y-2">
                        {chatHistory.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.sender === 'me'
                                    ? 'bg-[#00f3ff]/10 text-[#00f3ff] border border-[#00f3ff]/30'
                                    : 'bg-[#bc13fe]/10 text-[#bc13fe] border border-[#bc13fe]/30'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-2 border-t border-[#333] flex gap-2">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                            placeholder="SEND_MESSAGE..."
                            className="flex-1 bg-transparent border-none focus:outline-none text-white font-mono text-sm px-2"
                        />
                        <button onClick={sendChat} className="text-[#00f3ff] hover:text-white transition-colors">
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommunicationHub;
