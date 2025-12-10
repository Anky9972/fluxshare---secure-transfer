// FluxShare Encryption Worker
// Offloads encryption/decryption to prevent UI blocking

import CryptoJS from 'crypto-js';

// Listen for messages from main thread
self.onmessage = async (e: MessageEvent) => {
    const { type, data } = e.data;

    try {
        switch (type) {
            case 'ENCRYPT_FILE':
                const encryptResult = await encryptFile(data.fileData, data.passphrase);
                self.postMessage({ type: 'ENCRYPT_COMPLETE', result: encryptResult });
                break;

            case 'DECRYPT_FILE':
                const decryptResult = await decryptFile(
                    data.encryptedData,
                    data.salt,
                    data.iv,
                    data.passphrase,
                    data.fileName,
                    data.mimeType
                );
                self.postMessage({ type: 'DECRYPT_COMPLETE', result: decryptResult });
                break;

            default:
                self.postMessage({ type: 'ERROR', error: 'Unknown operation type' });
        }
    } catch (error: any) {
        self.postMessage({ type: 'ERROR', error: error.message || 'Operation failed' });
    }
};

// Encrypt file data
async function encryptFile(fileData: ArrayBuffer, passphrase: string) {
    const fileDataArray = new Uint8Array(fileData);

    // Generate salt and IV
    const salt = CryptoJS.lib.WordArray.random(128 / 8).toString();
    const iv = CryptoJS.lib.WordArray.random(128 / 8);

    // Derive key from passphrase using PBKDF2
    const key = CryptoJS.PBKDF2(passphrase, salt, {
        keySize: 256 / 32,
        iterations: 1000
    });

    // Convert Uint8Array to WordArray
    const wordArray = uint8ArrayToWordArray(fileDataArray);

    // Encrypt
    const encrypted = CryptoJS.AES.encrypt(wordArray, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });

    // Convert encrypted data to ArrayBuffer
    const encryptedData = base64ToArrayBuffer(encrypted.toString());

    return {
        encryptedData,
        salt,
        iv: iv.toString()
    };
}

// Decrypt file data
async function decryptFile(
    encryptedData: ArrayBuffer,
    salt: string,
    ivHex: string,
    passphrase: string,
    fileName: string,
    mimeType: string
) {
    // Derive key from passphrase using same salt
    const key = CryptoJS.PBKDF2(passphrase, salt, {
        keySize: 256 / 32,
        iterations: 1000
    });

    // Convert ArrayBuffer to base64 string
    const encryptedBase64 = arrayBufferToBase64(encryptedData);

    // Decrypt
    const decrypted = CryptoJS.AES.decrypt(encryptedBase64, key, {
        iv: CryptoJS.enc.Hex.parse(ivHex),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });

    // Convert WordArray to Uint8Array
    const decryptedData = wordArrayToUint8Array(decrypted);

    return {
        decryptedData: decryptedData.buffer,
        fileName,
        mimeType
    };
}

// Helper: Convert Uint8Array to WordArray
function uint8ArrayToWordArray(u8Array: Uint8Array): CryptoJS.lib.WordArray {
    const words: number[] = [];
    for (let i = 0; i < u8Array.length; i++) {
        words[i >>> 2] |= u8Array[i] << (24 - (i % 4) * 8);
    }
    return CryptoJS.lib.WordArray.create(words, u8Array.length);
}

// Helper: Convert WordArray to Uint8Array
function wordArrayToUint8Array(wordArray: CryptoJS.lib.WordArray): Uint8Array {
    const words = wordArray.words;
    const sigBytes = wordArray.sigBytes;
    const u8 = new Uint8Array(sigBytes);

    for (let i = 0; i < sigBytes; i++) {
        u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }

    return u8;
}

// Helper: Convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Helper: Convert Base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

export { }; // Make this a module
