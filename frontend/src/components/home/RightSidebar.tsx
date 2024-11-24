import { useState, useEffect, useRef } from 'react';
import { chatApi, ChatMessage, ChatThread } from '../../lib/api/chatApi';

export default function RightSidebar() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentThread, setCurrentThread] = useState<ChatThread | null>(null);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMessage.trim() || isLoading) return;

        setIsLoading(true);
        try {
            if (!currentThread) {
                // Create new thread with first message
                const message = await chatApi.sendMessageNewThread({
                    content: inputMessage,
                    role: 'user'
                });
                // Create a new thread object from the message response
                const newThread: ChatThread = {
                    thread_id: message.thread_id,
                    user_id: message.user_id,
                    topic_id: null,
                    title: 'New Chat',
                    created_at: message.timestamp,
                    last_message_at: message.timestamp,
                    status: 'active'
                };
                setCurrentThread(newThread);
                setMessages(prev => [...prev, message]);
            } else {
                // Send message in existing thread
                const message = await chatApi.sendMessage(currentThread.thread_id, {
                    content: inputMessage,
                    role: 'user'
                });
                setMessages(prev => [...prev, message]);
            }
            setInputMessage('');
        } catch (error) {
            console.error('Error sending message:', chatApi.handleError(error));
            // Handle error (show toast notification, etc.)
        } finally {
            setIsLoading(false);
        }
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
                                key={message.message_id}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === 'user'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                        }`}
                                >
                                    <p>{message.content}</p>
                                    <span className="text-xs opacity-70 mt-1 block">
                                        {chatApi.formatChatTimestamp(message.timestamp)}
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
                        disabled={!inputMessage.trim() || isLoading}
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
} 