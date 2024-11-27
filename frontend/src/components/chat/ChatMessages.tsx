import { useRef, useEffect } from 'react';
import { ChatMessage, chatApi } from '../../lib/api/chatApi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';
import type { CSSProperties } from 'react';

interface ChatMessagesProps {
    messages: ChatMessage[];
    getPlaceholderText: () => string;
}

export default function ChatMessages({ messages, getPlaceholderText }: ChatMessagesProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                        <p>No messages yet.</p>
                        <p className="text-sm mt-2">{getPlaceholderText()}</p>
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
    );
} 