import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { entriesApi, Entry } from '../lib/api/entriesApi'
import { AllTopicsTopic, Topic, UncategorizedTopic } from '../lib/api/topicsApi'
import { DragEvent } from 'react'
import EntryList from './entries/EntryList'
import { IconCategory, IconListCheck } from '@tabler/icons-react';
import CategorizeEntryList from './categorize/CategorizeEntryList';
import TaskEntryList from './tasks/TaskEntryList';
import { topicsApi, QuickCategorizeUncategorizedResponse, QuickCategorizeUncategorizedRequest } from '../lib/api/topicsApi';

interface CenterWorkspaceProps {
    selectedTopic: Topic | UncategorizedTopic | AllTopicsTopic;
    onEntriesMoved?: () => void;
    onTopicsChanged?: () => void;
}

export interface CenterWorkspaceHandle {
    refreshEntries: () => void;
}

const EmptyStateMessage = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="mb-6">
            <svg className="w-16 h-16 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
        </div>

        <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">
            No Entries Yet
        </h3>

        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
            Start by adding entries using the input box at the top of the screen. New entries will go to Uncategorized unless you choose a topic.
        </p>

        <div className="space-y-4 text-sm text-left text-gray-600 dark:text-gray-400 max-w-md">
            <h4 className="font-medium text-base text-gray-700 dark:text-gray-300">Getting Started:</h4>

            <div className="flex items-start space-x-3">
                <span className="font-medium text-blue-600 dark:text-blue-400">1.</span>
                <span>
                    <strong>Adding Entries:</strong> Type in the top box and click "Add Entry". Topics will be suggested, but you can ignore them to add to Uncategorized.
                </span>
            </div>

            <div className="flex items-start space-x-3">
                <span className="font-medium text-blue-600 dark:text-blue-400">2.</span>
                <span>
                    <strong>Creating Topics:</strong> Click the + button next to "Topics" in the left sidebar to create new topics.
                </span>
            </div>

            <div className="flex items-start space-x-3">
                <span className="font-medium text-blue-600 dark:text-blue-400">3.</span>
                <span>
                    <strong>Organizing:</strong> Drag and drop entries between topics, or use the AI assistant in Uncategorized view to organize multiple entries at once.
                </span>
            </div>
        </div>
    </div>
);

const CenterWorkspace = forwardRef<CenterWorkspaceHandle, CenterWorkspaceProps>(
    ({ selectedTopic, onEntriesMoved, onTopicsChanged }, ref) => {
        const [_selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
        const [entries, setEntries] = useState<Entry[]>([])
        const [isLoading, setIsLoading] = useState(false)
        const [error, setError] = useState<string | null>(null)
        const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null)
        const [isCategorizing, setIsCategorizing] = useState(false);
        const [categorySuggestions, setCategorySuggestions] = useState<QuickCategorizeUncategorizedResponse | null>(null);
        const [selectedEntries, setSelectedEntries] = useState<Set<number>>(new Set());
        const [isInPlaceCategorizing, setIsInPlaceCategorizing] = useState(false);
        const [isTaskHelpActive, setIsTaskHelpActive] = useState(false);
        const [isAnalyzingTasks, setIsAnalyzingTasks] = useState(false);

        const fetchEntries = async () => {
            console.log('CenterWorkspace fetchEntries', selectedTopic)
            try {
                setIsLoading(true)
                setError(null)

                const fetchedEntries = await entriesApi.getEntries(
                    selectedTopic ? selectedTopic.topic_id : undefined
                )
                setEntries(fetchedEntries)

                if (!selectedTopic) {
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
        }, [selectedTopic?.topic_id])

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

        const handleEditEntry = async (entryId: number, newContent: string) => {
            try {
                // Find the current entry to get its topic_id
                const currentEntry = entries.find(e => e.entry_id === entryId);
                if (!currentEntry) return;

                // Update entry while preserving its topic_id
                await entriesApi.updateEntry(entryId, {
                    content: newContent,
                    topic_id: currentEntry.topic_id  // Explicitly include the current topic_id
                });

                // Update local state
                setEntries(entries.map(e =>
                    e.entry_id === entryId
                        ? { ...e, content: newContent }  // Keep all other properties, just update content
                        : e
                ));
            } catch (err) {
                console.error('Error updating entry:', err);
                // TODO: Show error notification
            }
        };

        const handleEnterCategorizeMode = () => {
            setIsCategorizing(true);
            setSelectedEntries(new Set());
            setCategorySuggestions(null);
        };

        const handleExitCategorizeMode = () => {
            setIsCategorizing(false);
            setSelectedEntries(new Set());
            setCategorySuggestions(null);
        };

        const handleEntrySelect = (entryId: number) => {
            const newSelected = new Set(selectedEntries);
            if (newSelected.has(entryId)) {
                newSelected.delete(entryId);
            } else {
                newSelected.add(entryId);
            }
            setSelectedEntries(newSelected);
        };

        const handleSelectAll = () => {
            if (selectedEntries.size === entries.length) {
                setSelectedEntries(new Set());
            } else {
                setSelectedEntries(new Set(entries.map(e => e.entry_id)));
            }
        };

        const handleProposeCategorization = async () => {
            try {
                setIsInPlaceCategorizing(true);
                const request: QuickCategorizeUncategorizedRequest = {
                    entryIds: Array.from(selectedEntries)
                };
                const response = await topicsApi.quickCategorizeUncategorized(request);
                setCategorySuggestions(response);
            } catch (error) {
                console.error('Error proposing categories:', error);
                // TODO: Show error notification
            } finally {
                setIsInPlaceCategorizing(false);
            }
        };

        const handleAcceptSuggestion = async (entryId: number, topicId: number | null, topicName: string, isNew: boolean) => {
            try {
                // Implementation for accepting a suggestion
                // You'll need to implement this based on your API
                await entriesApi.updateEntry(entryId, { topic_id: topicId });
                await fetchEntries();
                if (onEntriesMoved) onEntriesMoved();
                if (onTopicsChanged) onTopicsChanged();
            } catch (error) {
                console.error('Error accepting suggestion:', error);
            }
        };

        const handleRejectSuggestion = (entryId: number, topicId: number | null, topicName: string, isNew: boolean) => {
            if (!categorySuggestions) return;

            // Create a new suggestions object without the rejected suggestion
            const newSuggestions = {
                ...categorySuggestions,
                existing_topic_assignments: isNew 
                    ? categorySuggestions.existing_topic_assignments 
                    : categorySuggestions.existing_topic_assignments.map(topic => 
                        topic.topic_id === topicId 
                            ? {
                                ...topic,
                                entries: topic.entries.filter(e => e.entry_id !== entryId)
                            }
                            : topic
                    ),
                new_topic_proposals: isNew
                    ? categorySuggestions.new_topic_proposals.map(topic =>
                        topic.suggested_name === topicName
                            ? {
                                ...topic,
                                entries: topic.entries.filter(e => e.entry_id !== entryId)
                            }
                            : topic
                    )
                    : categorySuggestions.new_topic_proposals
            };

            // Remove empty topics
            newSuggestions.existing_topic_assignments = newSuggestions.existing_topic_assignments
                .filter(topic => topic.entries.length > 0);
            newSuggestions.new_topic_proposals = newSuggestions.new_topic_proposals
                .filter(topic => topic.entries.length > 0);

            setCategorySuggestions(newSuggestions);
        };

        const handleAcceptAllSuggestions = async () => {
            try {
                if (!categorySuggestions) return;

                // Process existing topic assignments
                const existingAssignments = categorySuggestions.existing_topic_assignments
                    .flatMap(topic => 
                        topic.entries
                            .filter(entry => selectedEntries.has(entry.entry_id))
                            .map(entry => ({ 
                                entryId: entry.entry_id, 
                                topicId: topic.topic_id 
                            }))
                    );

                // Process new topic proposals
                const newTopicAssignments = categorySuggestions.new_topic_proposals
                    .flatMap(topic => 
                        topic.entries
                            .filter(entry => selectedEntries.has(entry.entry_id))
                            .map(entry => ({ 
                                entryId: entry.entry_id, 
                                topicName: topic.suggested_name 
                            }))
                    );

                // Create new topics and get their IDs
                const newTopicIds = await Promise.all(
                    [...new Set(newTopicAssignments.map(a => a.topicName))].map(async topicName => {
                        const newTopic = await topicsApi.createTopic({ topic_name: topicName });
                        return { name: topicName, id: newTopic.topic_id };
                    })
                );

                // Update all entries
                await Promise.all([
                    // Update entries for existing topics
                    ...existingAssignments.map(assignment =>
                        entriesApi.updateEntry(assignment.entryId, { topic_id: assignment.topicId })
                    ),
                    // Update entries for new topics
                    ...newTopicAssignments.map(assignment => {
                        const topicId = newTopicIds.find(t => t.name === assignment.topicName)?.id;
                        return entriesApi.updateEntry(assignment.entryId, { topic_id: topicId });
                    })
                ]);

                // Refresh the UI
                await fetchEntries();
                if (onEntriesMoved) onEntriesMoved();
                if (onTopicsChanged) onTopicsChanged();

                // Clear suggestions and selection
                setCategorySuggestions(null);
                setSelectedEntries(new Set());
            } catch (error) {
                console.error('Error accepting all suggestions:', error);
                // TODO: Show error notification
            }
        };

        const handleClearSuggestions = () => {
            setCategorySuggestions(null);
        };

        const handleExitTaskMode = () => {
            setIsTaskHelpActive(false);
            setSelectedEntries(new Set());
        };

        const handleAnalyzeTasks = async () => {
            setIsAnalyzingTasks(true);
            // TODO: Implement task analysis logic
            //temporily use setTimeout to simulate a delay
            setTimeout(() => {
                setIsAnalyzingTasks(false);
            }, 3000);
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
                {/* Topic Header */}
                <div className="flex-none px-12 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {selectedTopic.topic_name || 'All Entries'}
                    </h1>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={isCategorizing ? handleExitCategorizeMode : handleEnterCategorizeMode}
                            className={`inline-flex items-center px-3 py-1.5 text-sm font-medium 
                                ${isCategorizing 
                                    ? 'text-amber-900 dark:text-amber-100 bg-gradient-to-b from-amber-200 to-amber-300 dark:from-amber-700 dark:to-amber-800 border-amber-400 dark:border-amber-600 ring-amber-400/50 dark:ring-amber-500/50'
                                    : 'text-gray-800 dark:text-gray-100 bg-gradient-to-b from-amber-50 to-amber-100 dark:from-gray-700 dark:to-gray-800 border-amber-200 dark:border-gray-600 ring-amber-200/50 dark:ring-gray-500/50'
                                }
                                hover:from-amber-100 hover:to-amber-200 dark:hover:from-gray-600 dark:hover:to-gray-700
                                border shadow-sm hover:shadow
                                rounded-md
                                transition-all duration-150 ease-in-out
                                ring-1`}
                        >
                            <IconCategory className={`w-4 h-4 mr-1.5 ${isCategorizing ? 'text-amber-800 dark:text-amber-300' : 'text-amber-600 dark:text-amber-400'}`} />
                            {isCategorizing ? 'Exit Categorization Mode' : 'AI Categorization Help'}
                        </button>
                        <button
                            className={`inline-flex items-center px-3 py-1.5 text-sm font-medium 
                                ${isTaskHelpActive 
                                    ? 'text-gray-700 dark:text-gray-100 bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 border-gray-300 dark:border-gray-500 ring-gray-300/50 dark:ring-gray-400/50 shadow-inner'
                                    : 'text-gray-800 dark:text-gray-100 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-gray-700 dark:to-gray-800 border-slate-200 dark:border-gray-600 ring-slate-200/50 dark:ring-gray-500/50'
                                }
                                hover:from-slate-100 hover:to-slate-200 dark:hover:from-gray-600 dark:hover:to-gray-700
                                border shadow-sm hover:shadow
                                rounded-md
                                transition-all duration-150 ease-in-out
                                ring-1`}
                            onClick={() => setIsTaskHelpActive(!isTaskHelpActive)}
                        >
                            <IconListCheck className={`w-4 h-4 mr-1.5 ${isTaskHelpActive ? 'text-gray-600 dark:text-gray-300' : 'text-slate-600 dark:text-slate-400'}`} />
                            AI Task Help
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto px-12 py-4">
                    {entries.length === 0 ? (
                        <EmptyStateMessage />
                    ) : isTaskHelpActive ? (
                        <TaskEntryList
                            entries={entries}
                            selectedEntries={selectedEntries}
                            onEntrySelect={handleEntrySelect}
                            onSelectAll={handleSelectAll}
                            onCancel={handleExitTaskMode}
                            isLoading={isAnalyzingTasks}
                            onAnalyzeTasks={handleAnalyzeTasks}
                        />
                    ) : isCategorizing ? (
                        <CategorizeEntryList
                            entries={entries}
                            selectedEntries={selectedEntries}
                            onEntrySelect={handleEntrySelect}
                            onSelectAll={handleSelectAll}
                            onCancel={handleExitCategorizeMode}
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
                            onEdit={handleEditEntry}
                            emptyMessage="No entries in this topic"
                        />
                    )}
                </div>

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
            </div>
        )
    }
)

export default CenterWorkspace 