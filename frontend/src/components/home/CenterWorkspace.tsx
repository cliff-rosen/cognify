import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { entriesApi, Entry } from '../../lib/api/entriesApi'
import { Topic } from '../../lib/api/topicsApi'
import { DragEvent } from 'react'
import EntryList from '../entries/EntryList'

interface CenterWorkspaceProps {
    selectedTopicId: number | null;
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
    ({ selectedTopicId, onEntriesMoved, onTopicsChanged }, ref) => {
        const [_selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
        const [entries, setEntries] = useState<Entry[]>([])
        const [isLoading, setIsLoading] = useState(false)
        const [error, setError] = useState<string | null>(null)
        const [activeTab, setActiveTab] = useState<'entries' | 'summary' | 'notes'>('entries')
        const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null)

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
                {/* Content Area */}
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
                        entries.length === 0 ? (
                            <EmptyStateMessage />
                        ) : (
                            <EntryList
                                entries={entries}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                onDelete={(entry: Entry) => setEntryToDelete(entry)}
                                onEdit={handleEditEntry}
                                emptyMessage="No entries in this topic"
                            />
                        )
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