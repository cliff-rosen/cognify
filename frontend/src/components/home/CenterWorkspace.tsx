import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Topic, UNCATEGORIZED_TOPIC_ID, isUncategorizedTopic } from '../../lib/api/topicsApi'
import { entriesApi, Entry } from '../../lib/api/entriesApi'
import { topicsApi, QuickCategorizeProposal } from '../../lib/api/topicsApi'
import { DragEvent } from 'react'
import AutoCategorizeWizard from './AutoCategorizeWizard';

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
        const [categorySuggestions, setCategorySuggestions] = useState<Record<number, QuickCategorizeProposal>>({});

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
                const selectedIds = Array.from(selectedEntries);
                const response = await topicsApi.getQuickCategorization(selectedIds);
                
                // Convert array to record for easier lookup
                const suggestionsMap = response.proposals.reduce((acc, proposal) => {
                    acc[proposal.entry_id] = proposal;
                    return acc;
                }, {} as Record<number, QuickCategorizeProposal>);
                
                setCategorySuggestions(suggestionsMap);
            } catch (error) {
                console.error('Error proposing categories:', error);
            } finally {
                setIsInPlaceCategorizing(false);
            }
        };

        const handleAcceptSuggestion = async (entryId: number, suggestion: CategorySuggestion) => {
            try {
                if (suggestion.is_new) {
                    // First create the new topic
                    const newTopic = await topicsApi.createTopic({
                        topic_name: suggestion.topic_name
                    });
                    // Then move the entry to it
                    await entriesApi.moveEntryToTopic(entryId, newTopic.topic_id);
                } else if (suggestion.topic_id) {
                    // Move entry to existing topic
                    await entriesApi.moveEntryToTopic(entryId, suggestion.topic_id);
                }

                // Remove the suggestion from the UI
                setCategorySuggestions(prev => {
                    const newSuggestions = { ...prev };
                    delete newSuggestions[entryId];
                    return newSuggestions;
                });

                // Remove from selected entries
                setSelectedEntries(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(entryId);
                    return newSet;
                });

                // Refresh entries
                await fetchEntries();

                // Trigger both callbacks to refresh the UI
                if (onEntriesMoved) {
                    onEntriesMoved();
                }
                if (onTopicsChanged) {
                    onTopicsChanged();  // This will refresh the left sidebar
                }

                // If no more suggestions and no more selected entries, exit quick mode
                const remainingSuggestions = Object.keys(categorySuggestions).length - 1; // -1 for the one we just removed
                if (remainingSuggestions === 0 && selectedEntries.size <= 1) { // <= 1 because we haven't removed the current one yet
                    setIsQuickMode(false);
                }

            } catch (error) {
                console.error('Error accepting suggestion:', error);
            }
        };

        const handleRejectSuggestion = (entryId: number, suggestion: CategorySuggestion) => {
            // Remove this suggestion from the entry's suggestions list
            setCategorySuggestions(prev => {
                const entry = prev[entryId];
                if (!entry) return prev;

                const newSuggestions = {
                    ...prev,
                    [entryId]: {
                        ...entry,
                        suggestions: entry.suggestions.filter(s => 
                            s.topic_name !== suggestion.topic_name || 
                            s.topic_id !== suggestion.topic_id
                        )
                    }
                };

                // If no suggestions left, remove the entry from suggestions
                if (newSuggestions[entryId].suggestions.length === 0) {
                    delete newSuggestions[entryId];
                }

                return newSuggestions;
            });
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
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
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
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedEntries.size === entries.length && entries.length > 0}
                                                onChange={handleSelectAll}
                                                className="h-4 w-4 text-blue-500 rounded border-gray-300 
                                                         focus:ring-blue-500 dark:border-gray-600 
                                                         dark:focus:ring-blue-600"
                                            />
                                            <span className="text-sm text-gray-600 dark:text-gray-300">
                                                Select All ({selectedEntries.size}/{entries.length})
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setIsQuickMode(false)}
                                            className="text-sm text-gray-500 hover:text-gray-700 
                                                     dark:text-gray-400 dark:hover:text-gray-200"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    {entries.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                            No uncategorized entries
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-2">
                                                {entries.map(entry => (
                                                    <div
                                                        key={entry.entry_id}
                                                        className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 
                                                                 rounded-lg shadow hover:shadow-md transition-shadow"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedEntries.has(entry.entry_id)}
                                                            onChange={() => handleEntrySelect(entry.entry_id)}
                                                            className="mt-1 h-4 w-4 text-blue-500 rounded border-gray-300 
                                                                     focus:ring-blue-500 dark:border-gray-600 
                                                                     dark:focus:ring-blue-600"
                                                        />
                                                        <div className="flex-1">
                                                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                                {entry.content}
                                                            </p>
                                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                                {new Date(entry.creation_date).toLocaleString()}
                                                            </span>
                                                            
                                                            {/* Show suggestions if available */}
                                                            {categorySuggestions[entry.entry_id] && (
                                                                <div className="mt-3 space-y-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                                                                    <div className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                                                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                                        </svg>
                                                                        <span>Suggested Categories</span>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {categorySuggestions[entry.entry_id].suggestions.map((suggestion, idx) => (
                                                                            <div 
                                                                                key={idx}
                                                                                className="group flex items-center gap-1 px-3 py-1.5 
                                                                                         bg-gray-50 dark:bg-gray-700/50 
                                                                                         border border-gray-200 dark:border-gray-600
                                                                                         rounded-md hover:shadow-sm transition-all"
                                                                            >
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-sm font-medium">
                                                                                        {suggestion.topic_name}
                                                                                        {suggestion.is_new && (
                                                                                            <span className="ml-1.5 text-xs text-green-500 bg-green-50 
                                                                                                   dark:bg-green-900/20 px-1.5 py-0.5 rounded">
                                                                                                new
                                                                                            </span>
                                                                                        )}
                                                                                    </span>
                                                                                    <div className="flex items-center gap-1 mt-0.5">
                                                                                        <div className="h-1 w-16 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                                                            <div 
                                                                                                className="h-full bg-blue-500 rounded-full"
                                                                                                style={{ width: `${suggestion.confidence_score * 100}%` }}
                                                                                            />
                                                                                        </div>
                                                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                                            {Math.round(suggestion.confidence_score * 100)}%
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                    <button
                                                                                        onClick={() => handleAcceptSuggestion(entry.entry_id, suggestion)}
                                                                                        className="p-1 text-green-600 hover:text-green-700 
                                                                                                 dark:text-green-500 dark:hover:text-green-400
                                                                                                 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                                                                        title="Accept"
                                                                                    >
                                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                                        </svg>
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleRejectSuggestion(entry.entry_id, suggestion)}
                                                                                        className="p-1 text-red-600 hover:text-red-700
                                                                                                 dark:text-red-500 dark:hover:text-red-400
                                                                                                 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                                                        title="Reject"
                                                                                    >
                                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                                        </svg>
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-4 border-t 
                                                          border-gray-200 dark:border-gray-700 mt-4 flex justify-end gap-3">
                                                <button
                                                    onClick={() => setIsQuickMode(false)}
                                                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 
                                                             dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 
                                                             rounded-md transition-colors duration-150"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleProposeCategorization}
                                                    disabled={selectedEntries.size === 0 || isInPlaceCategorizing}
                                                    className="px-4 py-2 bg-blue-500 text-white rounded-md 
                                                             hover:bg-blue-600 disabled:bg-gray-400 
                                                             disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    {isInPlaceCategorizing ? (
                                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" 
                                                                    stroke="currentColor" strokeWidth="4" fill="none"/>
                                                            <path className="opacity-75" fill="currentColor" 
                                                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                                        </svg>
                                                    ) : null}
                                                    Propose Categories for Selected Entries 
                                                    ({selectedEntries.size})
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {entries.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                            No uncategorized entries
                                        </div>
                                    ) : (
                                        entries.map(entry => (
                                            <div
                                                key={entry.entry_id}
                                                className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow group relative cursor-move"
                                                draggable="true"
                                                onDragStart={(e) => handleDragStart(e, entry)}
                                                onDragEnd={handleDragEnd}
                                            >
                                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                    {entry.content}
                                                </p>
                                                <div className="mt-2 flex justify-between items-center">
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                        {new Date(entry.creation_date).toLocaleString()}
                                                    </span>
                                                    <button
                                                        onClick={() => setEntryToDelete(entry)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                                        title="Delete entry"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
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
                                <div className="space-y-4">
                                    {entries.map(entry => (
                                        <div
                                            key={entry.entry_id}
                                            className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow group relative cursor-move"
                                            draggable="true"
                                            onDragStart={(e) => handleDragStart(e, entry)}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                {entry.content}
                                            </p>
                                            <div className="mt-2 flex justify-between items-center">
                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(entry.creation_date).toLocaleString()}
                                                </span>
                                                <button
                                                    onClick={() => setEntryToDelete(entry)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                                    title="Delete entry"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
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