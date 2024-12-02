import React, { useState, useRef } from 'react'
import { Entry, entriesApi } from '../lib/api/entriesApi'
import { Topic, topicsApi, TopicSearchResult, UNCATEGORIZED_TOPIC_ID } from '../lib/api/topicsApi'
import { useDebounce } from '../hooks/useDebounce'

interface EntryFormProps {
    onClose: () => void;
    onEntryAdded: (entry: Entry) => void;
    onTopicCreated: (topic: Topic) => void;
}

const EntryForm: React.FC<EntryFormProps> = ({
    onClose,
    onEntryAdded,
    onTopicCreated
}) => {
    const [entryText, setEntryText] = useState('')
    const [isSubmittingEntry, setIsSubmittingEntry] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [suggestions, setSuggestions] = useState<TopicSearchResult[]>([])
    const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
    const [selectedTopicName, setSelectedTopicName] = useState<string>('')
    const [showNewTopicForm, setShowNewTopicForm] = useState(false)
    const [newTopicName, setNewTopicName] = useState('')
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const debouncedEntryText = useDebounce(entryText, 300)

    // Add useEffect for topic suggestions
    React.useEffect(() => {
        if (debouncedEntryText) {
            fetchSuggestions()
        } else {
            setSuggestions([])
            setShowSuggestions(false)
        }
    }, [debouncedEntryText])

    const fetchSuggestions = async () => {
        try {
            const suggestedTopics = await topicsApi.getTopicSuggestions(entryText)

            // Add the "Add new topic..." option
            const newTopicOption: TopicSearchResult = {
                topic_id: -999,
                topic_name: "Add new topic...",
                score: 0,
                is_new_topic: true,
                user_id: 0,
                creation_date: new Date().toISOString()
            }

            const allSuggestions = [...suggestedTopics, newTopicOption]

            if (allSuggestions.length > 0) {
                setSuggestions(allSuggestions)
                setShowSuggestions(true)
            } else {
                setShowSuggestions(false)
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error)
            setSuggestions([])
            setShowSuggestions(false)
        }
    }

    const handleSubmit = async () => {
        if (!entryText.trim()) return

        setIsSubmittingEntry(true)
        try {
            const entry = await entriesApi.createEntry({
                content: entryText.trim(),
                topic_id: selectedTopicId  // This can be null for uncategorized entries
            })
            if (entry.topic_id === null) {
                entry.topic_id = UNCATEGORIZED_TOPIC_ID
            }
            onEntryAdded(entry)
            setEntryText('')
            setSelectedTopicId(null)
            setSelectedTopicName('')
            setSuggestions([])
            setShowSuggestions(false)
            onClose()
        } catch (error) {
            console.error('Error creating entry:', error)
        } finally {
            setIsSubmittingEntry(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    const handleTopicSelect = async (topic: TopicSearchResult) => {
        if (topic.is_new_topic && !topic.is_ai_suggested) {
            // Only show the form for manual new topic creation
            setShowNewTopicForm(true)
            setShowSuggestions(false)
            return
        }

        if (topic.is_ai_suggested) {
            // Automatically create the AI-suggested topic
            try {
                const newTopic = await topicsApi.createTopic({
                    topic_name: topic.topic_name
                })
                setSelectedTopicId(newTopic.topic_id)
                setSelectedTopicName(newTopic.topic_name)
                onTopicCreated(newTopic)
                setShowSuggestions(false)
            } catch (error) {
                console.error('Error creating AI-suggested topic:', error)
            }
            return
        }

        // Handle existing topic selection
        setSelectedTopicId(topic.topic_id)
        setSelectedTopicName(topic.topic_name)
        setShowSuggestions(false)
    }

    const handleCreateNewTopic = async () => {
        if (!newTopicName.trim()) {
            setShowNewTopicForm(false)
            setNewTopicName('')
            return
        }

        try {
            const newTopic = await topicsApi.createTopic({
                topic_name: newTopicName.trim()
            })
            setSelectedTopicId(newTopic.topic_id)
            setSelectedTopicName(newTopic.topic_name)
            onTopicCreated(newTopic)
            setShowNewTopicForm(false)
            setNewTopicName('')
        } catch (error) {
            console.error('Error creating new topic:', error)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    ×
                </button>
                <h3 className="text-lg font-semibold mb-4 dark:text-white">Add New Entry</h3>

                <div className="relative">
                    <textarea
                        ref={inputRef}
                        value={entryText}
                        onChange={(e) => setEntryText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="What's on your mind?"
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                 dark:bg-gray-700 dark:text-white resize-none"
                        rows={4}
                        autoFocus
                    />

                    {/* Topic Selection */}
                    {selectedTopicName && (
                        <div className="absolute bottom-3 left-3">
                            <div className="flex items-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 
                                        px-2 py-1 rounded-full text-sm">
                                <span>{selectedTopicName}</span>
                                <button
                                    onClick={() => {
                                        setSelectedTopicId(null)
                                        setSelectedTopicName('')
                                    }}
                                    className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Topic Suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg 
                                    border border-gray-200 dark:border-gray-700">
                            <div className="p-2">
                                {suggestions.map((topic) => (
                                    <div
                                        key={topic.topic_id}
                                        onClick={() => handleTopicSelect(topic)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer flex items-center"
                                    >
                                        {topic.is_ai_suggested && (
                                            <span className="text-xs text-purple-600 dark:text-purple-400 mr-2 flex-shrink-0">
                                                New AI suggestion
                                            </span>
                                        )}
                                        <span className="text-gray-700 dark:text-gray-300 flex-grow">
                                            {topic.topic_name}
                                        </span>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {!topic.is_new_topic && topic.score > 0 && (
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {Math.round(topic.score * 100)}%
                                                </span>
                                            )}
                                            {topic.is_new_topic && (
                                                <span className="text-xs text-blue-600 dark:text-blue-400">
                                                    + Add new topic
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* New Topic Form */}
                    {showNewTopicForm && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg 
                                    border border-gray-200 dark:border-gray-700">
                            <div className="p-4">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                                    Create New Topic
                                </h3>
                                <input
                                    type="text"
                                    value={newTopicName}
                                    onChange={(e) => setNewTopicName(e.target.value)}
                                    placeholder="Enter topic name"
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded 
                                            focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                            dark:bg-gray-700 dark:text-white"
                                    autoFocus
                                />
                                <div className="mt-4 flex justify-end space-x-2">
                                    <button
                                        onClick={() => {
                                            setShowNewTopicForm(false)
                                            setNewTopicName('')
                                        }}
                                        className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateNewTopic}
                                        disabled={!newTopicName.trim()}
                                        className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 
                                                disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        Create
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-4 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmittingEntry || !entryText.trim()}
                        className={`px-4 py-2 rounded-lg text-white 
                                ${isSubmittingEntry || !entryText.trim()
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {isSubmittingEntry ? 'Adding...' : 'Add Entry'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default EntryForm 