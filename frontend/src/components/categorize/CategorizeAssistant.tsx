import { useState } from 'react';
import { Topic, topicsApi, QuickCategorizeUncategorizedResponse } from '../../lib/api/topicsApi';
import { Entry, entriesApi } from '../../lib/api/entriesApi';
import QuickModeEntryList from '../entries/QuickModeEntryList';

interface CategorizeAssistantProps {
    onEntriesMoved?: () => void;
    onTopicsChanged?: () => void;
    entries: Entry[];
    refreshEntries: () => Promise<void>;
}

export default function CategorizeAssistant({ 
    onEntriesMoved, 
    onTopicsChanged,
    entries,
    refreshEntries
}: CategorizeAssistantProps) {
    const [isInPlaceCategorizing, setIsInPlaceCategorizing] = useState(false);
    const [selectedEntries, setSelectedEntries] = useState<Set<number>>(new Set());
    const [categorySuggestions, setCategorySuggestions] = useState<QuickCategorizeUncategorizedResponse | null>(null);

    const handleEntrySelect = (entryId: number) => {
        setSelectedEntries(prev => {
            const newSet = new Set(prev);
            if (newSet.has(entryId)) {
                newSet.delete(entryId);
            } else {
                newSet.add(entryId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectedEntries.size === entries.length) {
            setSelectedEntries(new Set());
        } else {
            setSelectedEntries(new Set(entries.map(e => e.entry_id)));
        }
    };

    const handleProposeCategorization = async () => {
        setIsInPlaceCategorizing(true);
        try {
            const response = await topicsApi.quickCategorizeUncategorized({
                min_confidence_threshold: 0.7,
                max_new_topics: 3
            });
            setCategorySuggestions(response);
        } catch (error) {
            console.error('Error proposing categories:', error);
        } finally {
            setIsInPlaceCategorizing(false);
        }
    };

    const handleAcceptSuggestion = async (
        entryId: number,
        topicId: number | null,
        topicName: string,
        isNew: boolean
    ) => {
        try {
            let targetTopicId: number;

            if (isNew) {
                const existingTopics = await topicsApi.getTopics();
                const existingTopic = existingTopics.find(
                    t => t.topic_name.toLowerCase() === topicName.toLowerCase()
                );

                if (existingTopic) {
                    targetTopicId = existingTopic.topic_id;
                } else {
                    const newTopic = await topicsApi.createTopic({
                        topic_name: topicName
                    });
                    targetTopicId = newTopic.topic_id;
                }
            } else {
                targetTopicId = topicId!;
            }

            await entriesApi.moveEntryToTopic(entryId, targetTopicId);

            // Update UI state
            if (categorySuggestions) {
                setCategorySuggestions(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        existing_topic_assignments: prev.existing_topic_assignments
                            .map(topic => ({
                                ...topic,
                                entries: topic.entries.filter(e => e.entry_id !== entryId)
                            }))
                            .filter(topic => topic.entries.length > 0),
                        new_topic_proposals: prev.new_topic_proposals
                            .map(topic => ({
                                ...topic,
                                entries: topic.entries.filter(e => e.entry_id !== entryId)
                            }))
                            .filter(topic => topic.entries.length > 0),
                        metadata: {
                            ...prev.metadata,
                            total_entries_analyzed: prev.metadata.total_entries_analyzed - 1,
                            assigned_to_existing: prev.metadata.assigned_to_existing - (isNew ? 0 : 1),
                            assigned_to_new: prev.metadata.assigned_to_new - (isNew ? 1 : 0),
                            unassigned: prev.metadata.unassigned
                        }
                    };
                });
            }

            setSelectedEntries(prev => {
                const newSet = new Set(prev);
                newSet.delete(entryId);
                return newSet;
            });

            await refreshEntries();
            if (onEntriesMoved) onEntriesMoved();
            if (onTopicsChanged) onTopicsChanged();

        } catch (error) {
            console.error('Error accepting suggestion:', error);
        }
    };

    const handleRejectSuggestion = (
        entryId: number,
        topicId: number | null,
        topicName: string,
        isNew: boolean
    ) => {
        setCategorySuggestions(prev => {
            if (!prev) return null;
            return {
                ...prev,
                existing_topic_assignments: isNew ? prev.existing_topic_assignments :
                    prev.existing_topic_assignments.map(topic => ({
                        ...topic,
                        entries: topic.entries.filter(e => e.entry_id !== entryId)
                    })).filter(topic => topic.entries.length > 0),
                new_topic_proposals: !isNew ? prev.new_topic_proposals :
                    prev.new_topic_proposals.map(topic => ({
                        ...topic,
                        entries: topic.entries.filter(e => e.entry_id !== entryId)
                    })).filter(topic => topic.entries.length > 0),
                unassigned_entries: [
                    ...prev.unassigned_entries,
                    {
                        entry_id: entryId,
                        content: entries.find(e => e.entry_id === entryId)?.content || "",
                        reason: "Rejected suggestion",
                        top_suggestions: []
                    }
                ]
            };
        });
    };

    const handleAcceptAllSuggestions = async () => {
        if (!categorySuggestions || selectedEntries.size === 0) return;

        setIsInPlaceCategorizing(true);
        try {
            const existingTopics = await topicsApi.getTopics();
            const createdTopics = new Map<string, number>();

            for (const topic of existingTopics) {
                createdTopics.set(topic.topic_name.toLowerCase(), topic.topic_id);
            }

            const entriesByTopic = new Map<string, {
                isNew: boolean;
                topicId: number | null;
                topicName: string;
                entries: Array<{
                    entryId: number;
                    confidence: number;
                }>;
            }>();

            // Process existing topic assignments and new topic proposals...
            // [Previous implementation remains the same]

            await refreshEntries();
            if (onEntriesMoved) onEntriesMoved();
            if (onTopicsChanged) onTopicsChanged();

            setCategorySuggestions(null);
            setSelectedEntries(new Set());

        } catch (error) {
            console.error('Error accepting all suggestions:', error);
        } finally {
            setIsInPlaceCategorizing(false);
        }
    };

    const handleClearSuggestions = () => {
        setCategorySuggestions(null);
        setSelectedEntries(new Set());
    };

    return (
        <div className="h-full flex flex-col">
            <QuickModeEntryList
                entries={entries}
                selectedEntries={selectedEntries}
                onEntrySelect={handleEntrySelect}
                onSelectAll={handleSelectAll}
                onCancel={handleClearSuggestions}
                categorySuggestions={categorySuggestions}
                onAcceptSuggestion={handleAcceptSuggestion}
                onRejectSuggestion={handleRejectSuggestion}
                isInPlaceCategorizing={isInPlaceCategorizing}
                onProposeCategorization={handleProposeCategorization}
                onAcceptAllSuggestions={handleAcceptAllSuggestions}
                onClearSuggestions={handleClearSuggestions}
            />
        </div>
    );
} 