// Clipboard Management Service
import { generateId } from '../utils/fileHelpers';


export interface ClipboardItem {
    id: string;
    text: string;
    category: 'text' | 'code' | 'url' | 'other';
    language?: string;
    isPinned: boolean;
    timestamp: number;
    charCount: number;
}

export interface ClipboardStats {
    totalClips: number;
    pinnedCount: number;
    todayCount: number;
}

class ClipboardService {
    private readonly STORAGE_KEY = 'fluxshare_clipboard_history';
    private readonly MAX_HISTORY = 50;

    // Get all clipboard items
    getHistory(): ClipboardItem[] {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    // Save clipboard item
    saveClip(text: string, category?: 'text' | 'code' | 'url' | 'other'): ClipboardItem {
        const clips = this.getHistory();

        // Auto-detect category if not provided
        const detectedCategory = category || this.detectCategory(text);
        const language = detectedCategory === 'code' ? this.detectLanguage(text) : undefined;

        const newClip: ClipboardItem = {
            id: generateId(),
            text,
            category: detectedCategory,
            language,
            isPinned: false,
            timestamp: Date.now(),
            charCount: text.length
        };

        // Add to beginning and limit to MAX_HISTORY
        const updatedClips = [newClip, ...clips].slice(0, this.MAX_HISTORY);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedClips));

        return newClip;
    }

    // Pin a clip
    pinClip(id: string): void {
        const clips = this.getHistory();
        const updated = clips.map(clip =>
            clip.id === id ? { ...clip, isPinned: true } : clip
        );
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    }

    // Unpin a clip
    unpinClip(id: string): void {
        const clips = this.getHistory();
        const updated = clips.map(clip =>
            clip.id === id ? { ...clip, isPinned: false } : clip
        );
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    }

    // Delete a clip
    deleteClip(id: string): void {
        const clips = this.getHistory();
        const filtered = clips.filter(clip => clip.id !== id);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    }

    // Get pinned clips only
    getPinnedClips(): ClipboardItem[] {
        return this.getHistory().filter(clip => clip.isPinned);
    }

    // Search clips
    searchClips(query: string): ClipboardItem[] {
        const lowerQuery = query.toLowerCase();
        return this.getHistory().filter(clip =>
            clip.text.toLowerCase().includes(lowerQuery)
        );
    }

    // Get clips by category
    getClipsByCategory(category: 'text' | 'code' | 'url' | 'other'): ClipboardItem[] {
        return this.getHistory().filter(clip => clip.category === category);
    }

    // Clear all history (keep pinned)
    clearHistory(keepPinned: boolean = true): void {
        if (keepPinned) {
            const pinned = this.getPinnedClips();
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(pinned));
        } else {
            localStorage.removeItem(this.STORAGE_KEY);
        }
    }

    // Get stats
    getStats(): ClipboardStats {
        const clips = this.getHistory();
        const today = new Date().setHours(0, 0, 0, 0);

        return {
            totalClips: clips.length,
            pinnedCount: clips.filter(c => c.isPinned).length,
            todayCount: clips.filter(c => c.timestamp >= today).length
        };
    }

    // Detect category from text
    private detectCategory(text: string): 'text' | 'code' | 'url' | 'other' {
        // URL detection
        if (/^https?:\/\//i.test(text.trim())) {
            return 'url';
        }

        // Code detection (simple heuristics)
        const codeIndicators = [
            /^(function|const|let|var|class|import|export|def|public|private|void|int|string)\s/,
            /[{}\[\]();]/g,
            /=>|->|<-/,
            /^\s*(#include|package|using)/,
            /[a-zA-Z_][a-zA-Z0-9_]*\s*\(/
        ];

        const hasCodeIndicators = codeIndicators.some(pattern => pattern.test(text));
        const specialCharRatio = (text.match(/[{}\[\]();]/g) || []).length / text.length;

        if (hasCodeIndicators || specialCharRatio > 0.05) {
            return 'code';
        }

        return 'text';
    }

    // Detect programming language
    private detectLanguage(text: string): string {
        const patterns = [
            { lang: 'javascript', patterns: [/\bfunction\b/, /\bconst\b/, /\blet\b/, /=>/] },
            { lang: 'typescript', patterns: [/:\s*(string|number|boolean|void)/, /interface\s+\w+/] },
            { lang: 'python', patterns: [/\bdef\b/, /\bimport\b/, /\bprint\(/, /:\s*$/m] },
            { lang: 'java', patterns: [/\bpublic\s+class\b/, /\bprivate\s+\w+/, /\bvoid\b/] },
            { lang: 'cpp', patterns: [/#include/, /\bstd::/, /\busing\s+namespace/] },
            { lang: 'rust', patterns: [/\bfn\b/, /\blet\s+mut\b/, /->/, /::\w+/] },
            { lang: 'go', patterns: [/\bfunc\b/, /\bpackage\b/, /:=/] },
            { lang: 'html', patterns: [/<[a-z]+[^>]*>/, /<!DOCTYPE/i] },
            { lang: 'css', patterns: [/[.#][\w-]+\s*{/, /@media/, /:\s*[^;]+;/] },
            { lang: 'json', patterns: [/^\s*{/, /"\w+":\s*["{[]/, /}\s*$/] }
        ];

        for (const { lang, patterns: langPatterns } of patterns) {
            if (langPatterns.some(p => p.test(text))) {
                return lang;
            }
        }

        return 'plaintext';
    }
}

export const clipboardService = new ClipboardService();
