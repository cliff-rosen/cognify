import React, { useState, useEffect } from 'react'
import { Topic, TopicSearchResult, topicsApi } from '../../lib/api/topicsApi'
import { entriesApi, Entry } from '../../lib/api/entriesApi'
import { useDebounce } from '../../hooks/useDebounce'

interface TopBarProps {
    onEntryAdded?: (entry: Entry) => void;
}

const TopBar: React.FC<TopBarProps> = ({ onEntryAdded }) => {
    const [thought, setThought] = useState('')
    const [isSearching, setIsSearching] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
    const [searchResults, setSearchResults] = useState<TopicSearchResult[]>([])
    const [showTopicDropdown, setShowTopicDropdown] = useState(false)

    // Debounce the thought text to avoid too many API calls
    const debouncedThought = useDebounce(thought, 300)

    // Search topics when debounced thought changes
    useEffect(() => {
        const searchTopics = async () => {
            if (!debouncedThought.trim() || selectedTopic) {
                setSearchResults([])
                return
            }

            setIsSearching(true)
            try {
                const results = await topicsApi.searchTopics(debouncedThought)
                setSearchResults(results)
            } catch (error) {
                console.error('Error searching topics:', error)
                setSearchResults([])
            } finally {
                setIsSearching(false)
            }
        }

        searchTopics()
    }, [debouncedThought, selectedTopic])

    const handleAddThought = async () => {
        if (!thought.trim() || isSubmitting) return

        setIsSubmitting(true)
        try {
            const entry = await entriesApi.createEntry({
                content: thought,
                topic_id: selectedTopic?.topic_id || null
            })
            
            // Notify parent component about the new entry
            onEntryAdded?.(entry)
            
            setThought('')
            setSelectedTopic(null)
            setShowTopicDropdown(false)
        } catch (error) {
            console.error('Error creating entry:', error)
            // You might want to show an error message to the user here
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-3xl mx-auto space-y-2">
                {/* Thought Input with Topic Search */}
                <div className="relative">
                    <input
                        type="text"
                        value={thought}
                        onChange={(e) => {
                            setThought(e.target.value)
                            setShowTopicDropdown(true)
                        }}
                        placeholder="Add a new thought..."
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onFocus={() => setShowTopicDropdown(true)}
                    />

                    {/* Topic Dropdown - Colors remain the same */}
                    {showTopicDropdown && !selectedTopic && (searchResults.length > 0 || isSearching) && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                            {isSearching ? (
                                <div className="p-3 text-gray-500 dark:text-gray-400 text-sm">
                                    Finding related topics...
                                </div>
                            ) : (
                                <ul className="py-1">
                                    {searchResults.map((topic) => (
                                        <li
                                            key={topic.topic_id}
                                            className="px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                            onClick={() => {
                                                setSelectedTopic(topic)
                                                setShowTopicDropdown(false)
                                            }}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-700 dark:text-gray-300">
                                                    {topic.topic_name}
                                                </span>
                                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-4">
                                                    {(topic.score * 100).toFixed(0)}% match
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    {/* Selected Topic Display */}
                    {selectedTopic && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center gap-1 text-gray-700 dark:text-gray-300">
                                {selectedTopic.topic_name}
                                <button
                                    onClick={() => setSelectedTopic(null)}
                                    className="text-gray-500 hover:text-red-500 ml-2 transition-colors"
                                >
                                    ×
                                </button>
                            </span>
                        </div>
                    )}

                    {/* Add Thought Button */}
                    <button
                        onClick={handleAddThought}
                        disabled={!thought.trim() || isSubmitting}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed ml-auto flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                <span>Adding...</span>
                            </>
                        ) : (
                            'Add Thought'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default TopBar 