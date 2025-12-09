// FluxShare Storage Service - LocalStorage Management
// Handles transfer history, favorites, settings, and analytics

export interface TransferHistoryEntry {
    id: string;
    peerId: string;
    peerName?: string;
    fileName: string;
    fileSize: number;
    timestamp: number;
    direction: 'sent' | 'received';
    speed: number; // bytes per second
    success: boolean;
    mimeType?: string;
}

export interface FavoritePeer {
    peerId: string;
    nickname?: string;
    lastConnected: number;
    totalTransfers: number;
}

export interface UserSettings {
    theme: ThemeConfig;
    username?: string;
    soundEffects: boolean;
    notifications: boolean;
    backgroundPattern: 'grid' | 'particles' | 'waves';
    autoDownload: boolean;
    maxParallelTransfers: number;
}

export interface ThemeConfig {
    id: string;
    name: string;
    primary: string;
    secondary: string;
    accent: string;
}

export interface TransferStats {
    totalBytesSent: number;
    totalBytesReceived: number;
    totalTransfers: number;
    successfulTransfers: number;
    averageSpeed: number;
    peakSpeed: number;
    lastReset: number;
    successRate: number; // Percentage of successful transfers
}

const STORAGE_KEYS = {
    HISTORY: 'fluxshare_transfer_history',
    FAVORITES: 'fluxshare_favorites',
    SETTINGS: 'fluxshare_settings',
    STATS: 'fluxshare_stats',
    QUEUE: 'fluxshare_transfer_queue'
};

const DEFAULT_THEMES: ThemeConfig[] = [
    {
        id: 'cyber-blue',
        name: 'Neon Blue (Default)',
        primary: '#00f3ff',
        secondary: '#bc13fe',
        accent: '#00ff9d'
    },
    {
        id: 'purple-haze',
        name: 'Purple Haze',
        primary: '#bc13fe',
        secondary: '#ff0055',
        accent: '#f3ff00'
    },
    {
        id: 'matrix-green',
        name: 'Matrix Green',
        primary: '#00ff9d',
        secondary: '#00f3ff',
        accent: '#f3ff00'
    },
    {
        id: 'pink-noir',
        name: 'Pink Noir',
        primary: '#ff0055',
        secondary: '#bc13fe',
        accent: '#00f3ff'
    }
];

const DEFAULT_SETTINGS: UserSettings = {
    theme: DEFAULT_THEMES[0],
    soundEffects: true,
    notifications: true,
    backgroundPattern: 'grid',
    autoDownload: false,
    maxParallelTransfers: 3
};

class StorageService {
    // Transfer History Management
    saveTransfer(entry: TransferHistoryEntry): void {
        const history = this.getHistory();
        history.unshift(entry);

        // Keep only last 100 transfers
        const trimmed = history.slice(0, 100);
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));

        // Update stats
        this.updateStats(entry);
    }

    getHistory(limit: number = 50): TransferHistoryEntry[] {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
            if (!data) return [];
            const history: TransferHistoryEntry[] = JSON.parse(data);
            return history.slice(0, limit);
        } catch (error) {
            console.error('Error reading transfer history:', error);
            return [];
        }
    }

    clearHistory(): void {
        localStorage.removeItem(STORAGE_KEYS.HISTORY);
    }

    // Recent Peers
    getRecentPeers(limit: number = 10): string[] {
        const history = this.getHistory(limit);
        const uniquePeers = Array.from(new Set(history.map(h => h.peerId)));
        return uniquePeers;
    }

    // Favorites Management
    saveFavorite(peerId: string, nickname?: string): void {
        const favorites = this.getFavorites();
        favorites.set(peerId, {
            peerId,
            nickname,
            lastConnected: Date.now(),
            totalTransfers: (favorites.get(peerId)?.totalTransfers || 0) + 1
        });

        const favArray = Array.from(favorites.entries());
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favArray));
    }

    removeFavorite(peerId: string): void {
        const favorites = this.getFavorites();
        favorites.delete(peerId);

        const favArray = Array.from(favorites.entries());
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favArray));
    }

    getFavorites(): Map<string, FavoritePeer> {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
            if (!data) return new Map();
            const favArray: [string, FavoritePeer][] = JSON.parse(data);
            return new Map(favArray);
        } catch (error) {
            console.error('Error reading favorites:', error);
            return new Map();
        }
    }

    updateFavoriteNickname(peerId: string, nickname: string): void {
        const favorites = this.getFavorites();
        const fav = favorites.get(peerId);
        if (fav) {
            fav.nickname = nickname;
            favorites.set(peerId, fav);
            const favArray = Array.from(favorites.entries());
            localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favArray));
        }
    }

    // Settings Management
    getSettings(): UserSettings {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            if (!data) return DEFAULT_SETTINGS;
            return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
        } catch (error) {
            console.error('Error reading settings:', error);
            return DEFAULT_SETTINGS;
        }
    }

    saveSettings(settings: UserSettings): void {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }

    updateSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]): void {
        const settings = this.getSettings();
        settings[key] = value;
        this.saveSettings(settings);
    }

    // Theme Management
    getAvailableThemes(): ThemeConfig[] {
        return DEFAULT_THEMES;
    }

    getCurrentTheme(): ThemeConfig {
        const settings = this.getSettings();
        return settings.theme;
    }

    setTheme(themeId: string): void {
        const theme = DEFAULT_THEMES.find(t => t.id === themeId);
        if (theme) {
            this.updateSetting('theme', theme);
            this.applyThemeToDOM(theme);
        }
    }

    applyThemeToDOM(theme: ThemeConfig): void {
        document.documentElement.style.setProperty('--cyber-primary', theme.primary);
        document.documentElement.style.setProperty('--cyber-secondary', theme.secondary);
        document.documentElement.style.setProperty('--cyber-accent', theme.accent);
    }

    // Statistics Management
    getStats(): TransferStats {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.STATS);
            if (!data) {
                return {
                    totalBytesSent: 0,
                    totalBytesReceived: 0,
                    totalTransfers: 0,
                    successfulTransfers: 0,
                    averageSpeed: 0,
                    peakSpeed: 0,
                    lastReset: Date.now(),
                    successRate: 100
                };
            }
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading stats:', error);
            return {
                totalBytesSent: 0,
                totalBytesReceived: 0,
                totalTransfers: 0,
                successfulTransfers: 0,
                averageSpeed: 0,
                peakSpeed: 0,
                lastReset: Date.now(),
                successRate: 100
            };
        }
    }

    private updateStats(entry: TransferHistoryEntry): void {
        const stats = this.getStats();

        if (entry.direction === 'sent') {
            stats.totalBytesSent += entry.fileSize;
        } else {
            stats.totalBytesReceived += entry.fileSize;
        }

        stats.totalTransfers += 1;
        if (entry.success) {
            stats.successfulTransfers += 1;
        }

        // Update average speed
        stats.averageSpeed = Math.round(
            (stats.averageSpeed * (stats.totalTransfers - 1) + entry.speed) / stats.totalTransfers
        );

        // Update peak speed
        if (entry.speed > stats.peakSpeed) {
            stats.peakSpeed = entry.speed;
        }

        // Calculate success rate
        stats.successRate = stats.totalTransfers > 0
            ? Math.round((stats.successfulTransfers / stats.totalTransfers) * 100)
            : 100;

        localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    }

    resetStats(): void {
        const stats: TransferStats = {
            totalBytesSent: 0,
            totalBytesReceived: 0,
            totalTransfers: 0,
            successfulTransfers: 0,
            averageSpeed: 0,
            peakSpeed: 0,
            lastReset: Date.now(),
            successRate: 100
        };
        localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    }

    // Format helpers
    formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    formatSpeed(bytesPerSecond: number): string {
        return this.formatBytes(bytesPerSecond) + '/s';
    }

    // Clear all data
    clearAllData(): void {
        Object.values(STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    }

    // Export data
    exportData(): string {
        const data = {
            history: this.getHistory(1000),
            favorites: Array.from(this.getFavorites().entries()),
            settings: this.getSettings(),
            stats: this.getStats(),
            exportDate: new Date().toISOString()
        };
        return JSON.stringify(data, null, 2);
    }

    // Import data
    importData(jsonString: string): boolean {
        try {
            const data = JSON.parse(jsonString);

            if (data.history) {
                localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(data.history));
            }
            if (data.favorites) {
                localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(data.favorites));
            }
            if (data.settings) {
                localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
            }
            if (data.stats) {
                localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(data.stats));
            }

            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }
}

// Export singleton instance
export const storageService = new StorageService();
