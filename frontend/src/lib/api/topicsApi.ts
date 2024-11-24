import { api } from '../api'

export interface Topic {
    topic_id: number;
    topic_name: string;
    entry_count?: number;
    user_id: number;
    creation_date: string;
}

export interface TopicCreate {
    topic_name: string;
}

export interface TopicUpdate {
    topic_name: string;
}

export interface TopicSearchResult extends Topic {
    score: number;
    is_ai_suggested?: boolean;
    is_new_topic?: boolean;
}

export interface TopicSuggestion {
    topic_id: number | null;
    topic_name: string;
    confidence: number;
}

export interface TopicAssignment {
    entry_id: number;
    content: string;
    confidence: number;
    alternative_topics: TopicSuggestion[];
}

export interface ExistingTopicAssignment {
    topic_id: number;
    topic_name: string;
    entries: TopicAssignment[];
}

export interface NewTopicProposal {
    suggested_name: string;
    confidence: number;
    rationale: string;
    similar_existing_topics: TopicSuggestion[];
    entries: TopicAssignment[];
}

export interface UnassignedEntry {
    entry_id: number;
    content: string;
    reason: string;
    top_suggestions: TopicSuggestion[];
}

export interface CategoryMetadata {
    total_entries_analyzed: number;
    assigned_to_existing: number;
    assigned_to_new: number;
    unassigned: number;
    average_confidence: number;
    processing_time_ms: number;
}

export interface QuickCategorizeUncategorizedRequest {
    min_confidence_threshold?: number;
    max_new_topics?: number;
    instructions?: string;
}

export interface QuickCategorizeUncategorizedResponse {
    existing_topic_assignments: ExistingTopicAssignment[];
    new_topic_proposals: NewTopicProposal[];
    unassigned_entries: UnassignedEntry[];
    metadata: CategoryMetadata;
}

export const UNCATEGORIZED_TOPIC_ID = -1;

export interface UncategorizedTopic extends Omit<Topic, 'user_id' | 'creation_date'> {
    topic_id: typeof UNCATEGORIZED_TOPIC_ID;
    topic_name: 'Uncategorized';
    is_uncategorized: true;
    entry_count?: number;
}

// Helper function to identify uncategorized topic
export const isUncategorizedTopic = (topic: Topic | UncategorizedTopic): topic is UncategorizedTopic => {
    return topic.topic_id === UNCATEGORIZED_TOPIC_ID;
}

export interface ProposedEntry {
    entry_id: number;
    content: string;
    current_topic_id: number | null;
    proposed_topic_id: number | null;
    creation_date: string;
    confidence_score: number;
}

export interface ProposedTopic {
    topic_id: number | null;
    topic_name: string;
    is_new: boolean;
    entries: ProposedEntry[];
    confidence_score: number;
}

export interface AutoCategorizeRequest {
    instructions?: string;
    topics_to_keep?: number[];
}

export interface AutoCategorizeResponse {
    proposed_topics: ProposedTopic[];
    uncategorized_entries: ProposedEntry[];
    instructions_used?: string;
}

export interface ApplyCategorizeRequest {
    proposed_topics: ProposedTopic[];
    uncategorized_entries: ProposedEntry[];
}

export interface QuickCategorizeProposal {
    entry_id: number;
    content: string;
    suggestions: {
        topic_id: number | null;  // null for new topics
        topic_name: string;
        is_new: boolean;
        confidence_score: number;
    }[];
}

export interface QuickCategorizeResponse {
    proposals: QuickCategorizeProposal[];
}

export const topicsApi = {

    createTopic: async (topic: TopicCreate): Promise<Topic> => {
        const response = await api.post('/api/topics', topic)
        return response.data
    },

    getTopic: async (topicId: number): Promise<Topic> => {
        const response = await api.get(`/api/topics/${topicId}`)
        return response.data
    },

    getTopics: async (): Promise<(Topic | UncategorizedTopic)[]> => {
        const response = await api.get('/api/topics')
        return response.data
    },

    getTopicEntryCounts: async (): Promise<Record<number, number>> => {
        const response = await api.get('/api/topics/entry-counts');
        return response.data;
    },


    updateTopic: async (topicId: number, topic: TopicUpdate): Promise<Topic> => {
        const response = await api.patch(`/api/topics/${topicId}`, topic)
        return response.data
    },


    deleteTopic: async (topicId: number): Promise<void> => {
        await api.delete(`/api/topics/${topicId}`)
    },

    // AI Enabled Methods

    getTopicSuggestions: async (text: string): Promise<TopicSearchResult[]> => {
        const response = await api.get(`/api/topics/suggestions`, {
            params: { text }
        })
        return response.data
    },

    analyzeCategorization: async (request?: AutoCategorizeRequest): Promise<AutoCategorizeResponse> => {
        const response = await api.post('/api/topics/analyze-categorization', request || {})
        return response.data
    },

    applyCategorization: async (changes: ApplyCategorizeRequest): Promise<void> => {
        await api.post('/api/topics/apply-categorization', changes)
    },

    quickCategorizeUncategorized: async (
        request?: QuickCategorizeUncategorizedRequest
    ): Promise<QuickCategorizeUncategorizedResponse> => {
        const response = await api.post('/api/topics/quick-categorize-uncategorized', request || {});
        return response.data;
    },

    getQuickCategorization: async (entryIds: number[]): Promise<QuickCategorizeResponse> => {
        const response = await api.post('/api/topics/quick-categorize', { entry_ids: entryIds });
        return response.data;
    },

} 