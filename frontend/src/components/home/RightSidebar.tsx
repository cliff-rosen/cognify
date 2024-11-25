import { useState, useEffect, useRef } from 'react';
import { chatApi, ChatMessage, ChatThread } from '../../lib/api/chatApi';
import { 
    UNCATEGORIZED_TOPIC_ID, 
    ALL_TOPICS_TOPIC_ID,
    Topic, 
    UncategorizedTopic 
} from '../../lib/api/topicsApi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';
import type { CSSProperties } from 'react';

interface RightSidebarProps {
    currentTopic: Topic | UncategorizedTopic | null;
}

interface ThreadDropdownItemProps {
    thread: ChatThread;
    isSelected: boolean;
    onClick: () => void;
}

function ThreadDropdownItem({ thread, isSelected, onClick }: ThreadDropdownItemProps) {
    return (
        <div
            onClick={onClick}
            className={`p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 
                       ${isSelected ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
        >
            <div className="font-medium dark:text-white truncate">{thread.title}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
                {chatApi.formatChatTimestamp(thread.last_message_at)}
            </div>
        </div>
    );
}

export default function RightSidebar({ currentTopic }: RightSidebarProps) {
    console.log('Current Topic in RightSidebar:', currentTopic);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentThread, setCurrentThread] = useState<ChatThread | null>(null);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Add click outside handler for dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                topic_id: !currentTopic ? ALL_TOPICS_TOPIC_ID : currentTopic.topic_id
            };

            if (!currentThread) {
                response = await chatApi.sendMessageNewThread(messageData);
                const newThread: ChatThread = {
                    thread_id: response.thread_id,
                    user_id: response.user_id,
                    title: 'New Chat',
                    created_at: response.timestamp,
                    last_message_at: response.timestamp,
                    status: 'active',
                    topic_id: !currentTopic ? ALL_TOPICS_TOPIC_ID : currentTopic.topic_id
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

    useEffect(() => {
        const fetchChatThreads = async () => {
            setIsLoading(true);
            try {
                let topicId: number | null;
                
                if (!currentTopic) {
                    topicId = ALL_TOPICS_TOPIC_ID;  // 0 for all topics
                } else if (currentTopic.topic_id === UNCATEGORIZED_TOPIC_ID) {
                    topicId = UNCATEGORIZED_TOPIC_ID;  // -1 for uncategorized
                } else {
                    topicId = currentTopic.topic_id;  // specific topic id
                }

                const threads = await chatApi.getThreads({
                    topic_id: topicId,
                    status: 'active'
                });
                setChatThreads(threads);
            } catch (error) {
                console.error('Error fetching chat threads:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchChatThreads();
    }, [currentTopic]);

    const handleThreadSelect = async (thread: ChatThread) => {
        setCurrentThread(thread);
        setIsDropdownOpen(false);
        setIsLoading(true);
        try {
            const response = await chatApi.getThreadMessages(thread.thread_id);
            setMessages(response.items);
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewChat = () => {
        setCurrentThread(null);
        setMessages([]);
        setIsDropdownOpen(false);
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-800">
            {/* Header with Dropdown */}
            <div className="shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold dark:text-white">
                        {!currentTopic ? 'All Topics' :
                            currentTopic.topic_id === UNCATEGORIZED_TOPIC_ID ? 'Uncategorized Entries' :
                                currentTopic.topic_name}
                    </h2>
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 
                                     dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <span className="text-sm">
                                {currentThread ? currentThread.title : 'Select Chat'}
                            </span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg 
                                          border border-gray-200 dark:border-gray-700 z-10">
                                <div className="p-2">
                                    <button
                                        onClick={() => {
                                            handleNewChat();
                                            setIsDropdownOpen(false);
                                        }}
                                        className="w-full p-2 text-left text-blue-500 hover:bg-gray-100 
                                                 dark:hover:bg-gray-700 rounded"
                                    >
                                        + New Chat
                                    </button>
                                </div>
                                <div className="max-h-60 overflow-y-auto border-t border-gray-200 dark:border-gray-700">
                                    {chatThreads.map(thread => (
                                        <ThreadDropdownItem
                                            key={thread.thread_id}
                                            thread={thread}
                                            isSelected={currentThread?.thread_id === thread.thread_id}
                                            onClick={() => {
                                                handleThreadSelect(thread);
                                                setIsDropdownOpen(false);
                                            }}
                                        />
                                    ))}
                                    {chatThreads.length === 0 && !isLoading && (
                                        <div className="p-2 text-center text-gray-500 dark:text-gray-400">
                                            No chat threads yet
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
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