import React, { useEffect, useState } from 'react'
import { topicsApi, Topic } from '../../lib/api/topicsApi'
import { entriesApi, Entry } from '../../lib/api/entriesApi'

interface CenterWorkspaceProps {
    selectedTopicId: number | null;
}

const CenterWorkspace: React.FC<CenterWorkspaceProps> = ({ selectedTopicId }) => {
    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
    const [entries, setEntries] = useState<Entry[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'entries' | 'summary' | 'notes'>('entries')
    const [newEntry, setNewEntry] = useState('')

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true)
                setError(null)
                
                const fetchedEntries = await entriesApi.getEntries(selectedTopicId || undefined)
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

        fetchData()
    }, [selectedTopicId])

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
            <div className="h-full flex items-center justify-center">
                <div className="text-gray-500 dark:text-gray-400">Loading...</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-red-500">{error}</div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col">
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
                                                    {new Date(entry.created_at).toLocaleString()}
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
                    {/* Topic Header */}
                    <div className="flex-none p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-bold dark:text-white mb-4">
                            {selectedTopic?.topic_name || 'Topic'}
                        </h2>
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setActiveTab('entries')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    activeTab === 'entries'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                Entries
                            </button>
                            <button
                                onClick={() => setActiveTab('summary')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    activeTab === 'summary'
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                Summary
                            </button>
                            <button
                                onClick={() => setActiveTab('notes')}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                    activeTab === 'notes'
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
                                                    {new Date(entry.created_at).toLocaleString()}
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

export default CenterWorkspace 