// Settings Modal - Comprehensive user preferences and customization
import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon, Palette, Bell, Volume2, Download, Trash2, Upload, Copy, Check } from 'lucide-react';
import { storageService, UserSettings, ThemeConfig } from '../services/storageService';
import { audioService } from '../services/audioService';
import { notificationService } from '../services/notificationService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const [settings, setSettings] = useState<UserSettings>(storageService.getSettings());
    const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'notifications' | 'data'>('general');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSettings(storageService.getSettings());
        }
    }, [isOpen]);

    const saveSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
        storageService.updateSetting(key, value);
        setSettings(prev => ({ ...prev, [key]: value }));
        audioService.playSound('success');
    };

    const handleThemeChange = (themeId: string) => {
        storageService.setTheme(themeId);
        setSettings(storageService.getSettings());
        audioService.playSound('success');
    };

    const handleExport = () => {
        const data = storageService.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `fluxshare-data-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        audioService.playSound('success');
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const text = await file.text();
                const success = storageService.importData(text);
                if (success) {
                    setSettings(storageService.getSettings());
                    audioService.playSound('success');
                    notificationService.showToast({
                        type: 'success',
                        message: 'Data imported successfully!'
                    });
                } else {
                    audioService.playSound('error');
                    notificationService.showToast({
                        type: 'error',
                        message: 'Failed to import data'
                    });
                }
            }
        };
        input.click();
    };

    const handleClearAll = () => {
        if (confirm('⚠️ This will delete ALL your data including history, favorites, and settings. Are you sure?')) {
            storageService.clearAllData();
            setSettings(storageService.getSettings());
            audioService.playSound('disconnect');
            notificationService.showToast({
                type: 'warning',
                message: 'All data cleared'
            });
        }
    };

    const copyUsername = async () => {
        if (settings.username) {
            try {
                await navigator.clipboard.writeText(settings.username);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
                audioService.playSound('success');
            } catch (error) {
                audioService.playSound('error');
            }
        }
    };

    if (!isOpen) return null;

    const themes = storageService.getAvailableThemes();

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
            <div className="bg-[#050510]/95 border-2 border-[#00f3ff] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-[0_0_60px_rgba(0,243,255,0.2)] backdrop-blur-xl"
                style={{
                    clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)'
                }}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-[#00f3ff]/20 to-[#bc13fe]/20 border-b border-[#00f3ff]/30 p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <SettingsIcon className="text-[#00f3ff]" size={28} />
                            <h2 className="text-2xl font-display font-bold text-white glitch" data-text="SYSTEM_SETTINGS">
                                SYSTEM_SETTINGS
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-[#ff0055] transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#333] bg-[#0a0a1a]">
                    {(['general', 'appearance', 'notifications', 'data'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 px-4 py-3 text-sm font-medium uppercase tracking-wider transition-all ${activeTab === tab
                                ? 'text-[#00f3ff] border-b-2 border-[#00f3ff] bg-[#00f3ff]/10'
                                : 'text-gray-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            {/* Username */}
                            <div>
                                <label className="block text-[#00f3ff] font-medium mb-2 flex items-center gap-2">
                                    <span>USERNAME</span>
                                    {settings.username && (
                                        <button
                                            onClick={copyUsername}
                                            className="text-xs text-gray-400 hover:text-[#00f3ff] transition-colors"
                                        >
                                            {copied ? <Check size={14} /> : <Copy size={14} />}
                                        </button>
                                    )}
                                </label>
                                <input
                                    type="text"
                                    value={settings.username || ''}
                                    onChange={(e) => saveSetting('username', e.target.value)}
                                    placeholder="Enter your display name"
                                    className="w-full bg-black/50 border border-[#00f3ff]/30 rounded px-4 py-3 text-white font-mono placeholder-gray-600 focus:border-[#00f3ff] focus:outline-none transition-colors"
                                />
                                <p className="text-xs text-gray-500 mt-1">This name will be shown to peers you connect with</p>
                            </div>

                            {/* Max Parallel Transfers */}
                            <div>
                                <label className="block text-[#bc13fe] font-medium mb-2">
                                    MAX PARALLEL TRANSFERS: {settings.maxParallelTransfers}
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={settings.maxParallelTransfers}
                                    onChange={(e) => saveSetting('maxParallelTransfers', parseInt(e.target.value))}
                                    className="w-full accent-[#bc13fe]"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>1</span>
                                    <span>5</span>
                                </div>
                            </div>

                            {/* Auto Download */}
                            <div className="flex items-center justify-between bg-[#0a0a1a] border border-[#333] rounded-lg p-4">
                                <div>
                                    <div className="text-white font-medium">AUTO DOWNLOAD FILES</div>
                                    <p className="text-xs text-gray-500 mt-1">Automatically save received files without preview</p>
                                </div>
                                <label className="relative inline-block w-14 h-7">
                                    <input
                                        type="checkbox"
                                        checked={settings.autoDownload}
                                        onChange={(e) => saveSetting('autoDownload', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-full h-full bg-gray-700 peer-checked:bg-[#00ff9d] rounded-full transition-all peer-checked:after:translate-x-7 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'appearance' && (
                        <div className="space-y-6">
                            {/* Theme Selection */}
                            <div>
                                <label className="block text-[#00f3ff] font-medium mb-4">THEME</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {themes.map(theme => (
                                        <button
                                            key={theme.id}
                                            onClick={() => handleThemeChange(theme.id)}
                                            className={`p-4 rounded-lg border-2 transition-all ${settings.theme.id === theme.id
                                                ? 'border-[#00f3ff] bg-[#00f3ff]/10'
                                                : 'border-[#333] bg-[#0a0a1a] hover:border-[#00f3ff]/50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="flex gap-1">
                                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.primary }} />
                                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.secondary }} />
                                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.accent }} />
                                                </div>
                                            </div>
                                            <div className="text-white font-medium text-sm">{theme.name}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Background Pattern */}
                            <div>
                                <label className="block text-[#bc13fe] font-medium mb-4">BACKGROUND PATTERN</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {(['grid', 'particles', 'waves'] as const).map(pattern => (
                                        <button
                                            key={pattern}
                                            onClick={() => saveSetting('backgroundPattern', pattern)}
                                            className={`p-4 rounded-lg border-2 capitalize transition-all ${settings.backgroundPattern === pattern
                                                ? 'border-[#bc13fe] bg-[#bc13fe]/10 text-[#bc13fe]'
                                                : 'border-[#333] bg-[#0a0a1a] text-gray-400 hover:border-[#bc13fe]/50'
                                                }`}
                                        >
                                            {pattern}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="space-y-6">
                            {/* Enable Notifications */}
                            <div className="flex items-center justify-between bg-[#0a0a1a] border border-[#333] rounded-lg p-4">
                                <div>
                                    <div className="text-white font-medium flex items-center gap-2">
                                        <Bell size={18} className="text-[#00f3ff]" />
                                        BROWSER NOTIFICATIONS
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Show desktop notifications for events</p>
                                </div>
                                <label className="relative inline-block w-14 h-7">
                                    <input
                                        type="checkbox"
                                        checked={settings.notifications}
                                        onChange={(e) => {
                                            saveSetting('notifications', e.target.checked);
                                            if (e.target.checked) {
                                                notificationService.requestPermission();
                                            }
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div className="w-full h-full bg-gray-700 peer-checked:bg-[#00ff9d] rounded-full transition-all peer-checked:after:translate-x-7 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                </label>
                            </div>

                            {/* Sound Effects */}
                            <div className="flex items-center justify-between bg-[#0a0a1a] border border-[#333] rounded-lg p-4">
                                <div>
                                    <div className="text-white font-medium flex items-center gap-2">
                                        <Volume2 size={18} className="text-[#bc13fe]" />
                                        SOUND EFFECTS
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Play cyberpunk sound effects for actions</p>
                                </div>
                                <label className="relative inline-block w-14 h-7">
                                    <input
                                        type="checkbox"
                                        checked={settings.soundEffects}
                                        onChange={(e) => {
                                            saveSetting('soundEffects', e.target.checked);
                                            audioService.setSoundEffectsEnabled(e.target.checked);
                                            if (e.target.checked) {
                                                audioService.playSound('success');
                                            }
                                        }}
                                        className="sr-only peer"
                                    />
                                    <div className="w-full h-full bg-gray-700 peer-checked:bg-[#00ff9d] rounded-full transition-all peer-checked:after:translate-x-7 after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                </label>
                            </div>

                            {/* Test Notification */}
                            <button
                                onClick={() => {
                                    notificationService.showToast({
                                        type: 'info',
                                        message: 'This is a test notification!'
                                    });
                                    audioService.playSound('connect');
                                }}
                                className="w-full bg-[#00f3ff]/20 border border-[#00f3ff] text-[#00f3ff] px-6 py-3 rounded-lg hover:bg-[#00f3ff] hover:text-black transition-all font-medium"
                            >
                                TEST NOTIFICATION
                            </button>
                        </div>
                    )}

                    {activeTab === 'data' && (
                        <div className="space-y-6">
                            {/* Export Data */}
                            <button
                                onClick={handleExport}
                                className="w-full bg-[#00ff9d]/20 border border-[#00ff9d] text-[#00ff9d] px-6 py-4 rounded-lg hover:bg-[#00ff9d] hover:text-black transition-all font-medium flex items-center justify-center gap-3"
                            >
                                <Download size={20} />
                                EXPORT ALL DATA
                            </button>

                            {/* Import Data */}
                            <button
                                onClick={handleImport}
                                className="w-full bg-[#bc13fe]/20 border border-[#bc13fe] text-[#bc13fe] px-6 py-4 rounded-lg hover:bg-[#bc13fe] hover:text-white transition-all font-medium flex items-center justify-center gap-3"
                            >
                                <Upload size={20} />
                                IMPORT DATA
                            </button>

                            {/* Clear All Data */}
                            <button
                                onClick={handleClearAll}
                                className="w-full bg-[#ff0055]/20 border border-[#ff0055] text-[#ff0055] px-6 py-4 rounded-lg hover:bg-[#ff0055] hover:text-white transition-all font-medium flex items-center justify-center gap-3"
                            >
                                <Trash2 size={20} />
                                CLEAR ALL DATA
                            </button>

                            {/* Stats */}
                            <div className="bg-[#0a0a1a] border border-[#333] rounded-lg p-4">
                                <div className="text-white font-medium mb-3">STATISTICS</div>
                                {(() => {
                                    const stats = storageService.getStats();
                                    return (
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Total Transfers:</span>
                                                <span className="text-white font-mono">{stats.totalTransfers}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Data Sent:</span>
                                                <span className="text-[#00f3ff] font-mono">{storageService.formatBytes(stats.totalBytesSent)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Data Received:</span>
                                                <span className="text-[#bc13fe] font-mono">{storageService.formatBytes(stats.totalBytesReceived)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Peak Speed:</span>
                                                <span className="text-[#00ff9d] font-mono">{storageService.formatSpeed(stats.peakSpeed)}</span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-[#333] p-4 bg-[#0a0a1a]/80">
                    <div className="flex justify-between items-center text-xs text-gray-500 font-mono">
                        <span>FLUXSHARE_2099 // v1.0.0</span>
                        <span>SETTINGS_SYNCED</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
