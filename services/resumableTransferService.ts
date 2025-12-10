// FluxShare Resumable Transfer Service
// Handles transfer state persistence and resume capability

export interface TransferState {
    transferId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    bytesTransferred: number;
    peerId: string;
    direction: 'send' | 'receive';
    timestamp: number;
    encrypted: boolean;
    chunks: number[]; // Array of received chunk indices for resume validation
}

const STORAGE_KEY = 'fluxshare_transfer_states';
const MAX_RESUME_AGE = 24 * 60 * 60 * 1000; // 24 hours

class ResumableTransferService {
    private activeTransfers: Map<string, TransferState> = new Map();

    // Save transfer state
    saveTransferState(state: TransferState): void {
        this.activeTransfers.set(state.transferId, state);
        this.persistToStorage();
    }

    // Get transfer state
    getTransferState(transferId: string): TransferState | undefined {
        return this.activeTransfers.get(transferId);
    }

    // Update bytes transferred
    updateProgress(transferId: string, bytesTransferred: number, chunkIndex?: number): void {
        const state = this.activeTransfers.get(transferId);
        if (state) {
            state.bytesTransferred = bytesTransferred;
            state.timestamp = Date.now();

            // Track received chunks
            if (chunkIndex !== undefined && !state.chunks.includes(chunkIndex)) {
                state.chunks.push(chunkIndex);
                state.chunks.sort((a, b) => a - b);
            }

            this.persistToStorage();
        }
    }

    // Create new transfer state
    createTransferState(
        fileName: string,
        fileSize: number,
        mimeType: string,
        peerId: string,
        direction: 'send' | 'receive',
        encrypted: boolean = false
    ): TransferState {
        const transferId = this.generateTransferId();
        const state: TransferState = {
            transferId,
            fileName,
            fileSize,
            mimeType,
            bytesTransferred: 0,
            peerId,
            direction,
            timestamp: Date.now(),
            encrypted,
            chunks: []
        };

        this.saveTransferState(state);
        return state;
    }

    // Check if transfer can be resumed
    canResume(transferId: string): boolean {
        const state = this.activeTransfers.get(transferId);
        if (!state) return false;

        // Check if transfer is not too old
        const age = Date.now() - state.timestamp;
        if (age > MAX_RESUME_AGE) {
            this.removeTransferState(transferId);
            return false;
        }

        // Check if there's progress to resume
        return state.bytesTransferred > 0 && state.bytesTransferred < state.fileSize;
    }

    // Get resume offset (bytes to skip)
    getResumeOffset(transferId: string): number {
        const state = this.activeTransfers.get(transferId);
        return state ? state.bytesTransferred : 0;
    }

    // Get missing chunk indices (for chunked transfers)
    getMissingChunks(transferId: string, totalChunks: number): number[] {
        const state = this.activeTransfers.get(transferId);
        if (!state) return Array.from({ length: totalChunks }, (_, i) => i);

        const receivedChunks = new Set(state.chunks);
        const missing: number[] = [];

        for (let i = 0; i < totalChunks; i++) {
            if (!receivedChunks.has(i)) {
                missing.push(i);
            }
        }

        return missing;
    }

    // Remove transfer state (after completion or cancellation)
    removeTransferState(transferId: string): void {
        this.activeTransfers.delete(transferId);
        this.persistToStorage();
    }

    // Clear old transfer states
    clearOldStates(): void {
        const now = Date.now();
        const toRemove: string[] = [];

        this.activeTransfers.forEach((state, id) => {
            if (now - state.timestamp > MAX_RESUME_AGE) {
                toRemove.push(id);
            }
        });

        toRemove.forEach(id => this.activeTransfers.delete(id));
        this.persistToStorage();
    }

    // Get all active transfers for a peer
    getTransfersForPeer(peerId: string): TransferState[] {
        return Array.from(this.activeTransfers.values())
            .filter(state => state.peerId === peerId);
    }

    // Find matching transfer (for reconnection)
    findMatchingTransfer(
        fileName: string,
        fileSize: number,
        peerId: string,
        direction: 'send' | 'receive'
    ): TransferState | undefined {
        return Array.from(this.activeTransfers.values()).find(
            state =>
                state.fileName === fileName &&
                state.fileSize === fileSize &&
                state.peerId === peerId &&
                state.direction === direction &&
                this.canResume(state.transferId)
        );
    }

    // Persist to localStorage
    private persistToStorage(): void {
        try {
            const data = Array.from(this.activeTransfers.entries());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to persist transfer states:', error);
        }
    }

    // Load from localStorage
    loadFromStorage(): void {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                const entries: [string, TransferState][] = JSON.parse(data);
                this.activeTransfers = new Map(entries);
                this.clearOldStates(); // Clean up on load
            }
        } catch (error) {
            console.error('Failed to load transfer states:', error);
            this.activeTransfers.clear();
        }
    }

    // Generate unique transfer ID
    private generateTransferId(): string {
        return `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Clear all states
    clearAll(): void {
        this.activeTransfers.clear();
        this.persistToStorage();
    }

    // Get statistics
    getStats() {
        const states = Array.from(this.activeTransfers.values());
        return {
            totalTransfers: states.length,
            sending: states.filter(s => s.direction === 'send').length,
            receiving: states.filter(s => s.direction === 'receive').length,
            resumable: states.filter(s => this.canResume(s.transferId)).length,
            totalBytes: states.reduce((sum, s) => sum + s.fileSize, 0),
            transferredBytes: states.reduce((sum, s) => sum + s.bytesTransferred, 0)
        };
    }
}

// Export singleton instance
export const resumableTransferService = new ResumableTransferService();

// Load states on module initialization
resumableTransferService.loadFromStorage();
