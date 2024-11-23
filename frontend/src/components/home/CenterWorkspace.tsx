import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Topic, UNCATEGORIZED_TOPIC_ID, isUncategorizedTopic, QuickCategorizeUncategorizedResponse, TopicAssignment, ExistingTopicAssignment, NewTopicProposal } from '../../lib/api/topicsApi'
import { entriesApi, Entry } from '../../lib/api/entriesApi'
import { topicsApi, QuickCategorizeProposal } from '../../lib/api/topicsApi'
import { DragEvent } from 'react'
import AutoCategorizeWizard from './AutoCategorizeWizard';
import QuickModeEntryList from '../entries/QuickModeEntryList';
import EntryList from '../entries/EntryList';

interface CenterWorkspaceProps {
    selectedTopicId: number | null;
    onEntriesMoved?: () => void;
    onTopicsChanged?: () => void;
}

export interface CenterWorkspaceHandle {
    refreshEntries: () => void;
}

interface CategorySuggestion {
    topic_id: number | null;
    topic_name: string;
    is_new: boolean;
    confidence_score: number;
}

const CenterWorkspace = forwardRef<CenterWorkspaceHandle, CenterWorkspaceProps>(
    ({ selectedTopicId, onEntriesMoved, onTopicsChanged }, ref) => {
        const [_selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
        const [entries, setEntries] = useState<Entry[]>([])
        const [isLoading, setIsLoading] = useState(false)
        const [error, setError] = useState<string | null>(null)
        const [activeTab, setActiveTab] = useState<'entries' | 'summary' | 'notes'>('entries')
        const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null)
        const [showAutoCategorizeModal, setShowAutoCategorizeModal] = useState(false)
        const [isInPlaceCategorizing, setIsInPlaceCategorizing] = useState(false)
        const [allTopics, setAllTopics] = useState<Topic[]>([])
        const [_isLoadingTopics, setIsLoadingTopics] = useState(false)
        const [selectedEntries, setSelectedEntries] = useState<Set<number>>(new Set())
        const [isQuickMode, setIsQuickMode] = useState(false)
        const [categorySuggestions, setCategorySuggestions] = useState<QuickCategorizeUncategorizedResponse | null>(null);


        const fetchEntries = async () => {
            try {
                setIsLoading(true)
                setError(null)

                const fetchedEntries = await entriesApi.getEntries(
                    selectedTopicId ? selectedTopicId : undefined
                )
                setEntries(fetchedEntries)

                if (!selectedTopicId) {
                    setSelectedTopic(null)
                }
            } catch (err) {
                console.error('Error fetching entries:', err)
                setError('Failed to load entries')
            } finally {
                setIsLoading(false)
            }
        }

        useEffect(() => {
            fetchEntries()
        }, [selectedTopicId])

        useImperativeHandle(ref, () => ({
            refreshEntries: fetchEntries
        }))

        const handleDeleteEntry = async (entry: Entry) => {
            try {
                await entriesApi.deleteEntry(entry.entry_id)
                setEntries(entries.filter(e => e.entry_id !== entry.entry_id))
                setEntryToDelete(null)

                // Trigger both callbacks to refresh the UI
                if (onEntriesMoved) {
                    onEntriesMoved();
                }
                if (onTopicsChanged) {
                    onTopicsChanged();  // This will refresh the left sidebar counts
                }
            } catch (err) {
                console.error('Error deleting entry:', err)
                // TODO: Show error notification
            }
        }

        const handleDragStart = (e: DragEvent<HTMLDivElement>, entry: Entry) => {
            e.dataTransfer.setData('application/json', JSON.stringify(entry))
            e.dataTransfer.effectAllowed = 'move'

            // Set custom drag image
            const dragImage = document.createElement('div')
            dragImage.className = 'p-2 bg-white dark:bg-gray-800 rounded shadow-lg'
            dragImage.textContent = entry.content.slice(0, 50) + (entry.content.length > 50 ? '...' : '')
            document.body.appendChild(dragImage)

            e.dataTransfer.setDragImage(dragImage, 0, 0)

            requestAnimationFrame(() => {
                document.body.removeChild(dragImage)
            })

            if (e.currentTarget.classList) {
                e.currentTarget.classList.add('opacity-50')
            }

            // Dispatch custom event with entry data
            const event = new CustomEvent('entryDragStart', {
                detail: entry
            })
            document.dispatchEvent(event)
        }

        const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
            // Remove visual effect
            if (e.currentTarget.classList) {
                e.currentTarget.classList.remove('opacity-50')
            }
        }

        const fetchAllTopics = async () => {
            setIsLoadingTopics(true)
            try {
                const topics = await topicsApi.getTopics()
                // Filter out the uncategorized topic
                setAllTopics(topics.filter(topic => !isUncategorizedTopic(topic)) as Topic[])
            } catch (error) {
                console.error('Error fetching topics:', error)
            } finally {
                setIsLoadingTopics(false)
            }
        }

        const handleWizardAutoCategorize = async () => {
            await fetchAllTopics()
            setShowAutoCategorizeModal(true)
        }

        const handleEntrySelect = (entryId: number) => {
            setSelectedEntries(prev => {
                const newSet = new Set(prev)
                if (newSet.has(entryId)) {
                    newSet.delete(entryId)
                } else {
                    newSet.add(entryId)
                }
                return newSet
            })
        }

        const handleSelectAll = () => {
            if (selectedEntries.size === entries.length) {
                setSelectedEntries(new Set())
            } else {
                setSelectedEntries(new Set(entries.map(e => e.entry_id)))
            }
        }

        const handleAssistantAutoCategorize = async () => {
            setIsQuickMode(true)
            setSelectedEntries(new Set())
        }

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
                    // Check if we already have a topic with this name (case insensitive)
                    const existingTopics = await topicsApi.getTopics();
                    const existingTopic = existingTopics.find(
                        t => t.topic_name.toLowerCase() === topicName.toLowerCase()
                    );

                    if (existingTopic) {
                        targetTopicId = existingTopic.topic_id;
                    } else {
                        // Create new topic if it doesn't exist
                        const newTopic = await topicsApi.createTopic({
                            topic_name: topicName
                        });
                        targetTopicId = newTopic.topic_id;
                    }
                } else {
                    targetTopicId = topicId!;
                }

                // Move entry to target topic
                await entriesApi.moveEntryToTopic(entryId, targetTopicId);

                // Update UI state
                if (categorySuggestions) {
                    setCategorySuggestions(prev => {
                        if (!prev) return null;

                        // Create new state removing the processed entry
                        const newState = {
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

                        return newState;
                    });
                }

                // Remove from selected entries
                setSelectedEntries(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(entryId);
                    return newSet;
                });

                // Refresh entries and UI
                await fetchEntries();
                if (onEntriesMoved) onEntriesMoved();
                if (onTopicsChanged) onTopicsChanged();

                // Exit quick mode if no more suggestions
                if (!categorySuggestions || (
                    categorySuggestions.existing_topic_assignments.length === 0 &&
                    categorySuggestions.new_topic_proposals.length === 0 &&
                    categorySuggestions.unassigned_entries.length === 0
                )) {
                    setIsQuickMode(false);
                }

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

                // Create new state removing the entry from the appropriate section
                return {
                    ...prev,
                    existing_topic_assignments: isNew ? prev.existing_topic_assignments :
                        prev.existing_topic_assignments.map(topic => {
                            if (topic.topic_id === topicId) {
                                return {
                                    ...topic,
                                    entries: topic.entries.filter(e => e.entry_id !== entryId)
                                };
                            }
                            return topic;
                        }).filter(topic => topic.entries.length > 0),
                    new_topic_proposals: !isNew ? prev.new_topic_proposals :
                        prev.new_topic_proposals.map(topic => {
                            if (topic.suggested_name === topicName) {
                                return {
                                    ...topic,
                                    entries: topic.entries.filter(e => e.entry_id !== entryId)
                                };
                            }
                            return topic;
                        }).filter(topic => topic.entries.length > 0),
                    // Move the entry to unassigned
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
                // First, get all existing topics to check for name matches
                const existingTopics = await topicsApi.getTopics();
                const createdTopics = new Map<string, number>();  // Map from topic name to topic ID

                // Pre-populate createdTopics with any existing topics that match new topic names
                for (const topic of existingTopics) {
                    createdTopics.set(topic.topic_name.toLowerCase(), topic.topic_id);
                }

                // Group entries by their best suggestion
                const entriesByTopic = new Map<string, {
                    isNew: boolean;
                    topicId: number | null;  // Added topicId field
                    topicName: string;
                    entries: Array<{
                        entryId: number;
                        confidence: number;
                    }>;
                }>();

                // Process existing topic assignments
                for (const topic of categorySuggestions.existing_topic_assignments) {
                    for (const entry of topic.entries) {
                        if (!selectedEntries.has(entry.entry_id)) continue;

                        const key = `existing-${topic.topic_id}`;
                        const group = entriesByTopic.get(key) || {
                            isNew: false,
                            topicId: topic.topic_id,  // Store the actual topic ID
                            topicName: topic.topic_name,
                            entries: []
                        };
                        group.entries.push({
                            entryId: entry.entry_id,
                            confidence: entry.confidence
                        });
                        entriesByTopic.set(key, group);
                    }
                }

                // Process new topic proposals
                for (const topic of categorySuggestions.new_topic_proposals) {
                    for (const entry of topic.entries) {
                        if (!selectedEntries.has(entry.entry_id)) continue;

                        const key = `new-${topic.suggested_name.toLowerCase()}`;
                        const group = entriesByTopic.get(key) || {
                            isNew: true,
                            topicId: null,
                            topicName: topic.suggested_name,
                            entries: []
                        };
                        group.entries.push({
                            entryId: entry.entry_id,
                            confidence: entry.confidence
                        });
                        entriesByTopic.set(key, group);
                    }
                }

                // Process each topic group
                for (const [_, group] of entriesByTopic) {
                    let targetTopicId: number;

                    if (group.isNew) {
                        // Check if we already have this topic (case insensitive)
                        const existingId = createdTopics.get(group.topicName.toLowerCase());
                        if (existingId) {
                            targetTopicId = existingId;
                        } else {
                            // Create new topic
                            const newTopic = await topicsApi.createTopic({
                                topic_name: group.topicName
                            });
                            targetTopicId = newTopic.topic_id;
                            createdTopics.set(group.topicName.toLowerCase(), newTopic.topic_id);
                        }
                    } else {
                        // Use the stored topic ID directly
                        targetTopicId = group.topicId!;
                    }

                    // Move all entries to the topic
                    for (const entry of group.entries) {
                        await entriesApi.moveEntryToTopic(entry.entryId, targetTopicId);
                    }
                }

                // Refresh UI
                await fetchEntries();
                if (onEntriesMoved) onEntriesMoved();
                if (onTopicsChanged) onTopicsChanged();

                // Clear suggestions and exit quick mode
                setCategorySuggestions(null);
                setIsQuickMode(false);
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

        if (isLoading) {
            return (
                <div className="h-full w-full flex items-center justify-center">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Loading...</span>
                    </div>
                </div>
            )
        }

        if (error) {
            return (
                <div className="h-full w-full flex items-center justify-center">
                    <div className="flex items-center gap-2 text-red-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                    </div>
                </div>
            )
        }

        return (
            <div className="h-full flex flex-col">
                {selectedTopicId === UNCATEGORIZED_TOPIC_ID ? (
                    <>
                        {/* Uncategorized View */}
                        <div className="flex-none p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex flex-col">
                                <div className="flex justify-between items-center mb-3">
                                    <h2 className="text-2xl font-bold dark:text-white">Uncategorized Entries</h2>
                                    <div className="flex items-center gap-6">
                                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            Categorization Assistant
                                        </h3>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleAssistantAutoCategorize}
                                                disabled={isInPlaceCategorizing}
                                                className="px-3 py-1.5 text-sm bg-transparent border border-blue-500 text-blue-500 
                                                         hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md
                                                         transition-colors duration-150 disabled:opacity-50
                                                         flex items-center gap-2"
                                            >
                                                <span>Quick 'n Easy</span>
                                                {isInPlaceCategorizing && (
                                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                )}
                                            </button>
                                            <button
                                                onClick={handleWizardAutoCategorize}
                                                className="px-3 py-1.5 text-sm bg-transparent border border-amber-500 text-amber-500
                                                         hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-md
                                                         transition-colors duration-150"
                                            >
                                                Nuclear
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Entries List */}
                        <div className="p-4 flex-1 overflow-y-auto">
                            {isQuickMode ? (
                                <QuickModeEntryList
                                    entries={entries}
                                    selectedEntries={selectedEntries}
                                    onEntrySelect={handleEntrySelect}
                                    onSelectAll={handleSelectAll}
                                    onCancel={() => setIsQuickMode(false)}
                                    categorySuggestions={categorySuggestions}
                                    onAcceptSuggestion={handleAcceptSuggestion}
                                    onRejectSuggestion={handleRejectSuggestion}
                                    isInPlaceCategorizing={isInPlaceCategorizing}
                                    onProposeCategorization={handleProposeCategorization}
                                    onAcceptAllSuggestions={handleAcceptAllSuggestions}
                                    onClearSuggestions={handleClearSuggestions}
                                />
                            ) : (
                                <EntryList
                                    entries={entries}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                    onDelete={(entry: Entry) => setEntryToDelete(entry)}
                                    emptyMessage="No uncategorized entries"
                                />
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        {/* Topic View */}
                        <div className="flex-none border-b border-gray-200 dark:border-gray-700">
                            <div className="px-6">
                                <div className="flex space-x-8">
                                    <button
                                        onClick={() => setActiveTab('entries')}
                                        className={`py-4 px-2 relative ${activeTab === 'entries'
                                            ? 'text-blue-500 dark:text-blue-400'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        <span>Entries</span>
                                        {activeTab === 'entries' && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 dark:bg-blue-400"></div>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('summary')}
                                        className={`py-4 px-2 relative ${activeTab === 'summary'
                                            ? 'text-blue-500 dark:text-blue-400'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        <span>Summary</span>
                                        {activeTab === 'summary' && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 dark:bg-blue-400"></div>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('notes')}
                                        className={`py-4 px-2 relative ${activeTab === 'notes'
                                            ? 'text-blue-500 dark:text-blue-400'
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        <span>Notes</span>
                                        {activeTab === 'notes' && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 dark:bg-blue-400"></div>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="p-4 flex-1 overflow-y-auto">
                            {activeTab === 'entries' && (
                                <EntryList
                                    entries={entries}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                    onDelete={(entry: Entry) => setEntryToDelete(entry)}
                                    emptyMessage="No entries in this topic"
                                />
                            )}
                            {activeTab === 'summary' && (
                                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                                    <p className="text-gray-500 dark:text-gray-400">
                                        Summary view coming soon...
                                    </p>
                                </div>
                            )}
                            {activeTab === 'notes' && (
                                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                                    <p className="text-gray-500 dark:text-gray-400">
                                        Notes view coming soon...
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Delete Confirmation Modal */}
                {entryToDelete && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
                            <h3 className="text-lg font-semibold mb-4 dark:text-white">
                                Delete Entry
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                Are you sure you want to delete this entry? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setEntryToDelete(null)}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteEntry(entryToDelete)}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Auto-categorize Wizard */}
                {showAutoCategorizeModal && (
                    <AutoCategorizeWizard
                        topics={allTopics}
                        onClose={() => setShowAutoCategorizeModal(false)}
                        onComplete={async () => {
                            setShowAutoCategorizeModal(false);
                            await fetchEntries(); // Refresh entries
                            if (onTopicsChanged) {
                                onTopicsChanged(); // Trigger topics refresh
                            }
                            if (onEntriesMoved) {
                                onEntriesMoved(); // Keep existing callback
                            }
                        }}
                    />
                )}
            </div>
        )
    }
)

export default CenterWorkspace 