import React from 'react';
import { X, BookOpen, Globe, Lock, Zap, Radio, Wifi, MessageSquare, Shield, AlertCircle, Lightbulb } from 'lucide-react';

interface DocsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#050510] border border-[#00f3ff]/30 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#00f3ff]/30 bg-[#00f3ff]/5">
                    <div className="flex items-center gap-3">
                        <BookOpen size={24} className="text-[#00f3ff]" />
                        <h2 className="font-display text-2xl font-bold text-white">DOCUMENTATION</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 text-gray-300">
                    {/* Overview */}
                    <section>
                        <h3 className="text-xl font-display font-bold text-[#00f3ff] mb-3 flex items-center gap-2">
                            <Globe size={20} />
                            OVERVIEW
                        </h3>
                        <p className="text-gray-400 leading-relaxed">
                            FluxShare is a cyberpunk-themed secure file transfer and communication platform.
                            All communications are peer-to-peer, encrypted, and require no central server for data transfer.
                        </p>
                    </section>

                    {/* Features */}
                    <section>
                        <h3 className="text-xl font-display font-bold text-[#00f3ff] mb-3 flex items-center gap-2">
                            <Zap size={20} />
                            FEATURES
                        </h3>

                        <div className="space-y-4">
                            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                <h4 className="font-bold text-[#00f3ff] mb-2 flex items-center gap-2">
                                    <Lock size={16} />
                                    Secure Node (SFTP)
                                </h4>
                                <p className="text-sm text-gray-400">
                                    Transfer files via encrypted SFTP protocol with real-time progress tracking and multi-file support.
                                </p>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                <h4 className="font-bold text-[#00f3ff] mb-2 flex items-center gap-2">
                                    <Radio size={16} />
                                    Quick Link (P2P)
                                </h4>
                                <p className="text-sm text-gray-400 mb-2">
                                    Direct peer-to-peer file sharing using WebRTC. Files go directly between devices.
                                </p>
                                <ul className="text-xs text-gray-500 space-y-1 ml-4">
                                    <li>• <span className="text-[#bc13fe]">Transmitter:</span> Select files, share ID, upload</li>
                                    <li>• <span className="text-[#bc13fe]">Receiver:</span> Enter peer ID, connect, receive</li>
                                </ul>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                <h4 className="font-bold text-[#00f3ff] mb-2 flex items-center gap-2">
                                    <MessageSquare size={16} />
                                    Comm Link
                                </h4>
                                <p className="text-sm text-gray-400 mb-2">
                                    Video calling with text chat and encrypted communication.
                                </p>
                                <ul className="text-xs text-gray-500 space-y-1 ml-4">
                                    <li>• Video/audio toggle</li>
                                    <li>• Camera flip (front/back)</li>
                                    <li>• Real-time text chat</li>
                                </ul>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                                <h4 className="font-bold text-[#00f3ff] mb-2 flex items-center gap-2">
                                    <Wifi size={16} />
                                    Broadcast
                                </h4>
                                <p className="text-sm text-gray-400">
                                    Send messages to all connected peers. Scan network, type message, send to all.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Usage Guide */}
                    <section>
                        <h3 className="text-xl font-display font-bold text-[#00f3ff] mb-3 flex items-center gap-2">
                            <BookOpen size={20} />
                            QUICK START
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div className="bg-[#00f3ff]/5 border-l-4 border-[#00f3ff] p-3 rounded">
                                <p className="font-mono text-[#00f3ff] mb-1">SFTP Transfer</p>
                                <p className="text-gray-400 text-xs">Enter credentials → Upload files → Monitor progress</p>
                            </div>
                            <div className="bg-[#bc13fe]/5 border-l-4 border-[#bc13fe] p-3 rounded">
                                <p className="font-mono text-[#bc13fe] mb-1">P2P Sharing</p>
                                <p className="text-gray-400 text-xs">Choose mode → Share/enter ID → Transfer directly</p>
                            </div>
                            <div className="bg-[#00ff9d]/5 border-l-4 border-[#00ff9d] p-3 rounded">
                                <p className="font-mono text-[#00ff9d] mb-1">Video Call</p>
                                <p className="text-gray-400 text-xs">Enter peer ID → Call → Use camera/mic controls</p>
                            </div>
                            <div className="bg-[#ff0055]/5 border-l-4 border-[#ff0055] p-3 rounded">
                                <p className="font-mono text-[#ff0055] mb-1">Broadcast</p>
                                <p className="text-gray-400 text-xs">Scan network → Type message → Send to all</p>
                            </div>
                        </div>
                    </section>

                    {/* Troubleshooting */}
                    <section>
                        <h3 className="text-xl font-display font-bold text-[#00f3ff] mb-3 flex items-center gap-2">
                            <AlertCircle size={20} />
                            TROUBLESHOOTING
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
                                <p className="font-bold text-red-400 mb-1">Connection Issues</p>
                                <p className="text-xs text-gray-400">Check firewall, verify peers online, use TURN servers</p>
                            </div>
                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
                                <p className="font-bold text-yellow-400 mb-1">Video Not Working</p>
                                <p className="text-xs text-gray-400">Allow camera/mic permissions, use HTTPS, try Chrome/Firefox</p>
                            </div>
                            <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3">
                                <p className="font-bold text-orange-400 mb-1">No Peers Found</p>
                                <p className="text-xs text-gray-400">Run: npm run peer-server, check port 9000</p>
                            </div>
                        </div>
                    </section>

                    {/* Security */}
                    <section className="bg-[#00f3ff]/5 border border-[#00f3ff]/20 rounded-lg p-4">
                        <h3 className="text-lg font-display font-bold text-[#00f3ff] mb-2 flex items-center gap-2">
                            <Shield size={18} />
                            SECURITY
                        </h3>
                        <ul className="text-sm text-gray-400 space-y-1">
                            <li>• WebRTC encryption for all P2P communications</li>
                            <li>• No data storage - files transfer directly</li>
                            <li>• Local processing - no server-side handling</li>
                            <li>• HTTPS enforced in production</li>
                        </ul>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#333] bg-black/50 text-center">
                    <p className="text-xs text-gray-500 font-mono">
                        Built with React • TypeScript • PeerJS • Tailwind CSS
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DocsModal;
