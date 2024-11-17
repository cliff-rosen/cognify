import React, { useState, useEffect } from 'react'
import { topicsApi, Topic } from '../../lib/api/topicsApi'
import { useAuth } from '../../context/AuthContext'
import Dialog from '../common/Dialog'

interface LeftSidebarProps {
    onSelectTopic: (topicId: number | null) => void;
    selectedTopicId: number | null;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ onSelectTopic, selectedTopicId }) => {
    const [topics, setTopics] = useState<Topic[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { isAuthenticated } = useAuth()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [newTopicName, setNewTopicName] = useState('')

    useEffect(() => {
        const fetchTopics = async () => {
            if (!isAuthenticated) return

            try {
                setIsLoading(true)
                setError(null)
                const fetchedTopics = await topicsApi.getTopics()
                setTopics(fetchedTopics)
            } catch (err) {
                setError('Failed to load topics')
                console.error('Error fetching topics:', err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchTopics()
    }, [isAuthenticated])

    const handleCreateTopic = async () => {
        if (!newTopicName.trim()) return

        try {
            const newTopic = await topicsApi.createTopic({
                topic_name: newTopicName.trim()
            })
            setTopics([...topics, newTopic])
            setIsDialogOpen(false)
            setNewTopicName('')
        } catch (err) {
            console.error('Error creating topic:', err)
            // Handle error (show toast notification, etc.)
        }
    }

    return (
        <>
            <div className="flex flex-col h-full">
                <div
                    className={`flex-none flex items-center p-3 cursor-pointer ${
                        selectedTopicId === null
                            ? 'bg-blue-50 dark:bg-gray-700'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => onSelectTopic(null)}
                >
                    <span className="dark:text-white">Dashboard</span>
                </div>

                <div className="flex-none p-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">TOPICS</h3>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="px-4">
                        {isLoading ? (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                Loading topics...
                            </div>
                        ) : error ? (
                            <div className="text-center py-4 text-red-500">
                                {error}
                            </div>
                        ) : topics.length === 0 ? (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                No topics yet
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {topics.map((topic) => (
                                    <div
                                        key={topic.topic_id}
                                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${
                                            selectedTopicId === topic.topic_id
                                                ? 'bg-blue-50 dark:bg-gray-700'
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                        onClick={() => onSelectTopic(topic.topic_id)}
                                    >
                                        <span className="dark:text-white">{topic.topic_name}</span>
                                        <button
                                            className="text-gray-500 hover:text-blue-500"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}
                                        >
                                            <span className="text-xl">+</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-none p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setIsDialogOpen(true)}
                        className="w-full px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 
                                 dark:text-white rounded-lg hover:bg-gray-200 
                                 dark:hover:bg-gray-700 transition-colors"
                    >
                        Add Topic
                    </button>
                </div>
            </div>

            <Dialog
                isOpen={isDialogOpen}
                onClose={() => {
                    setIsDialogOpen(false)
                    setNewTopicName('')
                }}
                title="Add New Topic"
            >
                <div className="mt-2">
                    <input
                        type="text"
                        value={newTopicName}
                        onChange={(e) => setNewTopicName(e.target.value)}
                        placeholder="Enter topic name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        autoFocus
                    />
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-2">
                    <button
                        onClick={handleCreateTopic}
                        className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Create
                    </button>
                    <button
                        onClick={() => {
                            setIsDialogOpen(false)
                            setNewTopicName('')
                        }}
                        className="mt-3 sm:mt-0 w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                    >
                        Cancel
                    </button>
                </div>
            </Dialog>
        </>
    )
}

export default LeftSidebar 