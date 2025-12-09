// FluxShare Utilities - Helper functions for file handling and formatting

// Format bytes to human-readable size
export function formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Format bytes per second to speed
export function formatSpeed(bytesPerSecond: number): string {
    return formatBytes(bytesPerSecond) + '/s';
}

// Format duration in seconds to readable time
export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Get file extension
export function getFileExtension(filename: string): string {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
}

// Get file type category
export function getFileCategory(mimeType: string): 'image' | 'video' | 'audio' | 'document' | 'code' | 'archive' | 'other' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';

    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word') ||
        mimeType.includes('excel') || mimeType.includes('powerpoint') || mimeType.includes('spreadsheet')) {
        return 'document';
    }

    const codeTypes = ['javascript', 'typescript', 'python', 'java', 'cpp', 'html', 'css', 'json', 'xml'];
    if (codeTypes.some(type => mimeType.includes(type))) {
        return 'code';
    }

    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('7z')) {
        return 'archive';
    }

    return 'other';
}

// Check if file can be previewed
export function canPreview(mimeType: string): boolean {
    const category = getFileCategory(mimeType);
    return ['image', 'video', 'audio', 'document', 'code'].includes(category);
}

// Truncate string in the middle
export function truncateMiddle(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;

    const half = Math.floor((maxLength - 3) / 2);
    return str.slice(0, half) + '...' + str.slice(-half);
}

// Generate unique ID
export function generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            } catch (err) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
}

// Download blob as file
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Convert File to Base64
export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to convert to base64'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Convert Base64 to Blob
export function base64ToBlob(base64: string, mimeType: string = ''): Blob {
    const parts = base64.split(',');
    const contentType = mimeType || parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const raw = atob(parts[parts.length - 1]);
    const rawLength = raw.length;
    const array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
    }

    return new Blob([array], { type: contentType });
}

// Estimate time remaining
export function estimateTimeRemaining(bytesTransferred: number, totalBytes: number, bytesPerSecond: number): number {
    const remaining = totalBytes - bytesTransferred;
    return Math.ceil(remaining / bytesPerSecond);
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func(...args);
        };

        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return function executedFunction(...args: Parameters<T>) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

// Validate URL
export function isValidUrl(string: string): boolean {
    try {
        new URL(string);
        return true;
    } catch {
        return false;
    }
}

// Extract URLs from text
export function extractUrls(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
}

// Get file icon emoji based on type
export function getFileIcon(mimeType: string): string {
    const category = getFileCategory(mimeType);

    const icons: Record<string, string> = {
        image: '🖼️',
        video: '🎬',
        audio: '🎵',
        document: '📄',
        code: '💻',
        archive: '📦',
        other: '📁'
    };

    return icons[category];
}

// Calculate chunk count for file transfer
export function calculateChunkCount(fileSize: number, chunkSize: number): number {
    return Math.ceil(fileSize / chunkSize);
}

// Get cyberpunk-themed color for file type
export function getFileTypeColor(mimeType: string): string {
    const category = getFileCategory(mimeType);

    const colors: Record<string, string> = {
        image: '#00f3ff',     // Cyan
        video: '#bc13fe',     // Purple
        audio: '#00ff9d',     // Green
        document: '#ff0055',  // Pink
        code: '#f3ff00',      //Yellow
        archive: '#ff6b35',   // Orange
        other: '#888899'      // Gray
    };

    return colors[category];
}
