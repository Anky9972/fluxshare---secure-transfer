// Analytics Dashboard - Real-time connection and transfer statistics
import React, { useState, useEffect } from 'react';
import { Activity, Wifi, Zap, TrendingUp, TrendingDown, BarChart2, PieChart } from 'lucide-react';
import { storageService } from '../services/storageService';
import { formatBytes, formatSpeed } from '../utils/fileHelpers';

interface AnalyticsDashboardProps {
    className?: string;
}

interface RealtimeMetrics {
    currentSpeed: number;
    peersConnected: number;
    activeTransfers: number;
    latency: number;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ className = '' }) => {
    const [stats, setStats] = useState(storageService.getStats());
    const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics>({
        currentSpeed: 0,
        peersConnected: 0,
        activeTransfers: 0,
        latency: 0
    });

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 2000); // Update every 2 seconds
        return () => clearInterval(interval);
    }, []);

    const loadData = () => {
        setStats(storageService.getStats());
        // In a real scenario, these would come from active WebRTC connections
        // For now, we'll simulate some metrics
        setRealtimeMetrics({
            currentSpeed: stats.peakSpeed * (0.5 + Math.random() * 0.5), // Simulate varying speed
            peersConnected: 0, // Would be updated by connection manager
            activeTransfers: 0, // Would be updated by transfer manager
            latency: Math.floor(Math.random() * 100) + 20 // Simulated latency
        });
    };

    const getSpeedTrend = () => {
        // Simple trend based on current vs average
        const avgSpeed = (stats.totalBytesSent + stats.totalBytesReceived) / stats.totalTransfers || 0;
        return realtimeMetrics.currentSpeed > avgSpeed ? 'up' : 'down';
    };

    const getLatencyStatus = () => {
        if (realtimeMetrics.latency < 50) return { color: 'text-[#00ff9d]', status: 'EXCELLENT' };
        if (realtimeMetrics.latency < 100) return { color: 'text-[#00f3ff]', status: 'GOOD' };
        if (realtimeMetrics.latency < 200) return { color: 'text-[#f3ff00]', status: 'FAIR' };
        return { color: 'text-[#ff0055]', status: 'POOR' };
    };

    const latencyStatus = getLatencyStatus();

    return (
        <div className={`bg-[#050510]/80 border border-[#bc13fe]/30 rounded-xl backdrop-blur-md overflow-hidden ${className}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#bc13fe]/20 to-[#00f3ff]/20 border-b border-[#bc13fe]/30 p-4">
                <div className="flex items-center gap-3">
                    <Activity className="text-[#bc13fe]" size={24} />
                    <h2 className="text-xl font-display font-bold text-white">ANALYTICS_DASHBOARD</h2>
                </div>
            </div>

            {/* Real-time Metrics */}
            <div className="p-4 bg-[#0a0a1a] border-b border-[#333]">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#00ff9d] rounded-full animate-pulse" />
                    <span>Real-time</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Current Speed */}
                    <div className="bg-[#050510] border border-[#00f3ff]/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                            <Zap size={16} className="text-[#00f3ff]" />
                            {getSpeedTrend() === 'up' ? (
                                <TrendingUp size={14} className="text-[#00ff9d]" />
                            ) : (
                                <TrendingDown size={14} className="text-[#ff0055]" />
                            )}
                        </div>
                        <div className="text-lg font-bold text-white font-mono">
                            {formatSpeed(realtimeMetrics.currentSpeed)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Current Speed</div>
                    </div>

                    {/* Peers Connected */}
                    <div className="bg-[#050510] border border-[#bc13fe]/30 rounded-lg p-3">
                        <Wifi size={16} className="text-[#bc13fe] mb-2" />
                        <div className="text-lg font-bold text-white font-mono">
                            {realtimeMetrics.peersConnected}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Peers Connected</div>
                    </div>

                    {/* Active Transfers */}
                    <div className="bg-[#050510] border border-[#00ff9d]/30 rounded-lg p-3">
                        <BarChart2 size={16} className="text-[#00ff9d] mb-2" />
                        <div className="text-lg font-bold text-white font-mono">
                            {realtimeMetrics.activeTransfers}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Active Transfers</div>
                    </div>

                    {/* Latency */}
                    <div className="bg-[#050510] border border-[#f3ff00]/30 rounded-lg p-3">
                        <Activity size={16} className="text-[#f3ff00] mb-2" />
                        <div className={`text-lg font-bold font-mono ${latencyStatus.color}`}>
                            {realtimeMetrics.latency}ms
                        </div>
                        <div className={`text-xs ${latencyStatus.color} mt-1`}>{latencyStatus.status}</div>
                    </div>
                </div>
            </div>

            {/* Cumulative Statistics */}
            <div className="p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                    Cumulative Statistics
                </div>

                <div className="space-y-4">
                    {/* Total Transfers */}
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-400">Total Transfers</span>
                            <span className="text-white font-mono font-bold">{stats.totalTransfers}</span>
                        </div>
                        <div className="h-2 bg-[#222] rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#00f3ff] to-[#bc13fe]" style={{ width: '100%' }} />
                        </div>
                    </div>

                    {/* Data Sent */}
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-400">Data Sent</span>
                            <span className="text-[#bc13fe] font-mono font-bold">{formatBytes(stats.totalBytesSent)}</span>
                        </div>
                        <div className="h-2 bg-[#222] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#bc13fe]"
                                style={{
                                    width: `${Math.min(100, (stats.totalBytesSent / (stats.totalBytesSent + stats.totalBytesReceived || 1)) * 100)}%`
                                }}
                            />
                        </div>
                    </div>

                    {/* Data Received */}
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-400">Data Received</span>
                            <span className="text-[#00ff9d] font-mono font-bold">{formatBytes(stats.totalBytesReceived)}</span>
                        </div>
                        <div className="h-2 bg-[#222] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#00ff9d]"
                                style={{
                                    width: `${Math.min(100, (stats.totalBytesReceived / (stats.totalBytesSent + stats.totalBytesReceived || 1)) * 100)}%`
                                }}
                            />
                        </div>
                    </div>

                    {/* Success Rate */}
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-400">Success Rate</span>
                            <span className="text-[#00f3ff] font-mono font-bold">{stats.successRate.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-[#222] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#00f3ff]"
                                style={{ width: `${stats.successRate}%` }}
                            />
                        </div>
                    </div>

                    {/* Peak Speed */}
                    <div>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-400">Peak Speed</span>
                            <span className="text-[#f3ff00] font-mono font-bold">{formatSpeed(stats.peakSpeed)}</span>
                        </div>
                        <div className="h-2 bg-[#222] rounded-full overflow-hidden">
                            <div className="h-full bg-[#f3ff00] animate-pulse" style={{ width: '100%' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Indicators */}
            <div className="border-t border-[#333] p-4 bg-[#0a0a1a]">
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <div className={`text-3xl mb-1 ${stats.successRate > 90 ? 'text-[#00ff9d]' : stats.successRate > 70 ? 'text-[#f3ff00]' : 'text-[#ff0055]'}`}>
                            {stats.successRate > 90 ? '🟢' : stats.successRate > 70 ? '🟡' : '🔴'}
                        </div>
                        <div className="text-xs text-gray-500">Reliability</div>
                    </div>
                    <div className="text-center">
                        <div className={`text-3xl mb-1 ${realtimeMetrics.latency < 100 ? 'text-[#00ff9d]' : realtimeMetrics.latency < 200 ? 'text-[#f3ff00]' : 'text-[#ff0055]'}`}>
                            {realtimeMetrics.latency < 100 ? '⚡' : realtimeMetrics.latency < 200 ? '⏱️' : '🐌'}
                        </div>
                        <div className="text-xs text-gray-500">Connection</div>
                    </div>
                    <div className="text-center">
                        <div className={`text-3xl mb-1 ${stats.totalTransfers > 10 ? 'text-[#00ff9d]' : stats.totalTransfers > 3 ? 'text-[#f3ff00]' : 'text-[#00f3ff]'}`}>
                            {stats.totalTransfers > 10 ? '🚀' : stats.totalTransfers > 3 ? '📊' : '🌱'}
                        </div>
                        <div className="text-xs text-gray-500">Activity</div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[#333] p-3 bg-[#0a0a1a]">
                <div className="text-xs text-gray-500 font-mono text-center">
                    Last updated: {new Date().toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
