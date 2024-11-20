import React, { useState, useRef, useEffect } from 'react'
import { entriesApi } from '../../lib/api/entriesApi'
import { Topic, topicsApi, TopicSearchResult } from '../../lib/api/topicsApi'
import { useDebounce } from '../../hooks/useDebounce'

interface TopBarProps {
    onEntryAdded: (entry: any) => void
    onTopicCreated: (topic: Topic) => void
    currentTopicId: number | null
}

const TopBar: React.FC<TopBarProps> = ({ onEntryAdded, onTopicCreated, currentTopicId }) => {
    const [entryText, setEntryText] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [suggestions, setSuggestions] = useState<TopicSearchResult[]>([])
    const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
    const [selectedTopicName, setSelectedTopicName] = useState<string>('')
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const debouncedEntryText = useDebounce(entryText, 500)

    useEffect(() => {
        if (debouncedEntryText && debouncedEntryText.length > 10) {
            fetchSuggestions()
        } else {
            setSuggestions([])
        }
    }, [debouncedEntryText])

    const fetchSuggestions = async () => {
        try {
            const suggestedTopics = await topicsApi.getTopicSuggestions(entryText)
            setSuggestions(suggestedTopics)
            setShowSuggestions(true)
        } catch (error) {
            console.error('Error fetching suggestions:', error)
        }
    }

    const handleSubmit = async () => {
        if (!entryText.trim()) return

        setIsLoading(true)
        try {
            const entry = await entriesApi.createEntry({
                content: entryText.trim(),
                topic_id: selectedTopicId  // This can be null for uncategorized entries
            })
            onEntryAdded(entry)
            setEntryText('')
            setSelectedTopicId(null)
            setSelectedTopicName('')
            setSuggestions([])
            setShowSuggestions(false)
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
        setSelectedTopicId(topic.topic_id)
        setSelectedTopicName(topic.topic_name)
        setShowSuggestions(false)
        
        if (topic.is_new_topic) {
            try {
                const newTopic = await topicsApi.createTopic({
                    topic_name: topic.topic_name
                })
                setSelectedTopicId(newTopic.topic_id)
                onTopicCreated(newTopic)
            } catch (error) {
                console.error('Error creating new topic:', error)
            }
        }
    }

    return (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="max-w-4xl mx-auto relative">
                <div className="flex flex-col space-y-2">
                    <textarea
                        ref={inputRef}
                        value={entryText}
                        onChange={(e) => setEntryText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="What's on your mind?"
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                 dark:bg-gray-700 dark:text-white resize-none"
                        rows={3}
                    />
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                            {selectedTopicName ? (
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
                            ) : (
                                <div className="text-gray-500 dark:text-gray-400 text-sm italic">
                                    Will be added to Uncategorized
                                </div>
                            )}
                        </div>
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
                    </div>
                </div>

                {/* Topic Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                        <div className="p-2">
                            {suggestions.map((topic) => (
                                <div
                                    key={topic.topic_id}
                                    onClick={() => handleTopicSelect(topic)}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer flex items-center justify-between"
                                >
                                    <span className="text-gray-700 dark:text-gray-300">
                                        {topic.topic_name}
                                    </span>
                                    {topic.is_new_topic && (
                                        <span className="text-xs text-blue-600 dark:text-blue-400">New Topic</span>
                                    )}
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
            </div>
        </div>
    )
}

export default TopBar 