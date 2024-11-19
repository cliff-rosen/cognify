import React, { useState, useEffect } from 'react'
import { Topic, topicsApi } from '../../lib/api/topicsApi'

interface LeftSidebarProps {
    onSelectTopic: (topicId: number | null) => void;
    selectedTopicId: number | null;
    topics: Topic[];
    onTopicsChange: (topics: Topic[]) => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
    onSelectTopic, 
    selectedTopicId, 
    topics, 
    onTopicsChange
}) => {
    const [isLoading, setIsLoading] = useState(false)
    const [editingTopicId, setEditingTopicId] = useState<number | null>(null)
    const [editingName, setEditingName] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const [newTopicName, setNewTopicName] = useState('')
    const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null)

    useEffect(() => {
        fetchTopics()
    }, [])

    const fetchTopics = async () => {
        setIsLoading(true)
        try {
            const fetchedTopics = await topicsApi.getTopics()
            onTopicsChange(fetchedTopics)
        } catch (error) {
            console.error('Error fetching topics:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateTopic = async () => {
        if (!newTopicName.trim()) {
            setIsCreating(false)
            setNewTopicName('')
            return
        }

        try {
            const newTopic = await topicsApi.createTopic({
                topic_name: newTopicName.trim()
            })
            onTopicsChange([...topics, newTopic])
            setIsCreating(false)
            setNewTopicName('')
        } catch (error) {
            console.error('Error creating topic:', error)
        }
    }

    const startEditing = (topic: Topic) => {
        setEditingTopicId(topic.topic_id)
        setEditingName(topic.topic_name)
    }

    const cancelEditing = () => {
        setEditingTopicId(null)
        setEditingName('')
    }

    const handleRename = async (topicId: number) => {
        if (!editingName.trim()) {
            cancelEditing()
            return
        }

        try {
            const updatedTopic = await topicsApi.updateTopic(topicId, {
                topic_name: editingName.trim()
            })
            
            onTopicsChange(topics.map(topic =>  
                topic.topic_id === topicId ? updatedTopic : topic
            ))
            cancelEditing()
        } catch (error) {
            console.error('Error updating topic:', error)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent, topicId: number) => {
        if (e.key === 'Enter') {
            handleRename(topicId)
        } else if (e.key === 'Escape') {
            cancelEditing()
        }
    }

    const handleDeleteTopic = async (topic: Topic) => {
        try {
            await topicsApi.deleteTopic(topic.topic_id)
            onTopicsChange(topics.filter(t => t.topic_id !== topic.topic_id))
            if (selectedTopicId === topic.topic_id) {
                onSelectTopic(null)
            }
            setTopicToDelete(null)
        } catch (error) {
            console.error('Error deleting topic:', error)
        }
    }

    if (isLoading) {
        return (
            <div className="p-4 text-gray-500 dark:text-gray-400">
                Loading topics...
            </div>
        )
    }

    return (
        <div className="w-full flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-semibold dark:text-white">Topics</h2>
                <button
                    onClick={() => setIsCreating(true)}
                    className="p-1 text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
                    title="Add new topic"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                <ul className="space-y-1">
                    <li>
                        <div
                            className={`flex items-center p-2 rounded-lg cursor-pointer
                                      hover:bg-gray-100 dark:hover:bg-gray-700
                                      ${selectedTopicId === null ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                            onClick={() => onSelectTopic(null)}
                        >
                            <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                <svg 
                                    className="w-5 h-5" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        strokeWidth={2} 
                                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
                                    />
                                </svg>
                                Dashboard
                            </span>
                        </div>
                    </li>

                    <li className="py-2">
                        <div className="border-t border-gray-200 dark:border-gray-700"></div>
                    </li>

                    {isCreating && (
                        <li>
                            <div className="flex items-center p-2 rounded-lg">
                                <input
                                    type="text"
                                    value={newTopicName}
                                    onChange={(e) => setNewTopicName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleCreateTopic()
                                        } else if (e.key === 'Escape') {
                                            setIsCreating(false)
                                            setNewTopicName('')
                                        }
                                    }}
                                    onBlur={handleCreateTopic}
                                    placeholder="New topic name..."
                                    className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 
                                             dark:border-gray-600 dark:bg-gray-700 dark:text-white
                                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                />
                            </div>
                        </li>
                    )}
                    {topics.map(topic => (
                        <li key={topic.topic_id}>
                            {editingTopicId === topic.topic_id ? (
                                <div className="flex items-center p-2 rounded-lg">
                                    <input
                                        type="text"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        onKeyDown={(e) => handleKeyPress(e, topic.topic_id)}
                                        onBlur={() => handleRename(topic.topic_id)}
                                        className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 
                                                 dark:border-gray-600 dark:bg-gray-700 dark:text-white
                                                 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        autoFocus
                                    />
                                </div>
                            ) : (
                                <div
                                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer
                                              hover:bg-gray-100 dark:hover:bg-gray-700
                                              ${selectedTopicId === topic.topic_id ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                                >
                                    <span
                                        onClick={() => onSelectTopic(topic.topic_id)}
                                        className="flex-1 text-gray-700 dark:text-gray-300"
                                    >
                                        {topic.topic_name}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                startEditing(topic)
                                            }}
                                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                            title="Edit topic"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setTopicToDelete(topic)
                                            }}
                                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                            title="Delete topic"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Delete Confirmation Modal */}
            {topicToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold mb-4 dark:text-white">
                            Delete Topic
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Are you sure you want to delete "{topicToDelete.topic_name}"? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setTopicToDelete(null)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteTopic(topicToDelete)}
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

export default LeftSidebar 