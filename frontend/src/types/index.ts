export interface Topic {
    topic_id: number;
    user_id: number;
    topic_name: string;
    creation_date: string;
}

export interface Entry {
    entry_id: number;
    user_id: number;
    topic_id: number | null;
    content: string;
    creation_date: string;
}

export interface ChatMessage {
    message_id: number;
    topic_id: number | null;
    user_id: number;
    message_text: string;
    message_type: 'user' | 'assistant' | 'system';
    timestamp: string;
} 