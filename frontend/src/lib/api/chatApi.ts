import { api, handleApiError, formatTimestamp } from './index';

export interface ChatMessage {
    message_id: number;
    thread_id: number;
    user_id: number;
    content: string;
    role: 'user' | 'assistant' | 'system';
    timestamp: string;
}

export interface ChatThread {
    thread_id: number;
    user_id: number;
    topic_id: number | null;
    title: string;
    created_at: string;
    last_message_at: string;
    status: 'active' | 'archived';
}

export interface ChatMessageCreate {
    content: string;
    role?: 'user' | 'assistant' | 'system';
}

export interface ChatThreadCreate {
    topic_id?: number;
    title?: string;
}

export interface ChatThreadUpdate {
    title?: string;
    status?: 'active' | 'archived';
}

export interface ChatMessageList {
    items: ChatMessage[];
    total: number;
}

interface GetThreadsParams {
    topic_id?: number | null;  // undefined = all topics, null = uncategorized, number = specific topic
    status?: 'active' | 'archived';
    skip?: number;
    limit?: number;
}

export const chatApi = {
    // Thread Management
    createThread: async (thread: ChatThreadCreate): Promise<ChatThread> => {
        const response = await api.post('/api/chat/threads', thread);
        return response.data;
    },

    getThreads: async (params: GetThreadsParams = {}): Promise<ChatThread[]> => {
        // If topic_id is undefined, omit it to get all topics
        // If topic_id is null, send it as "null" to get uncategorized
        // If topic_id is a number, send it as-is to get specific topic
        const queryParams = {
            ...params,
            topic_id: params.topic_id === undefined ? undefined : params.topic_id
        };
        const response = await api.get('/api/chat/threads', { params: queryParams });
        return response.data;
    },

    updateThread: async (threadId: number, updates: ChatThreadUpdate): Promise<ChatThread> => {
        const response = await api.patch(`/api/chat/threads/${threadId}`, updates);
        return response.data;
    },

    archiveThread: async (threadId: number): Promise<void> => {
        await api.patch(`/api/chat/threads/${threadId}/archive`);
    },

    // Message Management
    sendMessage: async (threadId: number, message: ChatMessageCreate): Promise<ChatMessage> => {
        const response = await api.post(`/api/chat/threads/${threadId}/messages`, message);
        return response.data;
    },

    sendMessageNewThread: async (message: ChatMessageCreate): Promise<ChatMessage> => {
        const response = await api.post('/api/chat/messages', message);
        return response.data;
    },

    getThreadMessages: async (threadId: number, params: {
        skip?: number;
        limit?: number;
    } = {}): Promise<ChatMessageList> => {
        const response = await api.get(`/api/chat/threads/${threadId}/messages`, { params });
        return response.data;
    },

    deleteMessage: async (threadId: number, messageId: number): Promise<void> => {
        await api.delete(`/api/chat/threads/${threadId}/messages/${messageId}`);
    },

    // Search
    searchThreads: async (params: {
        query: string;
        skip?: number;
        limit?: number;
    }): Promise<ChatThread[]> => {
        const response = await api.get('/api/chat/threads/search', { params });
        return response.data;
    },

    // Utility functions
    formatChatTimestamp: formatTimestamp,
    handleError: handleApiError
};

// Helper functions
export const isThreadActive = (thread: ChatThread): boolean =>
    thread.status === 'active';

export const getThreadTitle = (thread: ChatThread): string =>
    thread.title || 'New Chat';
