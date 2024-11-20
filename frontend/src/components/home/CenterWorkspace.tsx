import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Topic, UNCATEGORIZED_TOPIC_ID, ProposedTopic, ProposedEntry } from '../../lib/api/topicsApi'
import { entriesApi, Entry } from '../../lib/api/entriesApi'
import { topicsApi } from '../../lib/api/topicsApi'
import { DragEvent } from 'react'
import AutoCategorizeWizard from './AutoCategorizeWizard';

interface CenterWorkspaceProps {
    selectedTopicId: number | null;
}

export interface CenterWorkspaceHandle {
    refreshEntries: () => void;
}

const CenterWorkspace = forwardRef<CenterWorkspaceHandle, CenterWorkspaceProps>(
    ({ selectedTopicId }, ref) => {
        const [_selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
        const [entries, setEntries] = useState<Entry[]>([])
        const [isLoading, setIsLoading] = useState(false)
        const [error, setError] = useState<string | null>(null)
        const [activeTab, setActiveTab] = useState<'entries' | 'summary' | 'notes'>('entries')
        const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null)
        const [showAutoCategorizeModal, setShowAutoCategorizeModal] = useState(false)
        const [allTopics, setAllTopics] = useState<Topic[]>([])
        const [isLoadingTopics, setIsLoadingTopics] = useState(false)
        const [categorizeInstructions, setCategorizeInstructions] = useState<string>('')

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
                // Cast the filtered topics to Topic[]
                setAllTopics(topics.filter(topic => !('is_uncategorized' in topic)) as Topic[])
            } catch (error) {
                console.error('Error fetching topics:', error)
            } finally {
                setIsLoadingTopics(false)
            }
        }

        const handleAutoCategorize = async () => {
            await fetchAllTopics()
            setShowAutoCategorizeModal(true)
        }

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
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold dark:text-white">Uncategorized Entries</h2>
                                <button
                                    onClick={handleAutoCategorize}
                                    className="px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 
                                             text-amber-100 rounded-lg flex items-center space-x-2 transition-all duration-200 
                                             shadow-md hover:shadow-lg border border-gray-600 hover:border-gray-500"
                                >
                                    <svg
                                        className="w-5 h-5 text-blue-300"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                        />
                                    </svg>
                                    <span>Auto-Categorize All</span>
                                </button>
                            </div>
                        </div>

                        {/* Entries List */}
                        <div className="p-4 flex-1 overflow-y-auto">
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
                            await fetchEntries(); // Refresh entries after categorization
                        }}
                    />
                )}
            </div>
        )
    }
)

export default CenterWorkspace 