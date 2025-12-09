// Voice Recorder Component - Record voice messages with waveform visualization
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, Trash2, Send } from 'lucide-react';
import { audioService, VoiceRecording } from '../../services/audioService';

interface VoiceRecorderProps {
    onRecordingComplete?: (recording: VoiceRecording) => void;
    onSend?: (recording: VoiceRecording) => void;
    maxDuration?: number; // in seconds
    showWaveform?: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
    onRecordingComplete,
    onSend,
    maxDuration = 120,
    showWaveform = true
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<VoiceRecording | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1.0);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    // Draw waveform
    useEffect(() => {
        if (recording && showWaveform && canvasRef.current) {
            drawWaveform(recording.waveformData || []);
        }
    }, [recording, showWaveform]);

    const drawWaveform = (waveformData: number[]) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const barWidth = width / waveformData.length;

        ctx.clearRect(0, 0, width, height);

        // Gradient for cyberpunk look
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#00f3ff');
        gradient.addColorStop(1, '#bc13fe');

        ctx.fillStyle = gradient;

        waveformData.forEach((value, index) => {
            const barHeight = value * height;
            const x = index * barWidth;
            const y = (height - barHeight) / 2;

            ctx.fillRect(x, y, barWidth - 2, barHeight);
        });
    };

    const startRecording = async () => {
        try {
            await audioService.startRecording();
            setIsRecording(true);
            setDuration(0);

            // Start timer
            timerRef.current = setInterval(() => {
                setDuration(prev => {
                    const newDuration = prev + 1;
                    if (newDuration >= maxDuration) {
                        stopRecording();
                        return maxDuration;
                    }
                    return newDuration;
                });
            }, 1000);

            audioService.playSound('connect');
        } catch (error) {
            console.error('Failed to start recording:', error);
            audioService.playSound('error');
        }
    };

    const stopRecording = async () => {
        try {
            const rec = await audioService.stopRecording();
            setRecording(rec);
            setIsRecording(false);

            if (timerRef.current) {
                clearInterval(timerRef.current);
            }

            onRecordingComplete?.(rec);
            audioService.playSound('success');
        } catch (error) {
            console.error('Failed to stop recording:', error);
            audioService.playSound('error');
        }
    };

    const playRecording = async () => {
        if (!recording) return;

        setIsPlaying(true);
        try {
            await audioService.playRecording(recording, playbackRate);
            setIsPlaying(false);
        } catch (error) {
            console.error('Failed to play recording:', error);
            setIsPlaying(false);
        }
    };

    const deleteRecording = () => {
        setRecording(null);
        setDuration(0);
        audioService.playSound('disconnect');
    };

    const sendRecording = () => {
        if (recording && onSend) {
            onSend(recording);
            setRecording(null);
            setDuration(0);
            audioService.playSound('send');
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-[#050510]/80 border border-[#00f3ff]/30 rounded-xl p-4 backdrop-blur-md">
            {/* Waveform Canvas */}
            {showWaveform && recording && (
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={80}
                    className="w-full h-20 mb-4 rounded"
                />
            )}

            {/* Timer / Duration */}
            <div className="text-center mb-4">
                <div className="text-2xl font-mono text-[#00f3ff] font-bold">
                    {formatTime(isRecording ? duration : (recording?.duration || 0))}
                </div>
                {isRecording && (
                    <div className="text-xs text-gray-500 mt-1">
                        MAX: {formatTime(maxDuration)}
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
                {!recording && !isRecording && (
                    <button
                        onClick={startRecording}
                        className="bg-[#00f3ff]/20 border border-[#00f3ff] text-[#00f3ff] p-4 rounded-full hover:bg-[#00f3ff] hover:text-black transition-all"
                    >
                        <Mic size={24} />
                    </button>
                )}

                {isRecording && (
                    <button
                        onClick={stopRecording}
                        className="bg-[#ff0055]/20 border border-[#ff0055] text-[#ff0055] p-4 rounded-full hover:bg-[#ff0055] hover:text-white transition-all animate-pulse"
                    >
                        <Square size={24} />
                    </button>
                )}

                {recording && (
                    <>
                        <button
                            onClick={playRecording}
                            disabled={isPlaying}
                            className="bg-[#00ff9d]/20 border border-[#00ff9d] text-[#00ff9d] p-3 rounded-full hover:bg-[#00ff9d] hover:text-black transition-all disabled:opacity-50"
                        >
                            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                        </button>

                        {/* Playback speed */}
                        <select
                            value={playbackRate}
                            onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                            className="bg-black/50 border border-[#00f3ff]/30 text-[#00f3ff] px-3 py-2 rounded text-sm focus:outline-none focus:border-[#00f3ff]"
                        >
                            <option value="0.5">0.5x</option>
                            <option value="0.75">0.75x</option>
                            <option value="1.0">1.0x</option>
                            <option value="1.25">1.25x</option>
                            <option value="1.5">1.5x</option>
                            <option value="2.0">2.0x</option>
                        </select>

                        <button
                            onClick={deleteRecording}
                            className="bg-[#ff0055]/20 border border-[#ff0055] text-[#ff0055] p-3 rounded-full hover:bg-[#ff0055] hover:text-white transition-all"
                        >
                            <Trash2 size={20} />
                        </button>

                        {onSend && (
                            <button
                                onClick={sendRecording}
                                className="bg-[#bc13fe]/20 border border-[#bc13fe] text-[#bc13fe] p-3 rounded-full hover:bg-[#bc13fe] hover:text-white transition-all"
                            >
                                <Send size={20} />
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Recording indicator */}
            {isRecording && (
                <div className="mt-4 flex items-center justify-center gap-2 text-[#ff0055] text-sm">
                    <div className="w-2 h-2 bg-[#ff0055] rounded-full animate-pulse" />
                    <span>RECORDING...</span>
                </div>
            )}
        </div>
    );
};

export default VoiceRecorder;
