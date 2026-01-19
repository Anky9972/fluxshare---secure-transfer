// Error Card Component - For displaying errors with retry options
import React from 'react';
import { AlertTriangle, RefreshCw, X, WifiOff, ServerCrash, FileWarning, ShieldX, Clock } from 'lucide-react';

type ErrorType = 'network' | 'server' | 'file' | 'permission' | 'timeout' | 'general';

interface ErrorCardProps {
    type?: ErrorType;
    title?: string;
    message: string;
    details?: string;
    onRetry?: () => void;
    onDismiss?: () => void;
    retryLabel?: string;
    dismissLabel?: string;
    className?: string;
    inline?: boolean;
}

const errorConfig: Record<ErrorType, { icon: React.ElementType; color: string; bgColor: string; defaultTitle: string }> = {
    network: { 
        icon: WifiOff, 
        color: '#ff0055', 
        bgColor: 'rgba(255, 0, 85, 0.1)',
        defaultTitle: 'Network Error'
    },
    server: { 
        icon: ServerCrash, 
        color: '#ff6b00', 
        bgColor: 'rgba(255, 107, 0, 0.1)',
        defaultTitle: 'Server Error'
    },
    file: { 
        icon: FileWarning, 
        color: '#f3ff00', 
        bgColor: 'rgba(243, 255, 0, 0.1)',
        defaultTitle: 'File Error'
    },
    permission: { 
        icon: ShieldX, 
        color: '#bc13fe', 
        bgColor: 'rgba(188, 19, 254, 0.1)',
        defaultTitle: 'Permission Denied'
    },
    timeout: { 
        icon: Clock, 
        color: '#00f3ff', 
        bgColor: 'rgba(0, 243, 255, 0.1)',
        defaultTitle: 'Connection Timeout'
    },
    general: { 
        icon: AlertTriangle, 
        color: '#ff0055', 
        bgColor: 'rgba(255, 0, 85, 0.1)',
        defaultTitle: 'Error'
    },
};

export const ErrorCard: React.FC<ErrorCardProps> = ({
    type = 'general',
    title,
    message,
    details,
    onRetry,
    onDismiss,
    retryLabel = 'Retry',
    dismissLabel = 'Dismiss',
    className = '',
    inline = false
}) => {
    const config = errorConfig[type];
    const Icon = config.icon;

    if (inline) {
        return (
            <div 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${className}`}
                style={{ backgroundColor: config.bgColor, borderColor: `${config.color}40` }}
            >
                <Icon size={18} style={{ color: config.color }} className="flex-shrink-0" />
                <span className="text-sm text-white flex-1">{message}</span>
                {onRetry && (
                    <button 
                        onClick={onRetry}
                        className="flex items-center gap-1 text-xs font-mono uppercase hover:opacity-80 transition-opacity"
                        style={{ color: config.color }}
                    >
                        <RefreshCw size={14} />
                        Retry
                    </button>
                )}
                {onDismiss && (
                    <button 
                        onClick={onDismiss}
                        className="text-gray-500 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
        );
    }

    return (
        <div 
            className={`relative overflow-hidden rounded-xl border ${className}`}
            style={{ backgroundColor: config.bgColor, borderColor: `${config.color}40` }}
        >
            {/* Animated top border */}
            <div 
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: config.color }}
            />

            <div className="p-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                    <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${config.color}20` }}
                    >
                        <Icon size={24} style={{ color: config.color }} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-display font-bold text-white mb-1">
                            {title || config.defaultTitle}
                        </h3>
                        <p className="text-gray-400 text-sm">{message}</p>
                        
                        {details && (
                            <details className="mt-3">
                                <summary className="text-xs font-mono text-gray-500 cursor-pointer hover:text-gray-400 transition-colors">
                                    Show Details
                                </summary>
                                <pre className="mt-2 p-3 bg-black/50 rounded-lg text-xs font-mono text-gray-500 overflow-x-auto">
                                    {details}
                                </pre>
                            </details>
                        )}
                    </div>

                    {onDismiss && (
                        <button 
                            onClick={onDismiss}
                            className="text-gray-500 hover:text-white transition-colors p-1"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Actions */}
                {(onRetry || onDismiss) && (
                    <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/10">
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className="flex items-center gap-2 px-5 py-2.5 font-display font-medium uppercase tracking-wider text-sm transition-all duration-300 rounded-lg hover:scale-105 active:scale-95"
                                style={{ 
                                    color: '#000', 
                                    backgroundColor: config.color,
                                }}
                            >
                                <RefreshCw size={16} />
                                {retryLabel}
                            </button>
                        )}
                        {onDismiss && !onRetry && (
                            <button
                                onClick={onDismiss}
                                className="flex items-center gap-2 px-5 py-2.5 font-display font-medium uppercase tracking-wider text-sm transition-all duration-300 rounded-lg border hover:bg-white/5"
                                style={{ borderColor: config.color, color: config.color }}
                            >
                                {dismissLabel}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Glitch effect on error */}
            <div className="absolute inset-0 pointer-events-none opacity-5">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-glitch-slide" />
            </div>
        </div>
    );
};

// Toast-style error notification
export const ErrorToast: React.FC<{
    message: string;
    onRetry?: () => void;
    onDismiss?: () => void;
}> = ({ message, onRetry, onDismiss }) => (
    <div className="flex items-center gap-3 bg-[#1a0a0a] border border-[#ff0055]/30 rounded-lg px-4 py-3 shadow-lg shadow-[#ff0055]/10">
        <AlertTriangle size={18} className="text-[#ff0055] flex-shrink-0" />
        <span className="text-sm text-white flex-1">{message}</span>
        {onRetry && (
            <button 
                onClick={onRetry}
                className="text-[#ff0055] hover:text-white transition-colors"
            >
                <RefreshCw size={16} />
            </button>
        )}
        {onDismiss && (
            <button 
                onClick={onDismiss}
                className="text-gray-500 hover:text-white transition-colors"
            >
                <X size={16} />
            </button>
        )}
    </div>
);

export default ErrorCard;
