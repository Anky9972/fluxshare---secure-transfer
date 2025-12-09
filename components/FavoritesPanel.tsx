// Favorites and Recent Peers Panel - Quick access to saved connections
import React, { useState, useEffect } from 'react';
import { Star, Clock, Trash2, Edit2, Check, X, Users, Copy } from 'lucide-react';
import { storageService, FavoritePeer } from '../services/storageService';
import { audioService } from '../services/audioService';
import { notificationService } from '../services/notificationService';
import { copyToClipboard } from '../utils/fileHelpers';

interface FavoritesPanelProps {
    onPeerSelect?: (peerId: string) => void;
    className?: string;
}

const FavoritesPanel: React.FC<FavoritesPanelProps> = ({ onPeerSelect, className = '' }) => {
    const [favorites, setFavorites] = useState<Map<string, FavoritePeer>>(new Map());
    const [recentPeers, setRecentPeers] = useState<string[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editNickname, setEditNickname] = useState('');
    const [activeTab, setActiveTab] = useState<'favorites' | 'recent'>('favorites');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setFavorites(storageService.getFavorites());
        setRecentPeers(storageService.getRecentPeers(10));
    };

    const handleAddToFavorites = (peerId: string) => {
        storageService.saveFavorite(peerId);
        loadData();
        audioService.playSound('success');
        notificationService.showToast({
            type: 'success',
            message: 'Added to favorites!'
        });
    };

    const handleRemoveFavorite = (peerId: string) => {
        storageService.removeFavorite(peerId);
        loadData();
        audioService.playSound('disconnect');
        notificationService.showToast({
            type: 'info',
            message: 'Removed from favorites'
        });
    };

    const handleStartEdit = (peerId: string, currentNickname?: string) => {
        setEditingId(peerId);
        setEditNickname(currentNickname || '');
    };

    const handleSaveEdit = (peerId: string) => {
        if (editNickname.trim()) {
            storageService.updateFavoriteNickname(peerId, editNickname.trim());
            loadData();
            audioService.playSound('success');
        }
        setEditingId(null);
        setEditNickname('');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditNickname('');
    };

    const handleCopyPeerId = async (peerId: string) => {
        const success = await copyToClipboard(peerId);
        if (success) {
            audioService.playSound('success');
            notificationService.showToast({
                type: 'success',
                message: 'Peer ID copied!'
            });
        }
    };

    const handleConnect = (peerId: string) => {
        if (onPeerSelect) {
            onPeerSelect(peerId);
            audioService.playSound('connect');
        }
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    return (
        <div className={`bg-[#050510]/80 border border-[#bc13fe]/30 rounded-xl backdrop-blur-md overflow-hidden ${className}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#bc13fe]/20 to-[#00f3ff]/20 border-b border-[#bc13fe]/30 p-4">
                <div className="flex items-center gap-2 text-[#bc13fe] font-display font-bold">
                    <Users size={20} />
                    <span>QUICK_CONNECT</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#333]">
                <button
                    onClick={() => setActiveTab('favorites')}
                    className={`flex-1 px-4 py-3 text-sm font-medium uppercase tracking-wider transition-all ${activeTab === 'favorites'
                            ? 'text-[#bc13fe] border-b-2 border-[#bc13fe] bg-[#bc13fe]/10'
                            : 'text-gray-500 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Star size={16} />
                        <span>Favorites</span>
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('recent')}
                    className={`flex-1 px-4 py-3 text-sm font-medium uppercase tracking-wider transition-all ${activeTab === 'recent'
                            ? 'text-[#00f3ff] border-b-2 border-[#00f3ff] bg-[#00f3ff]/10'
                            : 'text-gray-500 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Clock size={16} />
                        <span>Recent</span>
                    </div>
                </button>
            </div>

            {/* Content */}
            <div className="p-4 max-h-96 overflow-y-auto">
                {activeTab === 'favorites' && (
                    <div className="space-y-2">
                        {Array.from(favorites.values()).length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Star size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No favorites yet</p>
                                <p className="text-xs mt-1">Star peers to save them here</p>
                            </div>
                        ) : (
                            Array.from(favorites.values()).map(fav => (
                                <div
                                    key={fav.peerId}
                                    className="bg-[#0a0a1a] border border-[#333] rounded-lg p-3 hover:border-[#bc13fe]/50 transition-all group"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            {editingId === fav.peerId ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={editNickname}
                                                        onChange={(e) => setEditNickname(e.target.value)}
                                                        className="flex-1 bg-black/50 border border-[#bc13fe]/30 rounded px-2 py-1 text-sm text-white focus:border-[#bc13fe] focus:outline-none"
                                                        placeholder="Enter nickname"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => handleSaveEdit(fav.peerId)}
                                                        className="text-[#00ff9d] hover:text-white"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className="text-[#ff0055] hover:text-white"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="font-medium text-white text-sm flex items-center gap-2">
                                                        {fav.nickname || 'Unnamed Peer'}
                                                        <button
                                                            onClick={() => handleStartEdit(fav.peerId, fav.nickname)}
                                                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#bc13fe] transition-all"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                    </div>
                                                    <div className="text-xs font-mono text-gray-500 truncate">{fav.peerId}</div>
                                                    <div className="text-xs text-gray-600 mt-1">
                                                        {fav.totalTransfers} transfer{fav.totalTransfers !== 1 ? 's' : ''} • {formatDate(fav.lastConnected)}
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {editingId !== fav.peerId && (
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleCopyPeerId(fav.peerId)}
                                                    className="p-2 text-[#00f3ff] hover:bg-[#00f3ff]/20 rounded transition-all"
                                                    title="Copy ID"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleConnect(fav.peerId)}
                                                    className="px-3 py-1 bg-[#bc13fe]/20 border border-[#bc13fe] text-[#bc13fe] rounded text-xs hover:bg-[#bc13fe] hover:text-white transition-all"
                                                >
                                                    CONNECT
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveFavorite(fav.peerId)}
                                                    className="p-2 text-[#ff0055] hover:bg-[#ff0055]/20 rounded transition-all"
                                                    title="Remove"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'recent' && (
                    <div className="space-y-2">
                        {recentPeers.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Clock size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No recent connections</p>
                                <p className="text-xs mt-1">Connect to peers to see them here</p>
                            </div>
                        ) : (
                            recentPeers.map(peerId => {
                                const isFavorite = favorites.has(peerId);
                                return (
                                    <div
                                        key={peerId}
                                        className="bg-[#0a0a1a] border border-[#333] rounded-lg p-3 hover:border-[#00f3ff]/50 transition-all group"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-mono text-white truncate">{peerId}</div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleCopyPeerId(peerId)}
                                                    className="p-2 text-[#00f3ff] hover:bg-[#00f3ff]/20 rounded transition-all"
                                                    title="Copy ID"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                                {!isFavorite && (
                                                    <button
                                                        onClick={() => handleAddToFavorites(peerId)}
                                                        className="p-2 text-gray-400 hover:text-[#f3ff00] hover:bg-[#f3ff00]/20 rounded transition-all"
                                                        title="Add to favorites"
                                                    >
                                                        <Star size={14} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleConnect(peerId)}
                                                    className="px-3 py-1 bg-[#00f3ff]/20 border border-[#00f3ff] text-[#00f3ff] rounded text-xs hover:bg-[#00f3ff] hover:text-black transition-all"
                                                >
                                                    CONNECT
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FavoritesPanel;
