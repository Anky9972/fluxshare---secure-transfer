// Encryption Worker Wrapper Service
// Manages WebWorker for heavy encryption operations

class EncryptionWorkerService {
    private worker: Worker | null = null;
    private readonly LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB

    // Initialize worker
    private initWorker() {
        if (!this.worker) {
            this.worker = new Worker(new URL('../workers/encryptionWorker.ts', import.meta.url), {
                type: 'module'
            });
        }
    }

    // Encrypt file using worker for large files, regular service for small files
    async encryptFileWithWorker(file: File, passphrase: string): Promise<{
        encryptedData: ArrayBuffer;
        salt: string;
        iv: string;
        fileName: string;
        mimeType: string;
        originalSize: number;
    }> {
        // For small files, use the regular service
        if (file.size < this.LARGE_FILE_THRESHOLD) {
            const { encryptionService } = await import('./encryptionService');
            return await encryptionService.encryptFile(file, passphrase);
        }

        // For large files, use WebWorker
        this.initWorker();

        return new Promise(async (resolve, reject) => {
            const fileData = await file.arrayBuffer();

            const handleMessage = (e: MessageEvent) => {
                if (e.data.type === 'ENCRYPT_COMPLETE') {
                    this.worker?.removeEventListener('message', handleMessage);
                    resolve({
                        encryptedData: e.data.result.encryptedData,
                        salt: e.data.result.salt,
                        iv: e.data.result.iv,
                        fileName: file.name,
                        mimeType: file.type,
                        originalSize: file.size
                    });
                } else if (e.data.type === 'ERROR') {
                    this.worker?.removeEventListener('message', handleMessage);
                    reject(new Error(e.data.error));
                }
            };

            this.worker?.addEventListener('message', handleMessage);
            this.worker?.postMessage({
                type: 'ENCRYPT_FILE',
                data: {
                    fileData,
                    passphrase
                }
            });
        });
    }

    // Decrypt file using worker
    async decryptFileWithWorker(
        encryptedData: ArrayBuffer,
        salt: string,
        iv: string,
        passphrase: string,
        fileName: string,
        mimeType: string
    ): Promise<File> {
        // For small files, use regular service
        if (encryptedData.byteLength < this.LARGE_FILE_THRESHOLD) {
            const { encryptionService } = await import('./encryptionService');
            return await encryptionService.decryptFile({
                encryptedData,
                salt,
                iv,
                fileName,
                mimeType,
                originalSize: encryptedData.byteLength
            }, passphrase);
        }

        // For large files, use WebWorker
        this.initWorker();

        return new Promise((resolve, reject) => {
            const handleMessage = (e: MessageEvent) => {
                if (e.data.type === 'DECRYPT_COMPLETE') {
                    this.worker?.removeEventListener('message', handleMessage);
                    const { decryptedData, fileName, mimeType } = e.data.result;
                    const blob = new Blob([decryptedData], { type: mimeType });
                    const file = new File([blob], fileName, { type: mimeType });
                    resolve(file);
                } else if (e.data.type === 'ERROR') {
                    this.worker?.removeEventListener('message', handleMessage);
                    reject(new Error(e.data.error));
                }
            };

            this.worker?.addEventListener('message', handleMessage);
            this.worker?.postMessage({
                type: 'DECRYPT_FILE',
                data: {
                    encryptedData,
                    salt,
                    iv,
                    passphrase,
                    fileName,
                    mimeType
                }
            });
        });
    }

    // Terminate worker
    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }
}

export const encryptionWorkerService = new EncryptionWorkerService();
