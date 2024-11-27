import { useState, useRef } from 'react';

interface ChatInputProps {
    onSubmit: (message: string) => void;
    isLoading: boolean;
    getPlaceholderText: () => string;
}

export default function ChatInput({ onSubmit, isLoading, getPlaceholderText }: ChatInputProps) {
    const [inputMessage, setInputMessage] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e as any);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMessage.trim() || isLoading) return;

        onSubmit(inputMessage);
        setInputMessage('');

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    return (
        <div className="shrink-0 border-t border-gray-200 dark:border-gray-700">
            <form onSubmit={handleSubmit} className="flex gap-2 p-4">
                <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputMessage}
                    onChange={(e) => {
                        setInputMessage(e.target.value);
                        adjustTextareaHeight();
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={getPlaceholderText()}
                    disabled={isLoading}
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 
                             px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 
                             dark:bg-gray-700 dark:text-gray-300 resize-none
                             disabled:opacity-50 disabled:cursor-not-allowed
                             min-h-[40px] max-h-[200px]"
                />
                <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 
                             transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                             h-[40px]"
                    disabled={!inputMessage.trim() || isLoading}
                >
                    {isLoading ? 'Sending...' : 'Send'}
                </button>
            </form>
        </div>
    );
} 