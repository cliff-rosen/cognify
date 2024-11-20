import React, { useState, useEffect } from 'react'
import { Topic, TopicSearchResult, topicsApi } from '../../lib/api/topicsApi'
import { entriesApi, Entry } from '../../lib/api/entriesApi'
import { useDebounce } from '../../hooks/useDebounce'

interface TopBarProps {
    onEntryAdded?: (entry: Entry) => void;
    onTopicCreated?: (topic: Topic) => void;
}

const TopBar: React.FC<TopBarProps> = ({ onEntryAdded, onTopicCreated }) => {
    const [thought, setThought] = useState('')
    const [isSearching, setIsSearching] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
    const [searchResults, setSearchResults] = useState<TopicSearchResult[]>([])
    const [showTopicDropdown, setShowTopicDropdown] = useState(false)
    const [isAddingNewTopic, setIsAddingNewTopic] = useState(false)
    const [newTopicName, setNewTopicName] = useState('')

    // Debounce the thought text to avoid too many API calls
    const debouncedThought = useDebounce(thought, 300)

    // Search topics when debounced thought changes
    useEffect(() => {
        const getSuggestions = async () => {
            if (!debouncedThought.trim() || selectedTopic || isSubmitting || !showTopicDropdown) {
                setSearchResults([])
                return
            }

            setIsSearching(true)
            try {
                const results = await topicsApi.getTopicSuggestions(debouncedThought)
                setSearchResults(results)
            } catch (error) {
                console.error('Error getting topic suggestions:', error)
                setSearchResults([])
            } finally {
                setIsSearching(false)
            }
        }

        getSuggestions()
    }, [debouncedThought, selectedTopic, isSubmitting, showTopicDropdown])

    const handleTopicSelection = async (topic: TopicSearchResult) => {
        if (topic.is_new_topic) {
            try {
                const newTopic = await topicsApi.createTopic({
                    topic_name: topic.topic_name
                })
                setSelectedTopic(newTopic)
                onTopicCreated?.(newTopic)
            } catch (error) {
                console.error('Error creating new topic:', error)
                // You might want to show an error message to the user here
            }
        } else {
            setSelectedTopic(topic)
        }
        setShowTopicDropdown(false)
    }

    const handleAddThought = async () => {
        if (!thought.trim() || isSubmitting || !selectedTopic) return

        setIsSubmitting(true)
        setSearchResults([])
        try {
            const entry = await entriesApi.createEntry({
                content: thought,
                topic_id: selectedTopic.topic_id
            })

            onEntryAdded?.(entry)

            setThought('')
            setSelectedTopic(null)
            setShowTopicDropdown(false)
        } catch (error) {
            console.error('Error creating entry:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleAddNewTopic = async () => {
        try {
            const newTopic = await topicsApi.createTopic({
                topic_name: newTopicName
            })
            setSelectedTopic(newTopic)
            onTopicCreated?.(newTopic)
            setNewTopicName('')
            setIsAddingNewTopic(false)
        } catch (error) {
            console.error('Error creating new topic:', error)
        }
    }

    return (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-3xl mx-auto space-y-2">
                {/* Helper text */}
                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {!thought.trim() ? (
                        <span>Start typing your thought to see topic suggestions</span>
                    ) : !selectedTopic ? (
                        <span className="text-blue-500 dark:text-blue-400">Now select or create a topic for your thought</span>
                    ) : (
                        <span className="text-green-500 dark:text-green-400">Ready to add your thought to "{selectedTopic.topic_name}"</span>
                    )}
                </div>

                {/* Input and button area */}
                <div className="flex items-start gap-4">
                    {/* Main input area */}
                    <div className="flex-1 space-y-2">
                        {/* Thought Input with Topic Search */}
                        <div className="relative">
                            <input
                                type="text"
                                value={thought}
                                onChange={(e) => {
                                    setThought(e.target.value)
                                    setShowTopicDropdown(true)
                                }}
                                placeholder="What's on your mind?"
                                className={`w-full px-4 py-2 rounded-lg border transition-colors
                                    ${!thought.trim() 
                                        ? 'border-gray-300 dark:border-gray-600' 
                                        : !selectedTopic
                                        ? 'border-blue-500 dark:border-blue-400'
                                        : 'border-green-500 dark:border-green-400'
                                    }
                                    dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                onFocus={() => {
                                    if (thought.trim() && !selectedTopic) {
                                        setShowTopicDropdown(true)
                                    }
                                }}
                            />

                            {/* Topic Dropdown */}
                            {showTopicDropdown && thought.trim() && !selectedTopic && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            Select a topic for your thought:
                                        </span>
                                    </div>
                                    {isSearching ? (
                                        <div className="p-3 text-gray-500 dark:text-gray-400 text-sm">
                                            Finding related topics...
                                        </div>
                                    ) : (
                                        <ul className="py-1">
                                            {searchResults.length > 0 && (
                                                <li className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                                                    Suggested topics:
                                                </li>
                                            )}
                                            {/* AI Suggestions and Existing Topics */}
                                            {searchResults.map((topic) => (
                                                <li
                                                    key={topic.is_new_topic ? `new-${topic.topic_name}` : topic.topic_id}
                                                    className="px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                                    onClick={() => handleTopicSelection(topic)}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-gray-700 dark:text-gray-300">
                                                            {topic.is_new_topic ? (
                                                                <span className="flex items-center gap-2">
                                                                    <span className="text-blue-500">+</span>
                                                                    Create "{topic.topic_name}"
                                                                    {topic.is_ai_suggested && (
                                                                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full ml-2 dark:bg-blue-900 dark:text-blue-300">
                                                                            AI Suggested
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-2">
                                                                    {topic.topic_name}
                                                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                                                        {(topic.score * 100).toFixed(0)}% match
                                                                    </span>
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </li>
                                            ))}

                                            {/* Add New Topic Option */}
                                            {isAddingNewTopic ? (
                                                <li className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700">
                                                    <form
                                                        onSubmit={(e) => {
                                                            e.preventDefault()
                                                            if (newTopicName.trim()) {
                                                                handleAddNewTopic()
                                                            }
                                                        }}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <input
                                                            type="text"
                                                            value={newTopicName}
                                                            onChange={(e) => setNewTopicName(e.target.value)}
                                                            placeholder="Enter topic name..."
                                                            className="flex-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            autoFocus
                                                        />
                                                        <button
                                                            type="submit"
                                                            disabled={!newTopicName.trim()}
                                                            className="px-3 py-1 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            Add
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setIsAddingNewTopic(false)
                                                                setNewTopicName('')
                                                            }}
                                                            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </form>
                                                </li>
                                            ) : (
                                                <li
                                                    className="px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-t border-gray-200 dark:border-gray-700"
                                                    onClick={() => {
                                                        setIsAddingNewTopic(true)
                                                        setNewTopicName('')
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 text-blue-500">
                                                        <span>+</span>
                                                        <span>Add new topic...</span>
                                                    </div>
                                                </li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Selected Topic Display */}
                        {selectedTopic && (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="px-3 py-1.5 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center gap-1 text-green-700 dark:text-green-300">
                                    {selectedTopic.topic_name}
                                    <button
                                        onClick={() => setSelectedTopic(null)}
                                        className="text-green-500 hover:text-red-500 ml-2 transition-colors"
                                    >
                                        ×
                                    </button>
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Add Thought Button */}
                    <button
                        onClick={handleAddThought}
                        disabled={!thought.trim() || !selectedTopic || isSubmitting}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors
                            ${!thought.trim()
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-500'
                                : !selectedTopic
                                ? 'bg-blue-50 text-blue-500 cursor-not-allowed dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                            }`}
                    >
                        {!thought.trim() 
                            ? 'Add Thought' 
                            : !selectedTopic 
                            ? 'Select Topic First' 
                            : isSubmitting 
                            ? 'Adding...' 
                            : 'Add to Topic'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default TopBar 