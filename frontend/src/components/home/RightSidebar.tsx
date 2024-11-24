import { useState, useEffect, useRef } from 'react';

interface Message {
    id: string;
    content: string;
    sender: 'user' | 'assistant';
    timestamp: Date;
}

export default function RightSidebar() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!inputMessage.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            content: inputMessage,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');

        const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: "This is a placeholder response. AI integration coming soon!",
            sender: 'assistant',
            timestamp: new Date()
        };

        setTimeout(() => {
            setMessages(prev => [...prev, assistantMessage]);
        }, 1000);
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-800">
            {/* Header */}
            <div className="shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold dark:text-white">AI Assistant</h2>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                            <p>No messages yet.</p>
                            <p className="text-sm mt-2">Ask me anything about your entries and topics!</p>
                        </div>
                    ) : (
                        messages.map(message => (
                            <div
                                key={message.id}
                                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg px-4 py-2 ${message.sender === 'user'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                        }`}
                                >
                                    <p>{message.content}</p>
                                    <span className="text-xs opacity-70 mt-1 block">
                                        {message.timestamp.toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="shrink-0 border-t border-gray-200 dark:border-gray-700">
                <form onSubmit={handleSubmit} className="flex gap-2 p-4">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 
                                 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 
                                 dark:bg-gray-700 dark:text-white"
                    />
                    <button
                        type="submit"
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 
                                 transition-colors duration-200 disabled:opacity-50"
                        disabled={!inputMessage.trim()}
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
} 