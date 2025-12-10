import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Key, Sparkles, MessageSquare } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
    id: string;
    role: 'user' | 'ai' | 'system';
    text: string;
    timestamp: number;
}

interface AIAssistantProps {
    onClose?: () => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ onClose }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'ai',
            text: "Hello! I'm **FluxShare AI**. How can I help you today? \n\nI can assist with troubleshooting, feature explanations, or technical questions.",
            timestamp: Date.now()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [needsApiKey, setNeedsApiKey] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');

    // Auto-scroll to bottom
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    useEffect(scrollToBottom, [messages, isTyping]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: inputValue,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        try {
            const response = await geminiService.chat(userMsg.text);

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                text: response,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error: any) {
            console.error(error);
            setIsTyping(false);

            if (error.message === 'API_KEY_MISSING' || error.message === 'RATE_LIMIT_EXCEEDED') {
                setNeedsApiKey(true);
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: error.message === 'RATE_LIMIT_EXCEEDED'
                        ? "⚠️ usage limit exceeded. Please enter your own Google Gemini API Key to continue."
                        : "⚠️ API Key missing. Please provide a Google Gemini API Key to use AI features.",
                    timestamp: Date.now()
                }]);
            } else {
                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: "Sorry, I encountered an error. Please try again later.",
                    timestamp: Date.now()
                }]);
            }
        } finally {
            setIsTyping(false);
        }
    };

    const handleSaveKey = () => {
        if (!apiKeyInput.trim()) return;
        geminiService.setCustomApiKey(apiKeyInput);
        setNeedsApiKey(false);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'system',
            text: "✅ API Key saved! You can now continue chatting.",
            timestamp: Date.now()
        }]);
        setApiKeyInput('');
    };

    return (
        <>
            {/* Floating Button - Only show if no onClose prop (standalone mode) */}
            {!onClose && !isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 left-6 z-50 p-4 rounded-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black shadow-[0_0_20px_rgba(255,215,0,0.5)] hover:scale-110 transition-transform group"
                >
                    <Bot size={28} />
                    <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-black/90 text-[#FFD700] text-xs px-3 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-[#FFD700]/30 font-mono">
                        ASK AI ASSISTANT
                    </div>
                </button>
            )}

            {/* Chat Window */}
            {(isOpen || onClose) && (
                <div className="fixed bottom-6 left-6 z-50 w-[350px] md:w-[400px] h-[500px] md:h-[600px] flex flex-col bg-[#050510] border border-[#FFD700]/50 rounded-2xl shadow-[0_0_40px_rgba(255,215,0,0.2)] overflow-hidden animate-slideIn transition-all">

                    {/* Header */}
                    <div className="p-4 bg-gradient-to-r from-[#FFD700]/10 to-transparent border-b border-[#FFD700]/20 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Bot className="text-[#FFD700]" size={20} />
                            <h3 className="font-display font-bold text-[#FFD700]">FLUXSHARE_AI</h3>
                        </div>
                        <button
                            onClick={() => onClose ? onClose() : setIsOpen(false)}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${msg.role === 'user'
                                    ? 'bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] rounded-tr-none'
                                    : msg.role === 'system'
                                        ? 'bg-red-500/10 border border-red-500/30 text-red-400 w-full text-center font-mono text-xs'
                                        : 'bg-[#1a1a2e] border border-white/10 text-gray-300 rounded-tl-none'
                                    }`}>
                                    {msg.role === 'ai' || msg.role === 'system' ? (
                                        <div className="prose prose-invert prose-sm max-w-none">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    code({ node, inline, className, children, ...props }: any) {
                                                        return !inline ? (
                                                            <div className="bg-black/50 p-2 rounded border border-white/10 my-2 font-mono text-xs overflow-x-auto">
                                                                {String(children).replace(/\n$/, '')}
                                                            </div>
                                                        ) : (
                                                            <code className="bg-black/50 px-1 rounded font-mono text-xs" {...props}>
                                                                {children}
                                                            </code>
                                                        )
                                                    }
                                                }}
                                            >
                                                {msg.text}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        msg.text
                                    )}
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl rounded-tl-none p-3 max-w-[85%]">
                                    <div className="flex gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-[#FFD700] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                        <div className="w-1.5 h-1.5 bg-[#FFD700] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        <div className="w-1.5 h-1.5 bg-[#FFD700] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-[#0a0a1a] border-t border-white/10">
                        {needsApiKey ? (
                            <div className="space-y-2 animate-fadeIn">
                                <label className="text-[10px] font-mono text-[#FFD700] uppercase tracking-wider block">
                                    Enter Gemini API Key
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="password"
                                            value={apiKeyInput}
                                            onChange={(e) => setApiKeyInput(e.target.value)}
                                            placeholder="sk-..."
                                            className="w-full bg-black/50 border border-white/10 rounded pl-9 pr-3 py-2 text-xs font-mono text-white focus:border-[#FFD700] focus:outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSaveKey}
                                        className="bg-[#FFD700] text-black px-4 py-2 rounded text-xs font-bold hover:bg-[#ffed4a] transition-colors"
                                    >
                                        SAVE
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-500">
                                    Your key is stored locally on your device.
                                </p>
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !isTyping && handleSend()}
                                    placeholder="Ask about FluxShare features..."
                                    disabled={isTyping}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:border-[#FFD700] focus:outline-none transition-colors disabled:opacity-50"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!inputValue.trim() || isTyping}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#FFD700]/10 text-[#FFD700] rounded-lg hover:bg-[#FFD700] hover:text-black transition-all disabled:opacity-0"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default AIAssistant;
