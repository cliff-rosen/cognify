import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import { useState, useRef, useEffect } from 'react'
import { entriesApi, Entry } from '../lib/api/entriesApi'
import { Topic, topicsApi, TopicSearchResult, UNCATEGORIZED_TOPIC_ID } from '../lib/api/topicsApi'
import { useDebounce } from '../hooks/useDebounce'

interface TopBarProps {
    onEntryAdded: (entry: Entry) => void;
    onTopicCreated: (topic: Topic) => void;
    onTopicsChanged?: () => void;
}

export default function TopBar({ onEntryAdded, onTopicCreated, onTopicsChanged }: TopBarProps) {
    const { isAuthenticated, logout, user } = useAuth()
    const { isDarkMode, toggleTheme } = useTheme()

    // TopBar state
    const [entryText, setEntryText] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [suggestions, setSuggestions] = useState<TopicSearchResult[]>([])
    const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
    const [selectedTopicName, setSelectedTopicName] = useState<string>('')
    const [showNewTopicForm, setShowNewTopicForm] = useState(false)
    const [newTopicName, setNewTopicName] = useState('')
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const debouncedEntryText = useDebounce(entryText, 300)

    // Add useEffect for topic suggestions
    useEffect(() => {
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

    // TopBar functions
    const handleSubmit = async () => {
        if (!entryText.trim()) return

        setIsLoading(true)
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

            if (onTopicsChanged) {
                onTopicsChanged()
            }
        } catch (error) {
            console.error('Error creating entry:', error)
        } finally {
            setIsLoading(false)
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
        <nav className="bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between gap-8">
                    {/* Entry Input Area */}
                    <div className="flex-1 relative max-w-3xl">
                        <textarea
                            ref={inputRef}
                            value={entryText}
                            onChange={(e) => setEntryText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="What's on your mind?"
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                     dark:bg-gray-700 dark:text-white resize-none"
                            rows={1}
                        />

                        {/* Topic Selection */}
                        {selectedTopicName && (
                            <div className="absolute bottom-2 left-2">
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
                                            {/* AI Suggestion indicator on the left */}
                                            {topic.is_ai_suggested && (
                                                <span className="text-xs text-purple-600 dark:text-purple-400 mr-2 flex-shrink-0">
                                                    New AI suggestion
                                                </span>
                                            )}

                                            {/* Topic name in the middle */}
                                            <span className="text-gray-700 dark:text-gray-300 flex-grow">
                                                {topic.topic_name}
                                            </span>

                                            {/* Score and indicators on the right */}
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {/* Only show score if it's not a "Add new topic" option and has a score */}
                                                {!topic.is_new_topic && topic.score > 0 && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {Math.round(topic.score * 100)}%
                                                    </span>
                                                )}

                                                {/* Add new topic indicator */}
                                                {topic.is_new_topic && (
                                                    <span className="text-xs text-blue-600 dark:text-blue-400">
                                                        + Add new topic
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                                    <button
                                        onClick={() => setShowSuggestions(false)}
                                        className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                    >
                                        Close
                                    </button>
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

                    {/* Right Side Controls */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || !entryText.trim()}
                            className={`px-4 py-2 rounded-lg text-white 
                                      ${isLoading || !entryText.trim()
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {isLoading ? 'Adding...' : 'Add Entry'}
                        </button>

                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            aria-label="Toggle theme"
                        >
                            {isDarkMode ? (
                                <SunIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            ) : (
                                <MoonIcon className="h-5 w-5 text-gray-500" />
                            )}
                        </button>

                        {isAuthenticated && user && (
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                                {user.username}
                            </span>
                        )}

                        {isAuthenticated ? (
                            <button
                                onClick={logout}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 
                                         bg-gray-50 hover:bg-gray-100 rounded-md transition-colors
                                         dark:text-gray-300 dark:hover:text-gray-200 dark:bg-gray-800/30 dark:hover:bg-gray-800/50"
                            >
                                Logout
                            </button>
                        ) : <div />}
                    </div>
                </div>
            </div>
        </nav>
    )
} 