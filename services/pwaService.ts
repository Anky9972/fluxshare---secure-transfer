// PWA Service - Handle service worker registration and install prompt
export class PWAService {
    private deferredPrompt: any = null;
    private isInstalled = false;

    constructor() {
        this.init();
    }

    private init() {
        // Check if already installed
        this.isInstalled = window.matchMedia('(display-mode: standalone)').matches;

        // Register service worker
        if ('serviceWorker' in navigator) {
            this.registerServiceWorker();
        }

        // Listen for install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            console.log('[PWA] Install prompt available');
        });

        // Listen for app installed event
        window.addEventListener('appinstalled', () => {
            console.log('[PWA] App installed successfully');
            this.isInstalled = true;
            this.deferredPrompt = null;
        });
    }

    private async registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });

            console.log('[PWA] Service Worker registered:', registration.scope);

            // Check for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('[PWA] New service worker found');

                newWorker?.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('[PWA] New version available');
                        // Notify user about update
                        this.notifyUpdate();
                    }
                });
            });

            // Handle controller change
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('[PWA] Controller changed, reloading...');
                window.location.reload();
            });

        } catch (error) {
            console.error('[PWA] Service Worker registration failed:', error);
        }
    }

    public async showInstallPrompt(): Promise<boolean> {
        if (!this.deferredPrompt) {
            console.log('[PWA] No install prompt available');
            return false;
        }

        try {
            // Show the install prompt
            this.deferredPrompt.prompt();

            // Wait for user response
            const { outcome } = await this.deferredPrompt.userChoice;
            console.log('[PWA] User choice:', outcome);

            this.deferredPrompt = null;
            return outcome === 'accepted';
        } catch (error) {
            console.error('[PWA] Install prompt error:', error);
            return false;
        }
    }

    public canInstall(): boolean {
        return !this.isInstalled && this.deferredPrompt !== null;
    }

    public isAppInstalled(): boolean {
        return this.isInstalled;
    }

    private notifyUpdate() {
        // Dispatch custom event for UI to handle
        window.dispatchEvent(new CustomEvent('pwa-update-available'));
    }

    public async clearCache() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            const messageChannel = new MessageChannel();

            return new Promise((resolve) => {
                messageChannel.port1.onmessage = (event) => {
                    resolve(event.data.success);
                };

                navigator.serviceWorker.controller.postMessage(
                    { type: 'CACHE_CLEAR' },
                    [messageChannel.port2]
                );
            });
        }
    }

    public async checkForUpdates() {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                await registration.update();
            }
        }
    }

    public async unregister() {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                await registration.unregister();
                console.log('[PWA] Service worker unregistered');
            }
        }
    }
}

// Singleton instance
export const pwaService = new PWAService();
