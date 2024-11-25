import { useState, useEffect, useRef } from 'react';
import { chatApi, ChatMessage, ChatThread, ALL_TOPICS_CHAT_TOPIC_ID } from '../../lib/api/chatApi';
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
    currentTopic: number | Topic | UncategorizedTopic | null;
}

interface ThreadDropdownItemProps {
    thread: ChatThread;
    isSelected: boolean;
    onClick: () => void;
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
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);

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

        // Add user message to UI immediately
        const tempUserMessage: Partial<ChatMessage> = {
            content: userMessage,
            role: 'user',
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempUserMessage as ChatMessage]);

        // Add loading indicator
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
                role: 'user' as const
            };

            if (!currentThread) {
                const topic_id = !currentTopic ? ALL_TOPICS_CHAT_TOPIC_ID :  // -1 for all topics view
                    currentTopic.topic_id === UNCATEGORIZED_TOPIC_ID ? null :  // null for uncategorized
                        currentTopic.topic_id;  // specific topic id

                const newThread = await chatApi.createThread({
                    title: userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : ''),
                    topic_id: topic_id
                });

                // Add thread to list and select it
                setChatThreads(prev => [newThread, ...prev]);
                setCurrentThread(newThread);

                // Send message in new thread
                response = await chatApi.sendMessage(newThread.thread_id, messageData);
            } else {
                // Send message in existing thread
                response = await chatApi.sendMessage(currentThread.thread_id, messageData);

                // Update thread in list with new last_message_at
                const updatedThread = {
                    ...currentThread,
                    last_message_at: response.timestamp
                };
                setChatThreads(prev => prev.map(t =>
                    t.thread_id === currentThread.thread_id ? updatedThread : t
                ));
                setCurrentThread(updatedThread);
            }

            // Update messages, removing temporary ones and adding final ones
            setMessages(prev => {
                const withoutTemp = prev.slice(0, -2);
                return [...withoutTemp,
                { ...response, role: 'user', content: userMessage },
                { ...response, role: 'assistant' }
                ];
            });

        } catch (error) {
            // Handle error by showing error message
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

                // If threads exist and no thread is currently selected, select the most recent one
                if (threads.length > 0 && !currentThread) {
                    const mostRecentThread = threads[0]; // Assuming threads are sorted by last_message_at
                    handleThreadSelect(mostRecentThread);
                } else if (threads.length === 0) {
                    // Clear current thread if no threads exist for this topic
                    setCurrentThread(null);
                    setMessages([]);
                }
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

    const handleArchiveThread = async () => {
        if (!currentThread) return;

        try {
            await chatApi.archiveThread(currentThread.thread_id);
            // Remove thread from list and clear selection
            setChatThreads(prev => prev.filter(t => t.thread_id !== currentThread.thread_id));
            setCurrentThread(null);
            setMessages([]);
        } catch (error) {
            console.error('Error archiving thread:', error);
        }
    };

    const handleNewChat = () => {
        const topic_id = !currentTopic ? ALL_TOPICS_CHAT_TOPIC_ID :  // -1 for all topics view
            currentTopic.topic_id === UNCATEGORIZED_TOPIC_ID ? null :  // null for uncategorized
                currentTopic.topic_id;  // specific topic id

        setCurrentThread(null);
        setMessages([]);
    };

    const handleRenameThread = async () => {
        if (!currentThread || !editTitle.trim()) return;

        try {
            const updatedThread = await chatApi.updateThread(currentThread.thread_id, {
                title: editTitle.trim()
            });

            // Update the thread in the list
            setChatThreads(prev => prev.map(t =>
                t.thread_id === updatedThread.thread_id ? updatedThread : t
            ));

            // Update current thread
            setCurrentThread(updatedThread);
            setIsEditing(false);
        } catch (error) {
            console.error('Error renaming thread:', error);
        }
    };

    useEffect(() => {
        if (isEditing && editInputRef.current) {
            editInputRef.current.focus();
        }
    }, [isEditing]);

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-800">
            {/* Header */}
            <div className="shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col gap-3">
                    <h2 className="text-lg font-semibold dark:text-white">
                        {!currentTopic ? 'All Topics' :
                            currentTopic.topic_id === UNCATEGORIZED_TOPIC_ID ? 'Uncategorized Entries' :
                                currentTopic.topic_name}
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={handleNewChat}
                            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg 
                                     bg-blue-500 text-white hover:bg-blue-600 
                                     transition-colors duration-200"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Chat
                        </button>
                        <button
                            onClick={handleArchiveThread}
                            disabled={!currentThread}
                            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg 
                                      transition-colors duration-200
                                      ${!currentThread
                                    ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-14 0l2-2h10l2 2" />
                            </svg>
                            Archive
                        </button>
                    </div>
                </div>
            </div>

            {/* Thread Dropdown */}
            <div className="relative shrink-0" ref={dropdownRef}>
                <div className="w-full flex items-center justify-between gap-2 px-4 py-3 
                        border-b border-gray-200 dark:border-gray-700">
                    {isEditing && currentThread ? (
                        <form
                            className="flex-1 flex items-center gap-2"
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleRenameThread();
                            }}
                        >
                            <input
                                ref={editInputRef}
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="flex-1 bg-white dark:bg-gray-700 text-sm text-gray-700 
                                         dark:text-gray-300 rounded px-2 py-1 border border-gray-300 
                                         dark:border-gray-600 focus:outline-none focus:ring-2 
                                         focus:ring-blue-500"
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        setIsEditing(false);
                                    }
                                }}
                            />
                            <button
                                type="submit"
                                className="text-blue-500 hover:text-blue-600 p-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="text-gray-500 hover:text-gray-600 p-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </form>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex-1 flex items-center justify-between gap-2 
                                         hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2 py-1"
                            >
                                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                    {currentThread ? currentThread.title : 'Select Chat'}
                                </span>
                                <svg className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 
                                              ${isDropdownOpen ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {currentThread && (
                                <button
                                    onClick={() => {
                                        setEditTitle(currentThread.title);
                                        setIsEditing(true);
                                    }}
                                    className="p-1 text-gray-500 hover:text-gray-600 dark:text-gray-400 
                                             dark:hover:text-gray-300"
                                    title="Rename chat"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                            )}
                        </>
                    )}
                </div>

                {isDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-0 bg-white dark:bg-gray-800 
                                  border-b border-gray-200 dark:border-gray-700 
                                  shadow-lg z-10 max-h-[300px] overflow-y-auto">
                        {chatThreads.map(thread => (
                            <div
                                key={thread.thread_id}
                                onClick={() => handleThreadSelect(thread)}
                                className={`p-3 cursor-pointer border-l-2 
                                          hover:bg-gray-50 dark:hover:bg-gray-700
                                          ${currentThread?.thread_id === thread.thread_id
                                        ? 'border-blue-500 bg-gray-50 dark:bg-gray-700'
                                        : 'border-transparent'}`}
                            >
                                <div className="font-medium text-gray-700 dark:text-gray-300 truncate">
                                    {thread.title}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {chatApi.formatChatTimestamp(thread.last_message_at)}
                                </div>
                            </div>
                        ))}
                        {chatThreads.length === 0 && (
                            <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                                No chat threads yet
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Thread List */}
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
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300'
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
        </div>
    );
} 