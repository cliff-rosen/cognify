import { useState, useEffect } from 'react';
import { chatApi, ChatMessage, ChatThread, ALL_TOPICS_CHAT_TOPIC_ID } from '../../lib/api/chatApi';
import {
    UNCATEGORIZED_TOPIC_ID,
    Topic,
    UncategorizedTopic,
    AllTopicsTopic
} from '../../lib/api/topicsApi';
import ChatControls from './ChatControls';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';

interface ChatAreaProps {
    currentTopic: Topic | UncategorizedTopic | AllTopicsTopic | null;
}

export default function ChatArea({ currentTopic }: ChatAreaProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentThread, setCurrentThread] = useState<ChatThread | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);

    useEffect(() => {
        const fetchChatThreads = async () => {
            setIsLoading(true);
            try {
                let topicId: number | null;

                if (!currentTopic) {
                    topicId = ALL_TOPICS_CHAT_TOPIC_ID;  // -1 for all topics
                } else if (currentTopic.topic_id === UNCATEGORIZED_TOPIC_ID) {
                    topicId = UNCATEGORIZED_TOPIC_ID;  // 0 for uncategorized
                } else {
                    topicId = currentTopic.topic_id;  // specific topic id
                }

                const threads = await chatApi.getThreads({
                    topic_id: topicId,
                    status: 'active'
                });
                setChatThreads(threads);

                // If threads exist, automatically select and load the most recent one
                if (threads.length > 0) {
                    const mostRecentThread = threads[0];
                    handleThreadSelect(mostRecentThread);
                } else {
                    // Clear current thread and messages if no threads exist
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
    }, [currentTopic?.topic_id]);

    const handleSubmit = async (message: string) => {
        if (!message.trim() || isLoading) return;

        setIsLoading(true);
        const userMessage = message;

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
                const topic_id = !currentTopic ? ALL_TOPICS_CHAT_TOPIC_ID :
                    currentTopic.topic_id === UNCATEGORIZED_TOPIC_ID ? null :
                        currentTopic.topic_id;

                const newThread = await chatApi.createThread({
                    title: userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : ''),
                    topic_id: topic_id
                });

                setChatThreads(prev => [newThread, ...prev]);
                setCurrentThread(newThread);
                response = await chatApi.sendMessage(newThread.thread_id, messageData);
            } else {
                response = await chatApi.sendMessage(currentThread.thread_id, messageData);

                const updatedThread = {
                    ...currentThread,
                    last_message_at: response.timestamp
                };
                setChatThreads(prev => prev.map(t =>
                    t.thread_id === currentThread.thread_id ? updatedThread : t
                ));
                setCurrentThread(updatedThread);
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

    const handleThreadSelect = async (thread: ChatThread) => {
        setCurrentThread(thread);
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
    };

    const handleArchiveThread = async () => {
        if (!currentThread) return;

        try {
            await chatApi.archiveThread(currentThread.thread_id);
            setChatThreads(prev => prev.filter(t => t.thread_id !== currentThread.thread_id));
            setCurrentThread(null);
            setMessages([]);
        } catch (error) {
            console.error('Error archiving thread:', error);
        }
    };

    const handleRenameThread = async (threadId: number, newTitle: string) => {
        if (!newTitle.trim()) return;

        try {
            const updatedThread = await chatApi.updateThread(threadId, {
                title: newTitle.trim()
            });

            setChatThreads(prev => prev.map(t =>
                t.thread_id === updatedThread.thread_id ? updatedThread : t
            ));
            setCurrentThread(updatedThread);
        } catch (error) {
            console.error('Error renaming thread:', error);
        }
    };

    const getPlaceholderText = () => {
        if (currentTopic?.topic_id === ALL_TOPICS_CHAT_TOPIC_ID) {
            return "Ask about any topic...";
        } else if (currentTopic?.topic_id === UNCATEGORIZED_TOPIC_ID) {
            return "Ask about uncategorized entries...";
        } else {
            return `Ask about ${currentTopic?.topic_name}...`;
        }
    };

    return (
        <>
            <ChatControls
                currentThread={currentThread}
                chatThreads={chatThreads}
                onNewChat={handleNewChat}
                onArchiveThread={handleArchiveThread}
                onThreadSelect={handleThreadSelect}
                onThreadRename={handleRenameThread}
            />

            <ChatMessages
                messages={messages}
                getPlaceholderText={getPlaceholderText}
            />

            <ChatInput
                onSubmit={handleSubmit}
                isLoading={isLoading}
                getPlaceholderText={getPlaceholderText}
            />
        </>
    );
} 