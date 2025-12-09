// FluxShare Encryption Service - End-to-End File Encryption
// Uses Web Crypto API for secure file encryption with custom passphrases

import CryptoJS from 'crypto-js';

export interface EncryptedFile {
    encryptedData: ArrayBuffer;
    salt: string;
    iv: string;
    fileName: string;
    mimeType: string;
    originalSize: number;
}

export interface EncryptionOptions {
    passphrase?: string;
    generateVerificationCode?: boolean;
}

class EncryptionService {
    // Generate a random verification code for peer authentication
    generateVerificationCode(length: number = 6): string {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let code = '';
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);

        for (let i = 0; i < length; i++) {
            code += chars[array[i] % chars.length];
        }

        return code;
    }

    // Encrypt file with passphrase
    async encryptFile(file: File, passphrase: string): Promise<EncryptedFile> {
        try {
            // Read file as ArrayBuffer
            const fileBuffer = await file.arrayBuffer();
            const fileData = new Uint8Array(fileBuffer);

            // Generate salt and IV
            const salt = CryptoJS.lib.WordArray.random(128 / 8).toString();
            const iv = CryptoJS.lib.WordArray.random(128 / 8);

            // Derive key from passphrase using PBKDF2
            const key = CryptoJS.PBKDF2(passphrase, salt, {
                keySize: 256 / 32,
                iterations: 1000
            });

            // Convert Uint8Array to WordArray
            const wordArray = this.uint8ArrayToWordArray(fileData);

            // Encrypt
            const encrypted = CryptoJS.AES.encrypt(wordArray, key, {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            });

            // Convert encrypted data to ArrayBuffer
            const encryptedData = this.base64ToArrayBuffer(encrypted.toString());

            return {
                encryptedData,
                salt,
                iv: iv.toString(),
                fileName: file.name,
                mimeType: file.type,
                originalSize: file.size
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Failed to encrypt file');
        }
    }

    // Decrypt file with passphrase
    async decryptFile(encryptedFile: EncryptedFile, passphrase: string): Promise<File> {
        try {
            // Derive key from passphrase using same salt
            const key = CryptoJS.PBKDF2(passphrase, encryptedFile.salt, {
                keySize: 256 / 32,
                iterations: 1000
            });

            // Convert ArrayBuffer to base64 string
            const encryptedBase64 = this.arrayBufferToBase64(encryptedFile.encryptedData);

            // Decrypt
            const decrypted = CryptoJS.AES.decrypt(encryptedBase64, key, {
                iv: CryptoJS.enc.Hex.parse(encryptedFile.iv),
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            });

            // Convert WordArray to Uint8Array
            const decryptedData = this.wordArrayToUint8Array(decrypted);

            // Create File object - cast buffer to ArrayBuffer for type safety
            const blob = new Blob([decryptedData.buffer as ArrayBuffer], { type: encryptedFile.mimeType });
            const file = new File([blob], encryptedFile.fileName, { type: encryptedFile.mimeType });

            return file;
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt file - incorrect passphrase?');
        }
    }

    // Encrypt text message
    encryptMessage(message: string, passphrase: string): string {
        try {
            const encrypted = CryptoJS.AES.encrypt(message, passphrase);
            return encrypted.toString();
        } catch (error) {
            console.error('Message encryption failed:', error);
            throw new Error('Failed to encrypt message');
        }
    }

    // Decrypt text message
    decryptMessage(encryptedMessage: string, passphrase: string): string {
        try {
            const decrypted = CryptoJS.AES.decrypt(encryptedMessage, passphrase);
            return decrypted.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error('Message decryption failed:', error);
            throw new Error('Failed to decrypt message');
        }
    }

    // Generate secure random passphrase
    generatePassphrase(length: number = 16): string {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);

        let passphrase = '';
        for (let i = 0; i < length; i++) {
            passphrase += charset[array[i] % charset.length];
        }

        return passphrase;
    }

    // Hash data (for verification)
    async hashData(data: string): Promise<string> {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Verify hash
    async verifyHash(data: string, hash: string): Promise<boolean> {
        const computedHash = await this.hashData(data);
        return computedHash === hash;
    }

    // Helper: Convert Uint8Array to WordArray
    private uint8ArrayToWordArray(u8Array: Uint8Array): CryptoJS.lib.WordArray {
        const words: number[] = [];
        for (let i = 0; i < u8Array.length; i++) {
            words[i >>> 2] |= u8Array[i] << (24 - (i % 4) * 8);
        }
        return CryptoJS.lib.WordArray.create(words, u8Array.length);
    }

    // Helper: Convert WordArray to Uint8Array
    private wordArrayToUint8Array(wordArray: CryptoJS.lib.WordArray): Uint8Array {
        const words = wordArray.words;
        const sigBytes = wordArray.sigBytes;
        const u8 = new Uint8Array(sigBytes);

        for (let i = 0; i < sigBytes; i++) {
            u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        }

        return u8;
    }

    // Helper: Convert ArrayBuffer to Base64
    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    // Helper: Convert Base64 to ArrayBuffer
    private base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    // Check if passphrase is strong enough
    isStrongPassphrase(passphrase: string): { strong: boolean; message: string } {
        if (passphrase.length < 8) {
            return { strong: false, message: 'Passphrase must be at least 8 characters' };
        }

        const hasUpperCase = /[A-Z]/.test(passphrase);
        const hasLowerCase = /[a-z]/.test(passphrase);
        const hasNumbers = /[0-9]/.test(passphrase);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(passphrase);

        const strength = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;

        if (strength < 3) {
            return {
                strong: false,
                message: 'Passphrase should contain uppercase, lowercase, numbers, and special characters'
            };
        }

        return { strong: true, message: 'Strong passphrase' };
    }
}

// Export singleton instance
export const encryptionService = new EncryptionService();
