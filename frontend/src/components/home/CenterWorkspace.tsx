import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { topicsApi, Topic } from '../../lib/api/topicsApi'
import { entriesApi, Entry } from '../../lib/api/entriesApi'

interface CenterWorkspaceProps {
    selectedTopicId: number | null;
}

export interface CenterWorkspaceHandle {
    refreshEntries: () => void;
}

const CenterWorkspace = forwardRef<CenterWorkspaceHandle, CenterWorkspaceProps>(
    ({ selectedTopicId }, ref) => {
        const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
        const [entries, setEntries] = useState<Entry[]>([])
        const [isLoading, setIsLoading] = useState(false)
        const [error, setError] = useState<string | null>(null)
        const [activeTab, setActiveTab] = useState<'entries' | 'summary' | 'notes'>('entries')
        const [newEntry, setNewEntry] = useState('')

        const fetchEntries = async () => {
            try {
                setIsLoading(true)
                setError(null)

                const fetchedEntries = await entriesApi.getEntries(
                    selectedTopicId ? { topic_id: selectedTopicId } : undefined
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

        // Expose the refresh method to parent components
        useImperativeHandle(ref, () => ({
            refreshEntries: fetchEntries
        }))

        const handleAddEntry = async () => {
            if (!newEntry.trim()) return

            try {
                const entry = await entriesApi.createEntry({
                    content: newEntry.trim(),
                    topic_id: selectedTopicId
                })
                setEntries([entry, ...entries])
                setNewEntry('')
            } catch (err) {
                console.error('Error creating entry:', err)
                // TODO: Show error notification
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
                {/* Navigation Header - Always visible */}

                {!selectedTopicId ? (
                    // Dashboard View
                    <div className="flex-1 flex flex-col">
                        <div className="flex-1 p-6 overflow-y-auto">
                            <h2 className="text-2xl font-bold mb-6 dark:text-white">Dashboard</h2>
                            <div className="space-y-4">
                                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                                    <h3 className="text-lg font-semibold dark:text-white">Recent Entries</h3>
                                    <div className="mt-4 space-y-4">
                                        {entries.length === 0 ? (
                                            <div className="text-gray-500 dark:text-gray-400">
                                                No entries yet
                                            </div>
                                        ) : (
                                            entries.map(entry => (
                                                <div
                                                    key={entry.entry_id}
                                                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                                >
                                                    <p className="text-gray-600 dark:text-gray-300">{entry.content}</p>
                                                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                        {new Date(entry.creation_date).toLocaleString()}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Add Entry Input - Fixed at Bottom */}
                        <div className="flex-none p-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newEntry}
                                    onChange={(e) => setNewEntry(e.target.value)}
                                    placeholder="Add a new entry..."
                                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 
                                             dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleAddEntry}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg 
                                             hover:bg-blue-600 transition-colors"
                                >
                                    Add Entry
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Topic View
                    <div className="flex-1 flex flex-col">
                        {/* Topic Tabs */}
                        <div className="flex-none px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex space-x-4">
                                <button
                                    onClick={() => setActiveTab('entries')}
                                    className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'entries'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    Entries
                                </button>
                                <button
                                    onClick={() => setActiveTab('summary')}
                                    className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'summary'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    Summary
                                </button>
                                <button
                                    onClick={() => setActiveTab('notes')}
                                    className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'notes'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    Notes
                                </button>
                            </div>
                        </div>

                        {/* Topic Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === 'entries' && (
                                <div className="space-y-4">
                                    {entries.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                            No entries yet
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {entries.map(entry => (
                                                <div
                                                    key={entry.entry_id}
                                                    className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
                                                >
                                                    <p className="text-gray-700 dark:text-gray-300">{entry.content}</p>
                                                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                                        {new Date(entry.creation_date).toLocaleString()}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            {activeTab === 'summary' && (
                                <div className="space-y-4">
                                    <div className="text-gray-500 dark:text-gray-400">
                                        No summary available
                                    </div>
                                </div>
                            )}
                            {activeTab === 'notes' && (
                                <div className="space-y-4">
                                    <div className="text-gray-500 dark:text-gray-400">
                                        No notes yet
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Add Entry Input - Fixed at Bottom */}
                        <div className="flex-none p-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newEntry}
                                    onChange={(e) => setNewEntry(e.target.value)}
                                    placeholder="Add a new entry..."
                                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 
                                             dark:border-gray-600 dark:bg-gray-800 dark:text-white 
                                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleAddEntry}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg 
                                             hover:bg-blue-600 transition-colors"
                                >
                                    Add Entry
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