// Emoji Picker Component - Cyberpunk-styled emoji selector
import React, { useState } from 'react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Smile } from 'lucide-react';

interface CyberpunkEmojiPickerProps {
    onEmojiSelect: (emoji: string) => void;
    buttonClassName?: string;
}

const CyberpunkEmojiPicker: React.FC<CyberpunkEmojiPickerProps> = ({
    onEmojiSelect,
    buttonClassName = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        onEmojiSelect(emojiData.emoji);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={buttonClassName || "text-[#00f3ff] hover:text-white transition-colors p-2"}
                type="button"
            >
                <Smile size={20} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Emoji Picker */}
                    <div className="absolute bottom-full right-0 mb-2 z-50">
                        <div className="border-2 border-[#00f3ff] rounded-lg overflow-hidden shadow-2xl"
                            style={{
                                clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)'
                            }}
                        >
                            <EmojiPicker
                                onEmojiClick={handleEmojiClick}
                                theme={Theme.DARK}
                                width={350}
                                height={400}
                                searchPlaceHolder="Search emojis..."
                                previewConfig={{
                                    showPreview: false
                                }}
                                lazyLoadEmojis={true}
                            />
                        </div>
                    </div>
                </>
            )}

            <style>{`
        /* Cyberpunk styling for emoji picker */
        .epr-dark-theme {
          --epr-bg-color: #050510 !important;
          --epr-category-label-bg-color: #0a0a1a !important;
          --epr-picker-border-color: #00f3ff !important;
          --epr-search-input-bg-color: #0a0a1a !important;
          --epr-search-border-color: #00f3ff33 !important;
          --epr-hover-bg-color: #00f3ff22 !important;
          --epr-focus-bg-color: #00f3ff33 !important;
          --epr-text-color: #e0e0ff !important;
          --epr-category-icon-active-color: #00f3ff !important;
        }

        .epr-dark-theme .epr-emoji-category-label {
          color: #00f3ff !important;
          font-family: 'Orbitron', sans-serif !important;
          font-weight: bold !important;
          font-size: 11px !important;
          letter-spacing: 1px !important;
        }

        .epr-dark-theme input.epr-search {
          font-family: 'Share Tech Mono', monospace !important;
          border-radius: 4px !important;
        }

        .epr-dark-theme input.epr-search:focus {
          border-color: #00f3ff !important;
          box-shadow: 0 0 10px rgba(0, 243, 255, 0.3) !important;
        }

        .epr-dark-theme button.epr-emoji:hover {
          transform: scale(1.2);
          transition: transform 0.2s ease;
        }

        .epr-dark-theme button.epr-cat-btn.epr-active {
          background-color: #00f3ff22 !important;
          border-bottom: 2px solid #00f3ff !important;
        }
      `}</style>
        </div>
    );
};

export default CyberpunkEmojiPicker;
