// FluxShare Audio Service - Voice Recording and Sound Effects
// Handles audio recording, playback, and cyberpunk sound effects

import type { VoiceRecording } from '../types';

export interface AudioConfig {
    sampleRate: number;
    channelCount: number;
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
}

class AudioService {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private recordingStartTime: number = 0;
    private soundEffectsEnabled: boolean = true;

    // Sound effect audio elements cache
    private soundEffects: Map<string, HTMLAudioElement> = new Map();

    // Initialize audio context for voice recording
    async startRecording(config?: Partial<AudioConfig>): Promise<void> {
        try {
            const defaultConfig: AudioConfig = {
                sampleRate: 44100,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                ...config
            };

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: defaultConfig.sampleRate,
                    channelCount: defaultConfig.channelCount,
                    echoCancellation: defaultConfig.echoCancellation,
                    noiseSuppression: defaultConfig.noiseSuppression,
                    autoGainControl: defaultConfig.autoGainControl
                }
            });

            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: this.getSupportedMimeType()
            });

            this.audioChunks = [];
            this.recordingStartTime = Date.now();

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.start(100); // Collect data every 100ms
        } catch (error) {
            console.error('Failed to start recording:', error);
            throw new Error('Microphone access denied or not available');
        }
    }

    // Stop recording and return the audio blob
    async stopRecording(): Promise<VoiceRecording> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject(new Error('No active recording'));
                return;
            }

            this.mediaRecorder.onstop = async () => {
                const blob = new Blob(this.audioChunks, { type: this.getSupportedMimeType() });
                const duration = Math.floor((Date.now() - this.recordingStartTime) / 1000);

                // Generate waveform data
                const waveformData = await this.generateWaveform(blob);

                const recording: VoiceRecording = {
                    id: this.generateId(),
                    blob,
                    duration,
                    timestamp: Date.now(),
                    waveformData
                };

                // Stop all tracks
                if (this.mediaRecorder?.stream) {
                    this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
                }

                this.mediaRecorder = null;
                this.audioChunks = [];

                resolve(recording);
            };

            this.mediaRecorder.stop();
        });
    }

    // Play voice recording
    async playRecording(recording: VoiceRecording, playbackRate: number = 1.0): Promise<void> {
        return new Promise((resolve, reject) => {
            const audio = new Audio(URL.createObjectURL(recording.blob));
            audio.playbackRate = playbackRate;

            audio.onended = () => {
                URL.revokeObjectURL(audio.src);
                resolve();
            };

            audio.onerror = (error) => {
                URL.revokeObjectURL(audio.src);
                reject(error);
            };

            audio.play();
        });
    }

    // Generate waveform data from audio blob
    private async generateWaveform(blob: Blob, samples: number = 100): Promise<number[]> {
        try {
            const arrayBuffer = await blob.arrayBuffer();
            const audioContext = new AudioContext();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            const rawData = audioBuffer.getChannelData(0);
            const blockSize = Math.floor(rawData.length / samples);
            const filteredData: number[] = [];

            for (let i = 0; i < samples; i++) {
                const blockStart = blockSize * i;
                let sum = 0;
                for (let j = 0; j < blockSize; j++) {
                    sum += Math.abs(rawData[blockStart + j]);
                }
                filteredData.push(sum / blockSize);
            }

            // Normalize to 0-1 range
            const max = Math.max(...filteredData);
            return filteredData.map(val => val / max);
        } catch (error) {
            console.error('Failed to generate waveform:', error);
            return Array(samples).fill(0.5);
        }
    }

    // Get supported MIME type for recording
    private getSupportedMimeType(): string {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4'
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return 'audio/webm';
    }

    // Sound Effects Management
    setSoundEffectsEnabled(enabled: boolean): void {
        this.soundEffectsEnabled = enabled;
    }

    // Play cyberpunk-themed sound effects
    playSound(soundType: 'connect' | 'disconnect' | 'send' | 'receive' | 'error' | 'success' | 'message'): void {
        if (!this.soundEffectsEnabled) return;

        // Check if sound already cached
        let audio = this.soundEffects.get(soundType);

        if (!audio) {
            audio = this.createSoundEffect(soundType);
            this.soundEffects.set(soundType, audio);
        }

        // Play sound
        audio.currentTime = 0;
        audio.play().catch(() => {
            // Ignore autoplay errors
        });
    }

    // Create procedural sound effects (cyberpunk style)
    private createSoundEffect(soundType: string): HTMLAudioElement {
        const audio = new Audio();
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Configure based on sound type
        switch (soundType) {
            case 'connect':
                oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                break;
            case 'disconnect':
                oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                break;
            case 'send':
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
                break;
            case 'receive':
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
                break;
            case 'error':
                oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                break;
            case 'success':
                oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.05);
                oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
                break;
            case 'message':
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                break;
        }

        oscillator.type = 'square'; // Cyberpunk retro sound
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);

        return audio;
    }

    // Generate unique ID
    private generateId(): string {
        return `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Convert recording to base64 for transmission
    async recordingToBase64(recording: VoiceRecording): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Failed to convert to base64'));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(recording.blob);
        });
    }

    // Convert base64 back to VoiceRecording
    base64ToRecording(base64: string, duration: number, waveformData?: number[]): VoiceRecording {
        const blob = this.base64ToBlob(base64);
        return {
            id: this.generateId(),
            blob,
            duration,
            timestamp: Date.now(),
            waveformData
        };
    }

    // Helper: Convert base64 to Blob
    private base64ToBlob(base64: string): Blob {
        const parts = base64.split(',');
        const contentType = parts[0].match(/:(.*?);/)?.[1] || 'audio/webm';
        const raw = atob(parts[1]);
        const rawLength = raw.length;
        const array = new Uint8Array(rawLength);

        for (let i = 0; i < rawLength; i++) {
            array[i] = raw.charCodeAt(i);
        }

        return new Blob([array], { type: contentType });
    }
}

// Export singleton instance
export const audioService = new AudioService();
