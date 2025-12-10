import React, { useState } from 'react';
import { X, Download, Copy, Check, FileText, Image as ImageIcon, Video, Music, Code, File, ExternalLink, AlertCircle } from 'lucide-react';

interface FilePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: File | null;
    fileUrl?: string;
    fileSize?: number;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ isOpen, onClose, file, fileUrl, fileSize }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !file) return null;

    const getFileType = (filename: string): string => {
        const ext = filename.split('.').pop()?.toLowerCase() || '';

        // Images
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';

        // Videos
        if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';

        // Audio
        if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) return 'audio';

        // PDF
        if (ext === 'pdf') return 'pdf';

        // Code
        if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'scss', 'html', 'json', 'xml', 'yaml', 'yml', 'md', 'go', 'rs', 'php', 'rb', 'sh'].includes(ext)) return 'code';

        // Text
        if (['txt', 'log', 'csv', 'ini', 'conf', 'env'].includes(ext)) return 'text';

        return 'unknown';
    };

    const fileType = getFileType(file.name);
    const previewUrl = fileUrl || URL.createObjectURL(file);

    const handleCopyCode = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleDownload = () => {
        const a = document.createElement('a');
        a.href = previewUrl;
        a.download = file.name;
        a.click();
    };

    const renderPreview = () => {
        switch (fileType) {
            case 'image':
                return (
                    <div className="flex items-center justify-center p-4 bg-black/50 rounded-lg">
                        <img src={previewUrl} alt={file.name} className="max-w-full max-h-[60vh] object-contain rounded" />
                    </div>
                );

            case 'video':
                return (
                    <div className="bg-black/50 rounded-lg overflow-hidden">
                        <video src={previewUrl} controls className="w-full max-h-[60vh]" />
                    </div>
                );

            case 'audio':
                return (
                    <div className="flex flex-col items-center justify-center p-8 bg-black/50 rounded-lg">
                        <Music size={64} className="text-[#00f3ff] mb-4" />
                        <p className="text-gray-400 mb-4 font-mono text-sm">{file.name}</p>
                        <audio src={previewUrl} controls className="w-full max-w-md" />
                    </div>
                );

            case 'pdf':
                return (
                    <div className="bg-[#1a1a2e] rounded-lg overflow-hidden h-full relative group">
                        <object
                            data={previewUrl}
                            type="application/pdf"
                            className="w-full h-full min-h-[60vh] rounded bg-white"
                        >
                            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
                                <FileText size={48} className="text-gray-600" />
                                <p className="text-gray-400">Unable to display PDF inline.</p>
                                <a
                                    href={previewUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => {
                                        // Force open in new window if default behavior fails
                                        if (!window.open(previewUrl, '_blank')) {
                                            alert('Pop-up blocked! Please allow pop-ups for this site to view the PDF.');
                                        }
                                    }}
                                    className="px-4 py-2 bg-[#00f3ff] text-black font-bold rounded hover:bg-[#00c2cc] transition-colors flex items-center gap-2"
                                >
                                    <ExternalLink size={16} />
                                    OPEN IN NEW TAB
                                </a>
                            </div>
                        </object>
                        {/* Convenience button to open externally */}
                        <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-4 right-4 bg-black/80 backdrop-blur text-white px-3 py-1.5 rounded-lg text-xs border border-white/20 hover:border-[#00f3ff] hover:text-[#00f3ff] transition-all flex items-center gap-2 opacity-0 group-hover:opacity-100"
                        >
                            <ExternalLink size={14} /> Open externally
                        </a>
                    </div>
                );

            case 'code':
            case 'text':
                return (
                    <CodePreview file={file} onCopy={handleCopyCode} copied={copied} />
                );

            default:
                return (
                    <div className="flex flex-col items-center justify-center p-12 bg-black/50 rounded-lg">
                        <File size={64} className="text-gray-600 mb-4" />
                        <p className="text-gray-400 font-mono text-sm mb-2">{file.name}</p>
                        <p className="text-gray-600 text-xs">Preview not available for this file type</p>
                    </div>
                );
        }
    };

    const getIcon = () => {
        switch (fileType) {
            case 'image': return <ImageIcon size={20} className="text-[#00f3ff]" />;
            case 'video': return <Video size={20} className="text-[#bc13fe]" />;
            case 'audio': return <Music size={20} className="text-[#00ff9d]" />;
            case 'pdf': return <FileText size={20} className="text-red-400" />;
            case 'code': return <Code size={20} className="text-yellow-400" />;
            default: return <File size={20} className="text-gray-400" />;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
            <div className="bg-[#050510]/95 border border-[#00f3ff]/30 rounded-xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,243,255,0.15)] backdrop-blur-xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#00f3ff]/30 bg-[#00f3ff]/5">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getIcon()}
                        <div className="flex-1 min-w-0">
                            <h2 className="font-display text-lg font-bold text-white truncate">{file.name}</h2>
                            <p className="text-xs text-gray-500 font-mono">
                                {((fileSize ?? file.size) / 1024).toFixed(2)} KB • {fileType.toUpperCase()}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownload}
                            className="p-2 hover:bg-[#00f3ff]/10 rounded-full transition-colors text-[#00f3ff]"
                            title="Download"
                        >
                            <Download size={20} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {renderPreview()}
                </div>
            </div>
        </div>
    );
};

// Code Preview Component
const CodePreview: React.FC<{ file: File; onCopy: (text: string) => void; copied: boolean }> = ({ file, onCopy, copied }) => {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setContent(e.target?.result as string || '');
            setLoading(false);
        };
        reader.readAsText(file);
    }, [file]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 bg-black/50 rounded-lg">
                <div className="text-gray-400 font-mono text-sm">Loading...</div>
            </div>
        );
    }

    return (
        <div className="bg-black/50 border border-white/10 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/30">
                <span className="text-xs text-gray-500 font-mono">{file.name}</span>
                <button
                    onClick={() => onCopy(content)}
                    className="flex items-center gap-2 px-3 py-1 bg-[#00f3ff]/10 hover:bg-[#00f3ff]/20 border border-[#00f3ff]/30 text-[#00f3ff] rounded text-xs font-mono transition-colors"
                >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'COPIED' : 'COPY'}
                </button>
            </div>
            <pre className="p-4 overflow-x-auto text-sm font-mono text-gray-300 max-h-[50vh] overflow-y-auto">
                <code>{content}</code>
            </pre>
        </div>
    );
};

export default FilePreviewModal;
