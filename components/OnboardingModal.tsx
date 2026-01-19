// Onboarding Modal - First-time user tutorial
import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Send, Download, MessageSquare, Radio, Shield, Zap, CheckCircle2, Sparkles } from 'lucide-react';

interface OnboardingModalProps {
    onComplete: () => void;
}

interface Step {
    id: number;
    icon: React.ElementType;
    color: string;
    title: string;
    description: string;
    tips: string[];
}

const steps: Step[] = [
    {
        id: 1,
        icon: Shield,
        color: '#00f3ff',
        title: 'Welcome to FluxShare',
        description: 'A secure peer-to-peer file transfer and communication platform. No servers store your data - everything is encrypted end-to-end.',
        tips: [
            'Files transfer directly between devices',
            'No file size limits',
            'Works across all modern browsers',
        ]
    },
    {
        id: 2,
        icon: Send,
        color: '#00f3ff',
        title: 'Sending Files',
        description: 'To send files, go to Quick Link (P2P), select Transmitter mode, and share your unique ID with the receiver.',
        tips: [
            'Share your ID via any messaging app',
            'QR code available for easy scanning',
            'Drag & drop multiple files at once',
        ]
    },
    {
        id: 3,
        icon: Download,
        color: '#bc13fe',
        title: 'Receiving Files',
        description: 'To receive files, select Receiver mode and enter the sender\'s ID. Files will download directly to your device.',
        tips: [
            'Preview files before downloading',
            'Encrypted transfers available',
            'Resume interrupted transfers',
        ]
    },
    {
        id: 4,
        icon: MessageSquare,
        color: '#00ff9d',
        title: 'Communication Hub',
        description: 'Make secure video calls, share your screen, and collaborate on a shared whiteboard - all peer-to-peer.',
        tips: [
            'HD video and audio calls',
            'Screen sharing supported',
            'Interactive whiteboard',
        ]
    },
    {
        id: 5,
        icon: Radio,
        color: '#ff0055',
        title: 'Broadcast Hub',
        description: 'Send messages to all connected peers at once. Perfect for team announcements or group coordination.',
        tips: [
            'Requires a peer server',
            'Discover active peers',
            'AI-powered quick replies',
        ]
    },
    {
        id: 6,
        icon: Zap,
        color: '#f3ff00',
        title: 'You\'re Ready!',
        description: 'You now know the basics. Explore the settings to customize your experience and set up your username.',
        tips: [
            'Check Settings for themes',
            'Enable notifications',
            'Set your display name',
        ]
    },
];

const STORAGE_KEY = 'fluxshare_onboarding_completed';

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const step = steps[currentStep];
    const Icon = step.icon;
    const isLastStep = currentStep === steps.length - 1;
    const isFirstStep = currentStep === 0;

    const handleNext = () => {
        if (isLastStep) {
            localStorage.setItem(STORAGE_KEY, 'true');
            onComplete();
        } else {
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentStep(prev => prev + 1);
                setIsAnimating(false);
            }, 200);
        }
    };

    const handlePrev = () => {
        if (!isFirstStep) {
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentStep(prev => prev - 1);
                setIsAnimating(false);
            }, 200);
        }
    };

    const handleSkip = () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        onComplete();
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
            <div className="bg-[#050510] border-2 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
                style={{ borderColor: step.color }}
            >
                {/* Progress Bar */}
                <div className="h-1 bg-[#1a1a2e]">
                    <div 
                        className="h-full transition-all duration-500 ease-out"
                        style={{ 
                            width: `${((currentStep + 1) / steps.length) * 100}%`,
                            backgroundColor: step.color 
                        }}
                    />
                </div>

                {/* Content */}
                <div className={`p-8 transition-opacity duration-200 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div 
                            className="w-20 h-20 rounded-2xl flex items-center justify-center relative"
                            style={{ backgroundColor: `${step.color}15` }}
                        >
                            <div 
                                className="absolute inset-0 rounded-2xl border-2 animate-pulse"
                                style={{ borderColor: `${step.color}50` }}
                            />
                            <Icon size={40} style={{ color: step.color }} />
                        </div>
                    </div>

                    {/* Step indicator */}
                    <div className="flex justify-center gap-2 mb-6">
                        {steps.map((_, i) => (
                            <div 
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    i === currentStep ? 'w-8' : 'w-1.5'
                                }`}
                                style={{ 
                                    backgroundColor: i <= currentStep ? step.color : '#333'
                                }}
                            />
                        ))}
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-display font-bold text-white text-center mb-3">
                        {step.title}
                    </h2>

                    {/* Description */}
                    <p className="text-gray-400 text-center mb-6 leading-relaxed">
                        {step.description}
                    </p>

                    {/* Tips */}
                    <div className="space-y-3 mb-8">
                        {step.tips.map((tip, i) => (
                            <div 
                                key={i}
                                className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0a1a] border border-[#222]"
                            >
                                <CheckCircle2 size={18} style={{ color: step.color }} className="flex-shrink-0" />
                                <span className="text-sm text-gray-300">{tip}</span>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                        {!isFirstStep ? (
                            <button
                                onClick={handlePrev}
                                className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-white transition-colors font-mono text-sm"
                            >
                                <ArrowLeft size={16} />
                                Back
                            </button>
                        ) : (
                            <button
                                onClick={handleSkip}
                                className="px-4 py-2 text-gray-500 hover:text-white transition-colors font-mono text-sm"
                            >
                                Skip Tour
                            </button>
                        )}

                        <button
                            onClick={handleNext}
                            className="flex items-center gap-2 px-6 py-3 font-display font-bold uppercase tracking-wider text-sm rounded-lg transition-all duration-300 hover:scale-105 active:scale-95"
                            style={{ 
                                backgroundColor: step.color,
                                color: '#000'
                            }}
                        >
                            {isLastStep ? (
                                <>
                                    <Sparkles size={18} />
                                    Get Started
                                </>
                            ) : (
                                <>
                                    Next
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Hook to check if onboarding should be shown
export const useOnboarding = () => {
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        const completed = localStorage.getItem(STORAGE_KEY);
        if (!completed) {
            // Small delay to let the app load first
            setTimeout(() => setShowOnboarding(true), 500);
        }
    }, []);

    const completeOnboarding = () => {
        setShowOnboarding(false);
    };

    const resetOnboarding = () => {
        localStorage.removeItem(STORAGE_KEY);
        setShowOnboarding(true);
    };

    return { showOnboarding, completeOnboarding, resetOnboarding };
};

export default OnboardingModal;
