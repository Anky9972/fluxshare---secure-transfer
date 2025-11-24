import React, { useState, useEffect } from 'react';
import { X, Activity, Wifi, Monitor, Camera, Mic, Globe, Lightbulb } from 'lucide-react';

interface StatusModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const StatusModal: React.FC<StatusModalProps> = ({ isOpen, onClose }) => {
    const [status, setStatus] = useState({
        online: navigator.onLine,
        webrtc: false,
        camera: false,
        microphone: false,
        screen: `${window.innerWidth}x${window.innerHeight}`,
        browser: navigator.userAgent.split(' ').slice(-2).join(' '),
    });

    useEffect(() => {
        if (!isOpen) return;

        // Check WebRTC support
        const hasWebRTC = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

        // Check camera/mic permissions
        const checkMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                stream.getTracks().forEach(track => track.stop());
                setStatus(prev => ({ ...prev, camera: true, microphone: true, webrtc: true }));
            } catch {
                setStatus(prev => ({ ...prev, webrtc: hasWebRTC }));
            }
        };

        checkMedia();

        const handleOnline = () => setStatus(prev => ({ ...prev, online: true }));
        const handleOffline = () => setStatus(prev => ({ ...prev, online: false }));

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const StatusBadge = ({ active, label }: { active: boolean; label: string }) => (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${active
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
            <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-mono">{label}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#050510] border border-[#bc13fe]/30 rounded-xl max-w-2xl w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#bc13fe]/30 bg-[#bc13fe]/5">
                    <div className="flex items-center gap-3">
                        <Activity size={24} className="text-[#bc13fe]" />
                        <h2 className="font-display text-2xl font-bold text-white">SYSTEM STATUS</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Network Status */}
                    <section>
                        <h3 className="text-lg font-display font-bold text-[#bc13fe] mb-4 flex items-center gap-2">
                            <Wifi size={18} />
                            NETWORK STATUS
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <StatusBadge active={status.online} label={status.online ? "ONLINE" : "OFFLINE"} />
                            <StatusBadge active={status.webrtc} label="WEBRTC" />
                        </div>
                    </section>

                    {/* Device Capabilities */}
                    <section>
                        <h3 className="text-lg font-display font-bold text-[#bc13fe] mb-4 flex items-center gap-2">
                            <Monitor size={18} />
                            DEVICE CAPABILITIES
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <StatusBadge active={status.camera} label="CAMERA" />
                            <StatusBadge active={status.microphone} label="MICROPHONE" />
                        </div>
                    </section>

                    {/* System Info */}
                    <section>
                        <h3 className="text-lg font-display font-bold text-[#bc13fe] mb-4 flex items-center gap-2">
                            <Globe size={18} />
                            SYSTEM INFO
                        </h3>
                        <div className="bg-black/50 border border-white/10 rounded-lg p-4 space-y-2 font-mono text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">SCREEN:</span>
                                <span className="text-[#00f3ff]">{status.screen}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">BROWSER:</span>
                                <span className="text-[#00f3ff] text-xs truncate max-w-[200px]">{status.browser}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">PROTOCOL:</span>
                                <span className="text-[#00f3ff]">{window.location.protocol.toUpperCase()}</span>
                            </div>
                        </div>
                    </section>

                    {/* Quick Tips */}
                    <section className="bg-[#00f3ff]/5 border border-[#00f3ff]/20 rounded-lg p-4">
                        <h4 className="text-sm font-bold text-[#00f3ff] mb-2 flex items-center gap-2">
                            <Lightbulb size={14} />
                            QUICK TIPS
                        </h4>
                        <ul className="text-xs text-gray-400 space-y-1">
                            <li>• For video calls, allow camera/microphone permissions</li>
                            <li>• Use HTTPS for WebRTC in production</li>
                            <li>• Check firewall if P2P connections fail</li>
                        </ul>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#333] bg-black/50 text-center">
                    <p className="text-xs text-gray-500 font-mono">
                        FLUXSHARE 2099 // ALL SYSTEMS OPERATIONAL
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StatusModal;
