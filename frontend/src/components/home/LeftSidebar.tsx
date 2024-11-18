import React, { useState, useEffect } from 'react'
import { Topic, topicsApi } from '../../lib/api/topicsApi'

interface LeftSidebarProps {
    onSelectTopic: (topicId: number | null) => void;
    selectedTopicId: number | null;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ onSelectTopic, selectedTopicId }) => {
    const [topics, setTopics] = useState<Topic[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [editingTopicId, setEditingTopicId] = useState<number | null>(null)
    const [editingName, setEditingName] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const [newTopicName, setNewTopicName] = useState('')

    useEffect(() => {
        fetchTopics()
    }, [])

    const fetchTopics = async () => {
        setIsLoading(true)
        try {
            const fetchedTopics = await topicsApi.getTopics()
            setTopics(fetchedTopics)
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
            setTopics([...topics, newTopic])
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
            
            setTopics(topics.map(topic => 
                topic.topic_id === topicId ? updatedTopic : topic
            ))
            cancelEditing()
        } catch (error) {
            console.error('Error updating topic:', error)
            // You might want to show an error message here
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent, topicId: number) => {
        if (e.key === 'Enter') {
            handleRename(topicId)
        } else if (e.key === 'Escape') {
            cancelEditing()
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
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            startEditing(topic)
                                        }}
                                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

export default LeftSidebar 