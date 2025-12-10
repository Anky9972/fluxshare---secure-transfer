// FluxShare Notification Service - Browser Notifications and Alerts
// Handles push notifications, toasts, and vibration patterns

export interface NotificationConfig {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
    vibrate?: number[];
}

export interface ToastMessage {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    duration?: number;
}

class NotificationService {
    private permission: NotificationPermission = 'default';
    private toastCallbacks: Set<(toast: ToastMessage) => void> = new Set();

    constructor() {
        // Check if notifications are supported
        if ('Notification' in window) {
            this.permission = Notification.permission;
        }
    }

    // Request notification permission
    async requestPermission(): Promise<boolean> {
        if (!('Notification' in window)) {
            console.warn('Notifications not supported');
            return false;
        }

        if (this.permission === 'granted') {
            return true;
        }

        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            return permission === 'granted';
        } catch (error) {
            console.error('Failed to request notification permission:', error);
            return false;
        }
    }

    // Show browser notification
    async showNotification(config: NotificationConfig): Promise<void> {
        if (this.permission !== 'granted') {
            const granted = await this.requestPermission();
            if (!granted) {
                // Fall back to toast
                this.showToast({
                    type: 'info',
                    message: config.body
                });
                return;
            }
        }

        try {
            const notification = new Notification(config.title, {
                body: config.body,
                icon: config.icon || '/icons/icon-192.png',
                tag: config.tag,
                requireInteraction: config.requireInteraction || false
            });

            // Vibrate separately if pattern provided
            if (config.vibrate) {
                this.vibrate(config.vibrate);
            }

            // Auto-close after 5 seconds if not requiring interaction
            if (!config.requireInteraction) {
                setTimeout(() => notification.close(), 5000);
            }
        } catch (error) {
            console.error('Failed to show notification:', error);
            this.showToast({
                type: 'info',
                message: config.body
            });
        }
    }

    // Notification presets for common events
    async notifyFileReceived(fileName: string, peerId: string): Promise<void> {
        await this.showNotification({
            title: '📥 INCOMING_DATA // RECEIVED',
            body: `File: ${fileName} received from [${peerId}]`,
            tag: 'file-received',
            vibrate: [200, 100, 200]
        });
    }

    async notifyPeerConnected(peerId: string): Promise<void> {
        await this.showNotification({
            title: '🔗 NEURAL_LINK // ACTIVE',
            body: `Peer [${peerId}] connected to network`,
            tag: 'peer-connected',
            vibrate: [100]
        });
    }

    async notifyPeerDisconnected(peerId: string): Promise<void> {
        await this.showNotification({
            title: '🔌 LINK_TERMINATED // OFFLINE',
            body: `Peer [${peerId}] disconnected from network`,
            tag: 'peer-disconnected',
            vibrate: [100, 50, 100]
        });
    }

    async notifyTransferComplete(fileName: string, success: boolean): Promise<void> {
        await this.showNotification({
            title: success ? '✅ TRANSFER_COMPLETE // SUCCESS' : '❌ TRANSMISSION_FAILED // ERROR',
            body: success
                ? `Data packet [${fileName}] successfully integrated.`
                : `Failed to integrate data packet [${fileName}].`,
            tag: 'transfer-complete',
            vibrate: success ? [200, 100, 200, 100, 200] : [500]
        });
    }

    async notifyIncomingCall(peerId: string): Promise<void> {
        await this.showNotification({
            title: '📞 INCOMING_SIGNAL // CALL',
            body: `Encrypted video feed request from [${peerId}]`,
            tag: 'incoming-call',
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300]
        });
    }

    async notifyNewMessage(peerId: string, preview: string): Promise<void> {
        await this.showNotification({
            title: `💬 ENCRYPTED_MESSAGE // [${peerId}]`,
            body: preview.substring(0, 50) + (preview.length > 50 ? '...' : ''),
            tag: 'new-message',
            vibrate: [100, 50, 100]
        });
    }

    // Toast notifications (in-app)
    showToast(config: Partial<ToastMessage>): void {
        const toast: ToastMessage = {
            id: this.generateId(),
            type: config.type || 'info',
            message: config.message || '',
            duration: config.duration || 3000
        };

        // Notify all registered callbacks
        this.toastCallbacks.forEach(callback => {
            callback(toast);
        });
    }

    // Register callback for toast messages
    onToast(callback: (toast: ToastMessage) => void): () => void {
        this.toastCallbacks.add(callback);

        // Return unsubscribe function
        return () => {
            this.toastCallbacks.delete(callback);
        };
    }

    // Vibration patterns (mobile)
    vibrate(pattern: number | number[]): void {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }

    // Vibration presets
    vibrateSuccess(): void {
        this.vibrate([100, 50, 100]);
    }

    vibrateError(): void {
        this.vibrate([500]);
    }

    vibrateNotification(): void {
        this.vibrate([200, 100, 200]);
    }

    // Check if notifications are enabled
    isEnabled(): boolean {
        return this.permission === 'granted';
    }

    // Get permission status
    getPermission(): NotificationPermission {
        return this.permission;
    }

    // Generate unique ID
    private generateId(): string {
        return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Clear all notifications with specific tag
    clearNotifications(tag?: string): void {
        // This only works in service worker context
        // For regular notifications, they auto-close
        console.log(`Clearing notifications with tag: ${tag || 'all'}`);
    }
}

// Export singleton instance
export const notificationService = new NotificationService();
