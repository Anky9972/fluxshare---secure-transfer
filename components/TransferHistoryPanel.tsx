// Transfer History Panel - View recent file transfers with statistics
import React, { useState, useEffect } from 'react';
import { Clock, Download, Upload, Check, X, Trash2, FileIcon, TrendingUp, BarChart3 } from 'lucide-react';
import { storageService } from '../services/storageService';
import { formatBytes, formatSpeed, formatDuration } from '../utils/fileHelpers';

interface TransferHistoryPanelProps {
    className?: string;
    maxItems?: number;
}

const TransferHistoryPanel: React.FC<TransferHistoryPanelProps> = ({ className = '', maxItems = 20 }) => {
    const [history, setHistory] = useState(storageService.getHistory(maxItems));
    const [stats, setStats] = useState(storageService.getStats());
    const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');

    useEffect(() => {
        loadData();
        // Refresh every 5 seconds
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, [maxItems]);

    const loadData = () => {
        setHistory(storageService.getHistory(maxItems));
        setStats(storageService.getStats());
    };

    const handleClearHistory = () => {
        if (confirm('⚠️ Clear all transfer history? This cannot be undone.')) {
            storageService.clearHistory();
            loadData();
        }
    };

    const filteredHistory = history.filter(transfer => {
        if (filter === 'all') return true;
        return transfer.direction === filter;
    });

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
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className={`bg-[#050510]/80 border border-[#00f3ff]/30 rounded-xl backdrop-blur-md overflow-hidden ${className}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#00f3ff]/20 to-[#bc13fe]/20 border-b border-[#00f3ff]/30 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Clock className="text-[#00f3ff]" size={24} />
                        <h2 className="text-xl font-display font-bold text-white">TRANSFER_HISTORY</h2>
                    </div>
                    <button
                        onClick={handleClearHistory}
                        className="text-[#ff0055] hover:text-white transition-colors p-2 hover:bg-[#ff0055]/20 rounded"
                        title="Clear history"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#0a0a1a] border-b border-[#333]">
                <div className="text-center">
                    <div className="text-2xl font-bold text-[#00f3ff] font-mono">{stats.totalTransfers}</div>
                    <div className="text-xs text-gray-500 uppercase mt-1">Total</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-[#00ff9d] font-mono">{formatBytes(stats.totalBytesReceived)}</div>
                    <div className="text-xs text-gray-500 uppercase mt-1">Received</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-[#bc13fe] font-mono">{formatBytes(stats.totalBytesSent)}</div>
                    <div className="text-xs text-gray-500 uppercase mt-1">Sent</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-[#f3ff00] font-mono">{formatSpeed(stats.peakSpeed)}</div>
                    <div className="text-xs text-gray-500 uppercase mt-1">Peak Speed</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex border-b border-[#333] bg-[#0a0a1a]">
                {(['all', 'sent', 'received'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`flex-1 px-4 py-2 text-sm font-medium uppercase tracking-wider transition-all ${filter === f
                                ? 'text-[#00f3ff] border-b-2 border-[#00f3ff] bg-[#00f3ff]/10'
                                : 'text-gray-500 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {f === 'all' ? '📊 All' : f === 'sent' ? '📤 Sent' : '📥 Received'}
                    </button>
                ))}
            </div>

            {/* History List */}
            <div className="max-h-96 overflow-y-auto">
                {filteredHistory.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <BarChart3 size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-sm">No transfers yet</p>
                        <p className="text-xs mt-1">Your transfer history will appear here</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#333]">
                        {filteredHistory.map((transfer) => (
                            <div
                                key={transfer.id}
                                className="p-4 hover:bg-white/5 transition-colors group"
                            >
                                <div className="flex items-start gap-3">
                                    {/* Direction Icon */}
                                    <div className={`p-2 rounded-lg ${transfer.direction === 'sent'
                                            ? 'bg-[#bc13fe]/20 text-[#bc13fe]'
                                            : 'bg-[#00ff9d]/20 text-[#00ff9d]'
                                        }`}>
                                        {transfer.direction === 'sent' ? <Upload size={16} /> : <Download size={16} />}
                                    </div>

                                    {/* Transfer Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <FileIcon size={14} className="text-gray-400 flex-shrink-0" />
                                            <span className="text-white font-medium truncate text-sm">{transfer.fileName}</span>
                                            {transfer.success ? (
                                                <Check size={14} className="text-[#00ff9d] flex-shrink-0" />
                                            ) : (
                                                <X size={14} className="text-[#ff0055] flex-shrink-0" />
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                            <span className="font-mono">{formatBytes(transfer.fileSize)}</span>
                                            <span>•</span>
                                            <span className="font-mono">{formatSpeed(transfer.speed)}</span>
                                            <span>•</span>
                                            <span className="truncate">
                                                {transfer.peerName || transfer.peerId}
                                            </span>
                                        </div>

                                        <div className="text-xs text-gray-600 mt-1">
                                            {formatDate(transfer.timestamp)}
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className={`px-2 py-1 rounded text-xs font-mono ${transfer.success
                                            ? 'bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/30'
                                            : 'bg-[#ff0055]/10 text-[#ff0055] border border-[#ff0055]/30'
                                        }`}>
                                        {transfer.success ? 'OK' : 'ERR'}
                                    </div>
                                </div>

                                {/* Progress indicator for successful transfers */}
                                {transfer.success && (
                                    <div className="mt-2 h-1 bg-[#222] rounded-full overflow-hidden">
                                        <div className={`h-full ${transfer.direction === 'sent' ? 'bg-[#bc13fe]' : 'bg-[#00ff9d]'
                                            }`} style={{ width: '100%' }} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="border-t border-[#333] p-3 bg-[#0a0a1a]">
                <div className="flex justify-between items-center text-xs text-gray-500 font-mono">
                    <span>Showing {filteredHistory.length} of {history.length} transfers</span>
                    <span className="flex items-center gap-1">
                        <TrendingUp size={12} />
                        {stats.successRate.toFixed(0)}% success rate
                    </span>
                </div>
            </div>
        </div>
    );
};

export default TransferHistoryPanel;
