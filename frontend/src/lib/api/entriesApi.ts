import { api, handleApiError, formatTimestamp } from './index'

export interface Entry {
    entry_id: number;
    content: string;
    topic_id: number | null;
    user_id: number;
    creation_date: string;
}

export interface EntryCreate {
    content: string;
    topic_id?: number | null;
}

export interface EntryUpdate {
    content?: string;
    topic_id?: number | null;
}

export interface FacilitateOption {
    option_type: string;
    description: string;
    confidence_score: number;
    requirements: string[];
    estimated_impact: string;
}

export type TaskCategory = 'plan' | 'research' | 'perform';

export interface TaskCategorization {
    categories: TaskCategory[];
    confidence_score: number;
    rationale: string;
}

export interface TaskAnalysis {
    entry_id: number;
    content: string;
    categorization: TaskCategorization;
    complexity_score: number;
    priority_score: number;
    next_steps: string[];
}

export interface FacilitateAnalysisResponse {
    tasks: TaskAnalysis[];
    overall_summary: string;
    metadata: {
        analyzed_entries: number;
        analysis_timestamp: string;
        average_complexity: number;
        average_priority: number;
        category_distribution: {
            plan: number;
            research: number;
            perform: number;
        };
    };
}

export const entriesApi = {
    getEntries: async (topicId?: number): Promise<Entry[]> => {
        const response = await api.get('/api/entries', {
            params: topicId ? { topic_id: topicId } : undefined
        })
        return response.data
    },

    createEntry: async (entry: EntryCreate): Promise<Entry> => {
        const response = await api.post('/api/entries', entry)
        return response.data
    },

    updateEntry: async (entryId: number, entry: EntryUpdate): Promise<Entry> => {
        const response = await api.patch(`/api/entries/${entryId}`, entry)
        return response.data
    },

    deleteEntry: async (entryId: number): Promise<void> => {
        await api.delete(`/api/entries/${entryId}`)
    },

    moveEntryToTopic: async (entryId: number, newTopicId: number | null): Promise<Entry> => {
        const response = await api.patch(`/api/entries/${entryId}`, {
            topic_id: newTopicId
        })
        return response.data
    },

    analyzeFacilitateOptions: async (entryIds: number[]): Promise<FacilitateAnalysisResponse> => {
        const response = await api.post('/api/entries/analyze-facilitate', { entry_ids: entryIds });
        return response.data;
    },

    formatEntryTimestamp: formatTimestamp,
    handleError: handleApiError
} 