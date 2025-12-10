// FluxShare Transfer Queue Service
// Manages sequential and parallel file transfers

export interface QueuedFile {
    id: string;
    file: File;
    status: 'pending' | 'transferring' | 'completed' | 'failed' | 'paused' | 'cancelled';
    progress: number;
    speed: number;
    bytesTransferred: number;
    error?: string;
    startTime?: number;
    endTime?: number;
    encrypted?: boolean;
    password?: string;
}

export type QueueEventType = 'fileAdded' | 'fileStarted' | 'fileProgress' | 'fileCompleted' | 'fileFailed' | 'fileCancelled' | 'queueCompleted';

export interface QueueEvent {
    type: QueueEventType;
    fileId: string;
    file?: QueuedFile;
    progress?: number;
    speed?: number;
}

type QueueEventListener = (event: QueueEvent) => void;

class TransferQueueService {
    private queue: Map<string, QueuedFile> = new Map();
    private listeners: QueueEventListener[] = [];
    private activeTransfers: Set<string> = new Set();
    private maxParallelTransfers: number = 1; // Sequential by default

    // Add file to queue
    addFile(file: File, encrypted: boolean = false, password?: string): string {
        const id = this.generateId();
        const queuedFile: QueuedFile = {
            id,
            file,
            status: 'pending',
            progress: 0,
            speed: 0,
            bytesTransferred: 0,
            encrypted,
            password
        };

        this.queue.set(id, queuedFile);
        this.emit({ type: 'fileAdded', fileId: id, file: queuedFile });

        return id;
    }

    // Add multiple files
    addFiles(files: File[], encrypted: boolean = false, password?: string): string[] {
        return files.map(file => this.addFile(file, encrypted, password));
    }

    // Get file by ID
    getFile(id: string): QueuedFile | undefined {
        return this.queue.get(id);
    }

    // Get all files in queue
    getAllFiles(): QueuedFile[] {
        return Array.from(this.queue.values());
    }

    // Get pending files
    getPendingFiles(): QueuedFile[] {
        return Array.from(this.queue.values()).filter(f => f.status === 'pending');
    }

    // Get next file to transfer
    getNextFile(): QueuedFile | undefined {
        if (this.activeTransfers.size >= this.maxParallelTransfers) {
            return undefined;
        }

        const pending = this.getPendingFiles();
        return pending.length > 0 ? pending[0] : undefined;
    }

    // Mark file as started
    startFile(id: string): void {
        const file = this.queue.get(id);
        if (file && file.status === 'pending') {
            file.status = 'transferring';
            file.startTime = Date.now();
            this.activeTransfers.add(id);
            this.emit({ type: 'fileStarted', fileId: id, file });
        }
    }

    // Update file progress
    updateProgress(id: string, bytesTransferred: number, totalBytes: number, speed: number): void {
        const file = this.queue.get(id);
        if (file) {
            file.bytesTransferred = bytesTransferred;
            file.progress = Math.round((bytesTransferred / totalBytes) * 100);
            file.speed = speed;
            this.emit({ type: 'fileProgress', fileId: id, progress: file.progress, speed });
        }
    }

    // Mark file as completed
    completeFile(id: string): void {
        const file = this.queue.get(id);
        if (file) {
            file.status = 'completed';
            file.progress = 100;
            file.endTime = Date.now();
            file.speed = 0;
            this.activeTransfers.delete(id);
            this.emit({ type: 'fileCompleted', fileId: id, file });

            // Check if queue is fully completed
            if (this.getAllFiles().every(f => f.status === 'completed' || f.status === 'failed' || f.status === 'cancelled')) {
                this.emit({ type: 'queueCompleted', fileId: '' });
            }
        }
    }

    // Mark file as failed
    failFile(id: string, error: string): void {
        const file = this.queue.get(id);
        if (file) {
            file.status = 'failed';
            file.error = error;
            file.endTime = Date.now();
            file.speed = 0;
            this.activeTransfers.delete(id);
            this.emit({ type: 'fileFailed', fileId: id, file });
        }
    }

    // Cancel file transfer
    cancelFile(id: string): void {
        const file = this.queue.get(id);
        if (file) {
            file.status = 'cancelled';
            file.endTime = Date.now();
            file.speed = 0;
            this.activeTransfers.delete(id);
            this.emit({ type: 'fileCancelled', fileId: id, file });
        }
    }

    // Pause file transfer
    pauseFile(id: string): void {
        const file = this.queue.get(id);
        if (file && file.status === 'transferring') {
            file.status = 'paused';
            file.speed = 0;
            this.activeTransfers.delete(id);
        }
    }

    // Resume file transfer
    resumeFile(id: string): void {
        const file = this.queue.get(id);
        if (file && file.status === 'paused') {
            file.status = 'pending';
        }
    }

    // Remove file from queue
    removeFile(id: string): void {
        this.activeTransfers.delete(id);
        this.queue.delete(id);
    }

    // Clear entire queue
    clearQueue(): void {
        this.queue.clear();
        this.activeTransfers.clear();
    }

    // Clear completed files
    clearCompleted(): void {
        const completed = Array.from(this.queue.values())
            .filter(f => f.status === 'completed')
            .map(f => f.id);

        completed.forEach(id => this.removeFile(id));
    }

    // Set max parallel transfers
    setMaxParallelTransfers(count: number): void {
        this.maxParallelTransfers = Math.max(1, count);
    }

    // Get queue statistics
    getStats() {
        const files = this.getAllFiles();
        return {
            total: files.length,
            pending: files.filter(f => f.status === 'pending').length,
            transferring: files.filter(f => f.status === 'transferring').length,
            completed: files.filter(f => f.status === 'completed').length,
            failed: files.filter(f => f.status === 'failed').length,
            cancelled: files.filter(f => f.status === 'cancelled').length,
            paused: files.filter(f => f.status === 'paused').length,
            totalBytes: files.reduce((sum, f) => sum + f.file.size, 0),
            transferredBytes: files.reduce((sum, f) => sum + f.bytesTransferred, 0),
            averageSpeed: files.length > 0
                ? files.reduce((sum, f) => sum + f.speed, 0) / files.length
                : 0
        };
    }

    // Event listeners
    on(listener: QueueEventListener): void {
        this.listeners.push(listener);
    }

    off(listener: QueueEventListener): void {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    private emit(event: QueueEvent): void {
        this.listeners.forEach(listener => listener(event));
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Check if queue has active transfers
    hasActiveTransfers(): boolean {
        return this.activeTransfers.size > 0;
    }

    // Get active transfer count
    getActiveTransferCount(): number {
        return this.activeTransfers.size;
    }
}

// Export singleton instance
export const transferQueueService = new TransferQueueService();
