// Skeleton Loading Components - Cyberpunk themed
import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular' | 'card';
    width?: string | number;
    height?: string | number;
    count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'rectangular',
    width,
    height,
    count = 1
}) => {
    const baseClass = 'animate-pulse bg-gradient-to-r from-[#1a1a2e] via-[#2a2a4e] to-[#1a1a2e] bg-[length:200%_100%] animate-shimmer';
    
    const variantClasses = {
        text: 'h-4 rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-lg',
        card: 'rounded-xl'
    };

    const style: React.CSSProperties = {
        width: width || '100%',
        height: height || (variant === 'text' ? '1rem' : variant === 'circular' ? '40px' : '100px'),
    };

    if (variant === 'circular') {
        style.width = style.height;
    }

    const elements = Array.from({ length: count }, (_, i) => (
        <div
            key={i}
            className={`${baseClass} ${variantClasses[variant]} ${className}`}
            style={style}
        />
    ));

    return count === 1 ? elements[0] : <div className="space-y-2">{elements}</div>;
};

// Card Skeleton - For file cards, history items, etc.
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`bg-[#0a0a1a] border border-[#222] rounded-xl p-4 ${className}`}>
        <div className="flex items-start gap-4">
            <Skeleton variant="circular" width={48} height={48} />
            <div className="flex-1 space-y-3">
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="40%" height="0.75rem" />
            </div>
        </div>
        <div className="mt-4 space-y-2">
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="80%" />
        </div>
    </div>
);

// List Skeleton - For transfer history, peer lists
export const ListSkeleton: React.FC<{ count?: number; className?: string }> = ({ count = 5, className = '' }) => (
    <div className={`space-y-3 ${className}`}>
        {Array.from({ length: count }, (_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-[#0a0a1a] border border-[#222] rounded-lg">
                <Skeleton variant="circular" width={40} height={40} />
                <div className="flex-1 space-y-2">
                    <Skeleton variant="text" width={`${60 + Math.random() * 30}%`} />
                    <Skeleton variant="text" width={`${30 + Math.random() * 20}%`} height="0.625rem" />
                </div>
                <Skeleton variant="rectangular" width={60} height={28} className="rounded-md" />
            </div>
        ))}
    </div>
);

// Stats Skeleton - For analytics dashboard
export const StatsSkeleton: React.FC = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="bg-[#0a0a1a] border border-[#222] rounded-xl p-4">
                <Skeleton variant="text" width="40%" height="0.75rem" className="mb-3" />
                <Skeleton variant="text" width="70%" height="2rem" />
            </div>
        ))}
    </div>
);

// Chat Skeleton - For communication hub
export const ChatSkeleton: React.FC = () => (
    <div className="space-y-4 p-4">
        {/* Received messages */}
        <div className="flex gap-3">
            <Skeleton variant="circular" width={32} height={32} />
            <div className="space-y-1">
                <Skeleton variant="rectangular" width={200} height={60} className="rounded-xl rounded-tl-none" />
                <Skeleton variant="text" width={60} height="0.625rem" />
            </div>
        </div>
        {/* Sent messages */}
        <div className="flex gap-3 justify-end">
            <div className="space-y-1 items-end flex flex-col">
                <Skeleton variant="rectangular" width={180} height={40} className="rounded-xl rounded-tr-none bg-[#00f3ff]/10" />
                <Skeleton variant="text" width={60} height="0.625rem" />
            </div>
        </div>
        <div className="flex gap-3">
            <Skeleton variant="circular" width={32} height={32} />
            <div className="space-y-1">
                <Skeleton variant="rectangular" width={240} height={80} className="rounded-xl rounded-tl-none" />
                <Skeleton variant="text" width={60} height="0.625rem" />
            </div>
        </div>
    </div>
);

// File Preview Skeleton
export const FilePreviewSkeleton: React.FC = () => (
    <div className="bg-[#0a0a1a] border border-[#222] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#222] flex items-center gap-3">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1 space-y-2">
                <Skeleton variant="text" width="50%" />
                <Skeleton variant="text" width="30%" height="0.625rem" />
            </div>
        </div>
        <Skeleton variant="rectangular" height={300} className="rounded-none" />
    </div>
);

export default Skeleton;
