// Empty State Components - Illustrated cyberpunk themed
import React from 'react';
import { FileX, Users, Radio, Clipboard, Clock, BarChart2, MessageSquare, FolderOpen, Wifi, Search } from 'lucide-react';

interface EmptyStateProps {
    type: 'files' | 'peers' | 'history' | 'clipboard' | 'chat' | 'search' | 'folder' | 'connection' | 'analytics';
    title?: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

const illustrations: Record<EmptyStateProps['type'], { icon: React.ElementType; color: string; bgColor: string }> = {
    files: { icon: FileX, color: '#00f3ff', bgColor: 'rgba(0, 243, 255, 0.1)' },
    peers: { icon: Users, color: '#bc13fe', bgColor: 'rgba(188, 19, 254, 0.1)' },
    history: { icon: Clock, color: '#00ff9d', bgColor: 'rgba(0, 255, 157, 0.1)' },
    clipboard: { icon: Clipboard, color: '#f3ff00', bgColor: 'rgba(243, 255, 0, 0.1)' },
    chat: { icon: MessageSquare, color: '#00f3ff', bgColor: 'rgba(0, 243, 255, 0.1)' },
    search: { icon: Search, color: '#bc13fe', bgColor: 'rgba(188, 19, 254, 0.1)' },
    folder: { icon: FolderOpen, color: '#00ff9d', bgColor: 'rgba(0, 255, 157, 0.1)' },
    connection: { icon: Wifi, color: '#ff0055', bgColor: 'rgba(255, 0, 85, 0.1)' },
    analytics: { icon: BarChart2, color: '#f3ff00', bgColor: 'rgba(243, 255, 0, 0.1)' },
};

const defaultMessages: Record<EmptyStateProps['type'], { title: string; description: string }> = {
    files: { title: 'No Files Selected', description: 'Drop files here or click to browse your device' },
    peers: { title: 'No Peers Found', description: 'Start a scan to discover active peers on the network' },
    history: { title: 'No Transfer History', description: 'Your completed transfers will appear here' },
    clipboard: { title: 'Clipboard Empty', description: 'Copy something to see it here, or capture from your clipboard' },
    chat: { title: 'No Messages Yet', description: 'Start a conversation with your connected peer' },
    search: { title: 'No Results Found', description: 'Try adjusting your search terms or filters' },
    folder: { title: 'Folder is Empty', description: 'This directory contains no files or subfolders' },
    connection: { title: 'Not Connected', description: 'Enter a peer ID to establish a secure connection' },
    analytics: { title: 'No Data Yet', description: 'Transfer some files to see your analytics' },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
    type,
    title,
    description,
    action,
    className = ''
}) => {
    const { icon: Icon, color, bgColor } = illustrations[type];
    const defaults = defaultMessages[type];

    return (
        <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
            {/* Animated Icon Container */}
            <div 
                className="relative w-24 h-24 rounded-2xl flex items-center justify-center mb-6 group"
                style={{ backgroundColor: bgColor }}
            >
                {/* Glow effect */}
                <div 
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                    style={{ backgroundColor: bgColor }}
                />
                
                {/* Animated border */}
                <div 
                    className="absolute inset-0 rounded-2xl border-2 opacity-50"
                    style={{ borderColor: color }}
                />
                
                {/* Scanning line animation */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden">
                    <div 
                        className="absolute inset-x-0 h-1 opacity-30 animate-scan"
                        style={{ backgroundColor: color }}
                    />
                </div>
                
                {/* Icon */}
                <Icon 
                    size={40} 
                    style={{ color }} 
                    className="relative z-10 group-hover:scale-110 transition-transform duration-300"
                />
            </div>

            {/* Text Content */}
            <h3 className="text-xl font-display font-bold text-white mb-2">
                {title || defaults.title}
            </h3>
            <p className="text-gray-500 text-sm max-w-xs mb-6 font-mono">
                {description || defaults.description}
            </p>

            {/* Action Button */}
            {action && (
                <button
                    onClick={action.onClick}
                    className="px-6 py-3 font-display font-medium uppercase tracking-wider text-sm transition-all duration-300 border rounded-lg hover:scale-105 active:scale-95"
                    style={{ 
                        color, 
                        borderColor: color,
                        backgroundColor: bgColor,
                    }}
                >
                    {action.label}
                </button>
            )}

            {/* Decorative elements */}
            <div className="flex items-center gap-2 mt-8 opacity-30">
                <div className="w-8 h-px" style={{ backgroundColor: color }} />
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <div className="w-8 h-px" style={{ backgroundColor: color }} />
            </div>
        </div>
    );
};

// Inline Empty State - For smaller areas
export const InlineEmptyState: React.FC<{
    icon?: React.ElementType;
    message: string;
    color?: string;
    className?: string;
}> = ({ icon: Icon = FileX, message, color = '#666', className = '' }) => (
    <div className={`flex items-center justify-center gap-3 py-8 px-4 text-center ${className}`}>
        <Icon size={20} style={{ color }} className="opacity-50" />
        <span className="text-sm font-mono" style={{ color }}>{message}</span>
    </div>
);

export default EmptyState;
