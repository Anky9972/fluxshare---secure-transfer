// QR Code share Component - Generate and display QR codes with cyberpunk styling
import React, { useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Copy, Download, QrCode as QrIcon } from 'lucide-react';
import { copyToClipboard } from '../../utils/fileHelpers';
import { audioService } from '../../services/audioService';
import { notificationService } from '../../services/notificationService';

interface QRCodeGeneratorProps {
    value: string;
    title?: string;
    size?: number;
    showActions?: boolean;
    className?: string;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
    value,
    title = 'SCAN_TO_CONNECT',
    size = 200,
    showActions = true,
    className = ''
}) => {
    const qrRef = useRef<HTMLDivElement>(null);

    const handleCopy = async () => {
        const success = await copyToClipboard(value);
        if (success) {
            audioService.playSound('success');
            notificationService.showToast({
                type: 'success',
                message: 'Copied to clipboard!'
            });
        } else {
            audioService.playSound('error');
            notificationService.showToast({
                type: 'error',
                message: 'Failed to copy'
            });
        }
    };

    const handleDownload = () => {
        const canvas = qrRef.current?.querySelector('canvas');
        if (canvas) {
            canvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `fluxshare-qr-${Date.now()}.png`;
                    link.click();
                    URL.revokeObjectURL(url);
                    audioService.playSound('success');
                    notificationService.showToast({
                        type: 'success',
                        message: 'QR code downloaded!'
                    });
                }
            });
        }
    };

    return (
        <div className={`bg-[#050510]/80 border border-[#bc13fe]/30 rounded-xl p-6 backdrop-blur-md ${className}`}>
            {/* Title */}
            <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 text-[#bc13fe] font-display font-bold mb-2">
                    <QrIcon size={20} />
                    <span>{title}</span>
                </div>
                <div className="text-xs text-gray-500 font-mono break-all">
                    {value}
                </div>
            </div>

            {/* QR Code */}
            <div
                ref={qrRef}
                className="bg-white p-4 rounded-lg inline-block relative overflow-hidden group"
                style={{
                    clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)'
                }}
            >
                {/* Scan line animation */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00f3ff]/20 to-transparent animate-scan pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

                <QRCodeCanvas
                    value={value}
                    size={size}
                    level="H"
                    includeMargin={false}
                    fgColor="#050510"
                    bgColor="#ffffff"
                />
            </div>

            {/* Actions */}
            {showActions && (
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={handleCopy}
                        className="flex-1 bg-[#00f3ff]/20 border border-[#00f3ff] text-[#00f3ff] px-4 py-2 rounded hover:bg-[#00f3ff] hover:text-black transition-all flex items-center justify-center gap-2 text-sm font-medium"
                    >
                        <Copy size={16} />
                        COPY
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex-1 bg-[#bc13fe]/20 border border-[#bc13fe] text-[#bc13fe] px-4 py-2 rounded hover:bg-[#bc13fe] hover:text-white transition-all flex items-center justify-center gap-2 text-sm font-medium"
                    >
                        <Download size={16} />
                        SAVE
                    </button>
                </div>
            )}

            <style>{`
        @keyframes scan {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
        </div>
    );
};

export default QRCodeGenerator;
