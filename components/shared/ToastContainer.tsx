// Toast Notification Container - Cyberpunk styled in-app notifications
import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { notificationService, ToastMessage } from '../../services/notificationService';

const ToastContainer: React.FC = () => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    useEffect(() => {
        // Subscribe to toast messages from notification service
        const unsubscribe = notificationService.onToast((toast) => {
            setToasts(prev => [...prev, toast]);

            // Auto-remove after duration
            setTimeout(() => {
                removeToast(toast.id);
            }, toast.duration || 3000);
        });

        return unsubscribe;
    }, []);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const getIcon = (type: ToastMessage['type']) => {
        switch (type) {
            case 'success':
                return <CheckCircle2 size={20} />;
            case 'error':
                return <AlertCircle size={20} />;
            case 'warning':
                return <AlertTriangle size={20} />;
            default:
                return <Info size={20} />;
        }
    };

    const getColors = (type: ToastMessage['type']) => {
        switch (type) {
            case 'success':
                return {
                    bg: 'bg-[#00ff9d]/10',
                    border: 'border-[#00ff9d]',
                    text: 'text-[#00ff9d]'
                };
            case 'error':
                return {
                    bg: 'bg-[#ff0055]/10',
                    border: 'border-[#ff0055]',
                    text: 'text-[#ff0055]'
                };
            case 'warning':
                return {
                    bg: 'bg-[#f3ff00]/10',
                    border: 'border-[#f3ff00]',
                    text: 'text-[#f3ff00]'
                };
            default:
                return {
                    bg: 'bg-[#00f3ff]/10',
                    border: 'border-[#00f3ff]',
                    text: 'text-[#00f3ff]'
                };
        }
    };

    return (
        <div className="fixed top-20 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
            {toasts.map((toast) => {
                const colors = getColors(toast.type);
                return (
                    <div
                        key={toast.id}
                        className={`${colors.bg} ${colors.border} border backdrop-blur-md rounded-lg p-4 shadow-lg animate-slideInRight pointer-events-auto`}
                        style={{
                            clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)'
                        }}
                    >
                        <div className="flex items-start gap-3">
                            <div className={colors.text}>
                                {getIcon(toast.type)}
                            </div>
                            <div className="flex-1">
                                <p className={`${colors.text} text-sm font-medium`}>
                                    {toast.message}
                                </p>
                            </div>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className={`${colors.text} hover:opacity-70 transition-opacity`}
                            >
                                <X size={16} />
                            </button>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 h-1 bg-black/30 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${colors.border.replace('border-', 'bg-')} animate-shrink`}
                                style={{
                                    animationDuration: `${toast.duration || 3000}ms`
                                }}
                            />
                        </div>
                    </div>
                );
            })}
            <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out;
        }
        .animate-shrink {
          animation: shrink linear;
        }
      `}</style>
        </div>
    );
};

export default ToastContainer;
