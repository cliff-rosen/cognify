import { useState, useEffect, useRef } from 'react';
import { chatApi, ChatMessage, ChatThread } from '../../lib/api/chatApi';
import { UNCATEGORIZED_TOPIC_ID, Topic, UncategorizedTopic } from '../../lib/api/topicsApi'
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';
import type { CSSProperties } from 'react';

interface RightSidebarProps {
    currentTopic: Topic | UncategorizedTopic | null;
}

export default function RightSidebar({ currentTopic }: RightSidebarProps) {
    console.log('Current Topic in RightSidebar:', currentTopic);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentThread, setCurrentThread] = useState<ChatThread | null>(null);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Auto-resize textarea as content grows
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputMessage.trim() || isLoading) return;

        setIsLoading(true);
        const userMessage = inputMessage;
        setInputMessage('');

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }

        const tempUserMessage: Partial<ChatMessage> = {
            content: userMessage,
            role: 'user',
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempUserMessage as ChatMessage]);

        const tempLoadingMessage: Partial<ChatMessage> = {
            content: '...',
            role: 'assistant',
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempLoadingMessage as ChatMessage]);

        try {
            let response: ChatMessage;
            const messageData = {
                content: userMessage,
                role: 'user' as const,
                topic_id: currentTopic?.topic_id || null
            };

            if (!currentThread) {
                response = await chatApi.sendMessageNewThread(messageData);
                const newThread: ChatThread = {
                    thread_id: response.thread_id,
                    user_id: response.user_id,
                    topic_id: response.topic_id,
                    title: 'New Chat',
                    created_at: response.timestamp,
                    last_message_at: response.timestamp,
                    status: 'active'
                };
                setCurrentThread(newThread);
            } else {
                response = await chatApi.sendMessage(currentThread.thread_id, messageData);
            }

            setMessages(prev => {
                const withoutTemp = prev.slice(0, -2);
                return [...withoutTemp,
                { ...response, role: 'user', content: userMessage },
                { ...response, role: 'assistant' }
                ];
            });
        } catch (error) {
            setMessages(prev => {
                const withoutLoading = prev.slice(0, -1);
                return [...withoutLoading, {
                    content: 'Sorry, I encountered an error. Please try again.',
                    role: 'assistant',
                    timestamp: new Date().toISOString(),
                } as ChatMessage];
            });
            console.error('Error sending message:', chatApi.handleError(error));
        } finally {
            setIsLoading(false);
        }
    };

    const MarkdownComponents: Components = {
        code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;

            return isInline ? (
                <code className={className} {...props}>
                    {children}
                </code>
            ) : (
                <SyntaxHighlighter
                    style={oneDark as unknown as { [key: string]: CSSProperties }}
                    language={match[1]}
                    PreTag="div"
                >
                    {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
            );
        }
    };

    const getPlaceholderText = () => {
        if (!currentTopic) {
            return "Ask about any topic...";
        } else if (currentTopic.topic_id === UNCATEGORIZED_TOPIC_ID) {
            return "Ask about uncategorized entries...";
        } else {
            return `Ask about ${currentTopic.topic_name}...`;
        }
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-800">
            {/* Header */}
            <div className="shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold dark:text-white">
                    {!currentTopic ? 'All Topics' :
                        currentTopic.topic_id === UNCATEGORIZED_TOPIC_ID ? 'Uncategorized Entries' :
                            currentTopic.topic_name}
                </h2>
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
                        messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === 'user'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                        }`}
                                >
                                    {message.content === '...' ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="prose dark:prose-invert max-w-none">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={MarkdownComponents}
                                                >
                                                    {message.content}
                                                </ReactMarkdown>
                                            </div>
                                            <span className="text-xs opacity-70 mt-1 block">
                                                {chatApi.formatChatTimestamp(message.timestamp)}
                                            </span>
                                        </>
                                    )}
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
                                 dark:bg-gray-700 dark:text-white resize-none
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
        </div>
    );
} 