import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Topic, UNCATEGORIZED_TOPIC_ID, ProposedTopic, ProposedEntry } from '../../lib/api/topicsApi'
import { entriesApi, Entry } from '../../lib/api/entriesApi'
import { topicsApi } from '../../lib/api/topicsApi'
import { DragEvent } from 'react'

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
        const [suggestedNewTopics, setSuggestedNewTopics] = useState<string[]>([])
        const [selectedExistingTopics, setSelectedExistingTopics] = useState<Set<number>>(new Set())
        const [entriesTab, setEntriesTab] = useState<'current' | 'proposed'>('current')
        const [showInstructions, setShowInstructions] = useState(true)
        const [proposedTopics, setProposedTopics] = useState<ProposedTopic[]>([])
        const [uncategorizedEntries, setUncategorizedEntries] = useState<ProposedEntry[]>([])
        const [isAnalyzing, setIsAnalyzing] = useState(false)
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
                // Filter out the uncategorized pseudo-topic
                setAllTopics(topics.filter(topic => !('is_uncategorized' in topic)))
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

        const handleStartAutoCategorization = async () => {
            try {
                setIsAnalyzing(true)
                const result = await topicsApi.analyzeCategorization({
                    instructions: categorizeInstructions.trim() || undefined,
                    topics_to_keep: Array.from(selectedExistingTopics)
                })
                setProposedTopics(result.proposed_topics)
                setUncategorizedEntries(result.uncategorized_entries)
                setEntriesTab('proposed')  // Switch to proposed view
            } catch (error) {
                console.error('Error analyzing categorization:', error)
                // TODO: Show error notification
            } finally {
                setIsAnalyzing(false)
            }
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

                {/* Auto-categorize Modal */}
                {showAutoCategorizeModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                            {/* Modal Header with Instructions */}
                            <div className="border-b border-gray-200 dark:border-gray-700">
                                <div className="p-6 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-2xl font-bold dark:text-white">Auto-Categorize Entries</h2>
                                        <button
                                            onClick={() => setShowInstructions(!showInstructions)}
                                            className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 flex items-center"
                                        >
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                {showInstructions ? (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                ) : (
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                )}
                                            </svg>
                                            {showInstructions ? 'Hide Instructions' : 'Show Instructions'}
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setShowAutoCategorizeModal(false)}
                                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Collapsible Instructions */}
                                {showInstructions && (
                                    <div className="px-6 pb-6">
                                        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                                            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3">
                                                How to Auto-Categorize
                                            </h3>
                                            <ol className="space-y-3 text-blue-800 dark:text-blue-200">
                                                <li className="flex items-start">
                                                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mr-2 mt-0.5">
                                                        <span className="text-blue-600 dark:text-blue-300 font-medium">1</span>
                                                    </span>
                                                    <span>Select existing topics you want to keep from the left panel. These topics will be preserved and may receive new entries.</span>
                                                </li>
                                                <li className="flex items-start">
                                                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mr-2 mt-0.5">
                                                        <span className="text-blue-600 dark:text-blue-300 font-medium">2</span>
                                                    </span>
                                                    <span>Click "Start Auto-Categorization" to analyze your entries and see AI-suggested topics and entry assignments.</span>
                                                </li>
                                                <li className="flex items-start opacity-50">
                                                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mr-2 mt-0.5">
                                                        <span className="text-blue-600 dark:text-blue-300 font-medium">3</span>
                                                    </span>
                                                    <span>Review and confirm the proposed changes (coming soon)</span>
                                                </li>
                                            </ol>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Instructions Input */}
                            <div className="px-6 pb-6">
                                <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                                    <label 
                                        htmlFor="instructions" 
                                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                                    >
                                        Instructions (Optional)
                                    </label>
                                    <textarea
                                        id="instructions"
                                        value={categorizeInstructions}
                                        onChange={(e) => setCategorizeInstructions(e.target.value)}
                                        placeholder="Enter any specific instructions for how you want your entries categorized..."
                                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                                 dark:bg-gray-800 dark:text-white resize-none"
                                        rows={3}
                                    />
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        Examples: "Keep technical and personal topics separate" or "Create detailed subcategories for programming topics"
                                    </p>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-hidden p-6 flex gap-6">
                                {/* Topics List */}
                                <div className="w-1/4 overflow-y-auto border-r border-gray-200 dark:border-gray-700 pr-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold dark:text-white">Existing Topics</h3>
                                        <button
                                            onClick={() => setSelectedExistingTopics(new Set())}
                                            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                        >
                                            Clear Selection
                                        </button>
                                    </div>
                                    {isLoadingTopics ? (
                                        <div className="flex items-center justify-center py-4">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {allTopics.map(topic => (
                                                <div
                                                    key={topic.topic_id}
                                                    className={`p-3 rounded-lg transition-colors cursor-pointer
                                                        ${selectedExistingTopics.has(topic.topic_id)
                                                            ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-800'
                                                            : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                                                        }`}
                                                    onClick={() => {
                                                        setSelectedExistingTopics(prev => {
                                                            const newSet = new Set(prev)
                                                            if (newSet.has(topic.topic_id)) {
                                                                newSet.delete(topic.topic_id)
                                                            } else {
                                                                newSet.add(topic.topic_id)
                                                            }
                                                            return newSet
                                                        })
                                                    }}
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`w-5 h-5 flex-shrink-0 border-2 rounded 
                                                            ${selectedExistingTopics.has(topic.topic_id)
                                                                ? 'border-blue-500 bg-blue-500 dark:border-blue-400 dark:bg-blue-400'
                                                                : 'border-gray-300 dark:border-gray-500'
                                                            }`}
                                                        >
                                                            {selectedExistingTopics.has(topic.topic_id) && (
                                                                <svg className="w-full h-full text-white" viewBox="0 0 24 24">
                                                                    <path
                                                                        fill="currentColor"
                                                                        d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"
                                                                    />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <div className="flex-grow">
                                                            <h4 className="font-medium dark:text-white">{topic.topic_name}</h4>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                {topic.entry_count || 0} entries
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {allTopics.length > 0 && selectedExistingTopics.size > 0 && (
                                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                                Selected topics will be preserved during auto-categorization.
                                                New entries may still be added to these topics.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Proposed Topic Changes */}
                                <div className="w-1/4 overflow-y-auto border-r border-gray-200 dark:border-gray-700 px-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold dark:text-white">Proposed Topic Changes</h3>
                                        <div className="flex items-center text-sm text-blue-500 dark:text-blue-400">
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                            <span>AI Assisted</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {/* Show selected existing topics first */}
                                        {Array.from(selectedExistingTopics).map(topicId => {
                                            const topic = allTopics.find(t => t.topic_id === topicId)
                                            if (!topic) return null
                                            return (
                                                <div
                                                    key={topic.topic_id}
                                                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-green-200 dark:border-green-900"
                                                >
                                                    <h4 className="font-medium dark:text-white flex items-center justify-between">
                                                        <span>{topic.topic_name}</span>
                                                        <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900 
                                                                     text-green-700 dark:text-green-300 rounded-full">
                                                            Keep
                                                        </span>
                                                    </h4>
                                                </div>
                                            )
                                        })}

                                        {/* Show proposed topics */}
                                        {proposedTopics.map((topic, index) => (
                                            <div
                                                key={topic.topic_id || `new-${index}`}
                                                className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-blue-200 dark:border-blue-900"
                                            >
                                                <h4 className="font-medium dark:text-white flex items-center justify-between">
                                                    <span>{topic.topic_name}</span>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 
                                                                     text-blue-700 dark:text-blue-300 rounded-full">
                                                            {topic.is_new ? 'New' : 'Modified'}
                                                        </span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {Math.round(topic.confidence_score * 100)}%
                                                        </span>
                                                    </div>
                                                </h4>
                                            </div>
                                        ))}

                                        {/* Empty state message */}
                                        {selectedExistingTopics.size === 0 && proposedTopics.length === 0 && (
                                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                                Select existing topics to keep or start auto-categorization
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Uncategorized Entries with Tabs */}
                                <div className="flex-1 overflow-hidden flex flex-col">
                                    <h3 className="text-lg font-semibold dark:text-white mb-2">Entries</h3>
                                    {/* Tabs */}
                                    <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                                        <button
                                            onClick={() => setEntriesTab('current')}
                                            className={`px-4 py-2 relative ${
                                                entriesTab === 'current'
                                                    ? 'text-blue-600 dark:text-blue-400'
                                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                            }`}
                                        >
                                            Current
                                            {entriesTab === 'current' && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setEntriesTab('proposed')}
                                            className={`px-4 py-2 relative ${
                                                entriesTab === 'proposed'
                                                    ? 'text-blue-600 dark:text-blue-400'
                                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                            }`}
                                        >
                                            Proposed
                                            {entriesTab === 'proposed' && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"></div>
                                            )}
                                        </button>
                                    </div>

                                    {/* Tab Content */}
                                    <div className="flex-1 overflow-y-auto">
                                        {entriesTab === 'current' ? (
                                            <div className="space-y-4">
                                                {entries.map(entry => (
                                                    <div
                                                        key={entry.entry_id}
                                                        className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-sm">
                                                                {entry.topic_id ? (
                                                                    <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 
                                                                           text-gray-700 dark:text-gray-300 rounded-full text-xs">
                                                                        {allTopics.find(t => t.topic_id === entry.topic_id)?.topic_name || 'Unknown Topic'}
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 
                                                                           text-yellow-700 dark:text-yellow-300 rounded-full text-xs">
                                                                        Uncategorized
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                                {new Date(entry.creation_date).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                            {entry.content}
                                                        </p>
                                                    </div>
                                                ))}
                                                {entries.length === 0 && (
                                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                                        No entries found
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {proposedTopics.map((topic) => (
                                                    <div key={topic.topic_id || topic.topic_name} className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-2">
                                                                <h4 className="font-medium text-blue-600 dark:text-blue-400">
                                                                    {topic.topic_name}
                                                                </h4>
                                                                <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 
                                                                             text-blue-700 dark:text-blue-300 rounded-full">
                                                                    {topic.is_new ? 'New Topic' : 'Existing Topic'}
                                                                </span>
                                                            </div>
                                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                                {Math.round(topic.confidence_score * 100)}% confidence
                                                            </span>
                                                        </div>
                                                        <div className="pl-4 border-l-2 border-blue-200 dark:border-blue-800 space-y-3">
                                                            {topic.entries.map(entry => (
                                                                <div key={entry.entry_id} className="space-y-2">
                                                                    <p className="text-gray-700 dark:text-gray-300">
                                                                        {entry.content}
                                                                    </p>
                                                                    <div className="flex items-center justify-between text-sm">
                                                                        <span className="text-gray-500 dark:text-gray-400">
                                                                            {Math.round(entry.confidence_score * 100)}% confidence
                                                                        </span>
                                                                        {entry.current_topic_id !== topic.topic_id && (
                                                                            <span className="text-yellow-600 dark:text-yellow-400">
                                                                                Moved from: {allTopics.find(t => t.topic_id === entry.current_topic_id)?.topic_name || 'Uncategorized'}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Show uncategorized entries if any */}
                                                {uncategorizedEntries.length > 0 && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center space-x-2">
                                                            <h4 className="font-medium text-yellow-600 dark:text-yellow-400">
                                                                Uncategorized Entries
                                                            </h4>
                                                            <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900 
                                                                         text-yellow-700 dark:text-yellow-300 rounded-full">
                                                                Low Confidence
                                                            </span>
                                                        </div>
                                                        <div className="pl-4 border-l-2 border-yellow-200 dark:border-yellow-800 space-y-3">
                                                            {uncategorizedEntries.map(entry => (
                                                                <div key={entry.entry_id} className="space-y-2">
                                                                    <p className="text-gray-700 dark:text-gray-300">
                                                                        {entry.content}
                                                                    </p>
                                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                        {Math.round(entry.confidence_score * 100)}% confidence
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Empty state */}
                                                {proposedTopics.length === 0 && uncategorizedEntries.length === 0 && (
                                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                                        Click "Start Auto-Categorization" to see proposed changes
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-4">
                                <button
                                    onClick={() => setShowAutoCategorizeModal(false)}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleStartAutoCategorization}
                                    disabled={isAnalyzing}
                                    className="px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 
                                             text-amber-100 rounded-lg flex items-center space-x-2 transition-all duration-200 
                                             shadow-md hover:shadow-lg border border-gray-600 hover:border-gray-500
                                             disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Analyzing...</span>
                                        </>
                                    ) : (
                                        <span>Start Auto-Categorization</span>
                                    )}
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