// Install Prompt Component for PWA
import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { pwaService } from '../services/pwaService';
import { audioService } from '../services/audioService';

const InstallPrompt: React.FC = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);

    useEffect(() => {
        // Check if app can be installed
        const checkInstallable = () => {
            if (pwaService.canInstall()) {
                setShowPrompt(true);
            }
        };

        // Check after a delay
        const timer = setTimeout(checkInstallable, 3000);

        return () => clearTimeout(timer);
    }, []);

    const handleInstall = async () => {
        setIsInstalling(true);
        audioService.playSound('success');

        const accepted = await pwaService.showInstallPrompt();

        if (accepted) {
            console.log('App installation accepted');
            setShowPrompt(false);
        } else {
            console.log('App installation declined');
        }

        setIsInstalling(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        audioService.playSound('error');
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-slideIn">
            <div className="bg-gradient-to-br from-[#0a0a1a] to-[#1a0a2a] border-2 border-[#00f3ff] rounded-xl p-4 shadow-[0_0_30px_rgba(0,243,255,0.3)]">
                {/* Close button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 text-gray-500 hover:text-white transition-colors"
                >
                    <X size={16} />
                </button>

                {/* Icon */}
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#00f3ff]/20 flex items-center justify-center flex-shrink-0">
                        <Download size={24} className="text-[#00f3ff]" />
                    </div>

                    <div className="flex-1">
                        <h3 className="text-white font-bold text-sm mb-1">Install FluxShare</h3>
                        <p className="text-gray-400 text-xs mb-3">
                            Add FluxShare to your home screen for quick access and offline support
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={handleInstall}
                                disabled={isInstalling}
                                className="flex-1 py-2 px-3 bg-[#00f3ff] text-black font-bold text-xs rounded hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isInstalling ? 'Installing...' : 'Install App'}
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="py-2 px-3 bg-[#333] text-white font-bold text-xs rounded hover:bg-[#444] transition-colors"
                            >
                                Later
                            </button>
                        </div>
                    </div>
                </div>

                {/* Benefits */}
                <div className="mt-3 pt-3 border-t border-[#333]">
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                            <div className="text-[#00f3ff] text-xs font-bold">⚡</div>
                            <div className="text-gray-500 text-[10px]">Fast</div>
                        </div>
                        <div>
                            <div className="text-[#bc13fe] text-xs font-bold">📴</div>
                            <div className="text-gray-500 text-[10px]">Offline</div>
                        </div>
                        <div>
                            <div className="text-[#00ff9d] text-xs font-bold">🏠</div>
                            <div className="text-gray-500 text-[10px]">Native</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstallPrompt;
