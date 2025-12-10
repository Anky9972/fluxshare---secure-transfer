import { describe, it, expect, beforeEach } from 'vitest';
import { encryptionService } from '../encryptionService';

describe('EncryptionService', () => {
    const testPassword = 'Test123!@#';
    const testMessage = 'Hello, world!';

    describe('Message Encryption/Decryption', () => {
        it('should encrypt and decrypt a message correctly', () => {
            const encrypted = encryptionService.encryptMessage(testMessage, testPassword);
            expect(encrypted).toBeTruthy();
            expect(encrypted).not.toBe(testMessage);

            const decrypted = encryptionService.decryptMessage(encrypted, testPassword);
            expect(decrypted).toBe(testMessage);
        });

        it('should fail to decrypt with wrong password', () => {
            const encrypted = encryptionService.encryptMessage(testMessage, testPassword);
            expect(() => {
                encryptionService.decryptMessage(encrypted, 'wrongPassword');
            }).toThrow();
        });
    });

    describe('File Encryption/Decryption', () => {
        it('should encrypt and decrypt a text file correctly', async () => {
            const fileContent = 'This is a test file content.';
            const file = new File([fileContent], 'test.txt', { type: 'text/plain' });

            const encrypted = await encryptionService.encryptFile(file, testPassword);
            expect(encrypted).toBeTruthy();
            expect(encrypted.encryptedData).toBeInstanceOf(ArrayBuffer);
            expect(encrypted.fileName).toBe('test.txt');
            expect(encrypted.mimeType).toBe('text/plain');

            const decrypted = await encryptionService.decryptFile(encrypted, testPassword);
            expect(decrypted.name).toBe('test.txt');
            expect(decrypted.type).toBe('text/plain');

            const decryptedContent = await decrypted.text();
            expect(decryptedContent).toBe(fileContent);
        });

        it('should fail to decrypt file with wrong password', async () => {
            const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
            const encrypted = await encryptionService.encryptFile(file, testPassword);

            await expect(async () => {
                await encryptionService.decryptFile(encrypted, 'wrongPassword');
            }).rejects.toThrow();
        });
    });

    describe('Password Strength Validation', () => {
        it('should accept strong passphrase', () => {
            const result = encryptionService.isStrongPassphrase('Test123!@#');
            expect(result.strong).toBe(true);
        });

        it('should reject weak passphrase (too short)', () => {
            const result = encryptionService.isStrongPassphrase('Test1!');
            expect(result.strong).toBe(false);
            expect(result.message).toContain('at least 8 characters');
        });

        it('should reject weak passphrase (missing character types)', () => {
            const result = encryptionService.isStrongPassphrase('testpassword');
            expect(result.strong).toBe(false);
        });
    });

    describe('Hash and Verification', () => {
        it('should hash data consistently', async () => {
            const data = 'test data';
            const hash1 = await encryptionService.hashData(data);
            const hash2 = await encryptionService.hashData(data);
            expect(hash1).toBe(hash2);
        });

        it('should verify hash correctly', async () => {
            const data = 'test data';
            const hash = await encryptionService.hashData(data);
            const isValid = await encryptionService.verifyHash(data, hash);
            expect(isValid).toBe(true);
        });

        it('should fail verification with wrong data', async () => {
            const data = 'test data';
            const hash = await encryptionService.hashData(data);
            const isValid = await encryptionService.verifyHash('wrong data', hash);
            expect(isValid).toBe(false);
        });
    });

    describe('Passphrase Generation', () => {
        it('should generate passphrase of correct length', () => {
            const passphrase = encryptionService.generatePassphrase(16);
            expect(passphrase).toHaveLength(16);
        });

        it('should generate different passphrases', () => {
            const pass1 = encryptionService.generatePassphrase();
            const pass2 = encryptionService.generatePassphrase();
            expect(pass1).not.toBe(pass2);
        });
    });

    describe('Verification Code Generation', () => {
        it('should generate verification code of correct length', () => {
            const code = encryptionService.generateVerificationCode(6);
            expect(code).toHaveLength(6);
        });

        it('should generate alphanumeric codes', () => {
            const code = encryptionService.generateVerificationCode(10);
            expect(code).toMatch(/^[0-9A-Z]+$/);
        });
    });
});
