import React, { useState, useEffect, useRef } from 'react'
import { Topic, topicsApi, isUncategorizedTopic, ALL_TOPICS_TOPIC_ID, UncategorizedTopic, AllTopicsTopic, TopicSearchResult, UNCATEGORIZED_TOPIC_ID, AllTopicsTopicValue } from '../lib/api/topicsApi'
import { DragEvent } from 'react'
import { Entry, entriesApi } from '../lib/api/entriesApi'
import { useDebounce } from '../hooks/useDebounce'
import { PlusIcon } from '@heroicons/react/24/outline'

interface LeftSidebarProps {
    onSelectTopic: (topic: Topic | UncategorizedTopic | AllTopicsTopic) => void;
    selectedTopic: Topic | UncategorizedTopic | AllTopicsTopic;
    topics: (Topic | UncategorizedTopic)[];
    onTopicsChange: (topics: (Topic | UncategorizedTopic)[]) => void;
    onEntryMoved: () => void;
    onEntryAdded: (entry: Entry) => void;
    onTopicCreated: (topic: Topic) => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
    selectedTopic,
    topics,
    onSelectTopic,
    onTopicsChange,
    onEntryMoved,
    onEntryAdded,
    onTopicCreated
}) => {
    // Sidebar state
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isSidebarPinned, setIsSidebarPinned] = useState(true);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout>();

    // Other state
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);
    const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newTopicName, setNewTopicName] = useState('');
    const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);
    const draggedEntryRef = useRef<Entry | null>(null);

    // Add new state for entry form
    const [showEntryForm, setShowEntryForm] = useState(false)
    const [entryText, setEntryText] = useState('')
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [suggestions, setSuggestions] = useState<TopicSearchResult[]>([])
    const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
    const [selectedTopicName, setSelectedTopicName] = useState<string>('')
    const [showNewTopicForm, setShowNewTopicForm] = useState(false)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const debouncedEntryText = useDebounce(entryText, 300)

    // Sidebar handlers
    const handleHoverEnter = () => {
        if (!isSidebarPinned) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = setTimeout(() => {
                setIsSidebarOpen(true);
            }, 200);
        }
    };

    const handleHoverLeave = () => {
        if (!isSidebarPinned) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = setTimeout(() => {
                setIsSidebarOpen(false);
            }, 300);
        }
    };

    const handlePinClick = () => {
        if (isSidebarPinned) {
            setIsSidebarPinned(false);
            setIsSidebarOpen(false);
        } else if (isSidebarOpen) {
            setIsSidebarPinned(true);
        }
    };

    // Click outside handler
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (!isSidebarPinned &&
                sidebarRef.current &&
                !sidebarRef.current.contains(event.target as Node)) {
                setIsSidebarOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSidebarPinned]);

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
            await topicsApi.deleteTopic(topic.topic_id);
            onTopicsChange(topics.filter(t => t.topic_id !== topic.topic_id));
            if (selectedTopic?.topic_id === topic.topic_id) {
                onSelectTopic(topic);
            }
            setTopicToDelete(null);
        } catch (error) {
            console.error('Error deleting topic:', error);
        }
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>, topicId: number | null) => {
        if (!e.dataTransfer.types.includes('application/json')) {
            return;
        }

        if (topicId === ALL_TOPICS_TOPIC_ID) {
            return;
        }

        if (draggedEntryRef.current?.topic_id === topicId) {
            return;
        }

        e.preventDefault();
        if (e.currentTarget.classList) {
            e.currentTarget.classList.add('bg-blue-50', 'dark:bg-blue-900/30');
        }
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        if (e.currentTarget.classList) {
            e.currentTarget.classList.remove('bg-blue-50', 'dark:bg-blue-900/30')
        }
    }

    const handleDrop = async (e: DragEvent<HTMLDivElement>, topicId: number | null) => {
        e.preventDefault();

        if (topicId === ALL_TOPICS_TOPIC_ID) {
            return;
        }

        if (e.currentTarget.classList) {
            e.currentTarget.classList.remove('bg-blue-50', 'dark:bg-blue-900/30');
        }

        try {
            const entryData = e.dataTransfer.getData('application/json');
            const entry: Entry = JSON.parse(entryData);

            if (entry.topic_id === topicId) return;

            await entriesApi.moveEntryToTopic(entry.entry_id, topicId);

            const updatedTopics = await topicsApi.getTopics();
            onTopicsChange(updatedTopics);

            if (onEntryMoved) {
                onEntryMoved();
            }
        } catch (error) {
            console.error('Error moving entry:', error);
        } finally {
            draggedEntryRef.current = null;
        }
    };

    // Add event listener for drag enter
    useEffect(() => {
        const handleDragStart = (e: CustomEvent<Entry>) => {
            draggedEntryRef.current = e.detail
        }

        // TypeScript needs the 'as any' because CustomEvent<Entry> isn't a standard event type
        document.addEventListener('entryDragStart', handleDragStart as any)
        return () => document.removeEventListener('entryDragStart', handleDragStart as any)
    }, [])

    // Add cleanup for hover timeout
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

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
            setShowEntryForm(false)

            // Update topics after adding entry
            const updatedTopics = await topicsApi.getTopics()
            onTopicsChange(updatedTopics)
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

    if (isLoading) {
        return (
            <div className="p-4 text-gray-500 dark:text-gray-400">
                Loading topics...
            </div>
        )
    }

    return (
        <>
            {/* Wrapper div to contain both hot zone and sidebar */}
            <div className="relative h-full">
                {/* Add Entry Button */}
                <button
                    onClick={() => setShowEntryForm(true)}
                    className="absolute top-4 right-16 z-30 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-lg"
                    title="Add new entry"
                >
                    <PlusIcon className="w-5 h-5" />
                </button>

                {/* Entry Form Modal */}
                {showEntryForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 relative">
                            <button
                                onClick={() => setShowEntryForm(false)}
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
                )}

                {/* Hot Zone */}
                {!isSidebarPinned && !isSidebarOpen && (
                    <div
                        className="fixed left-0 w-2 h-full z-20"
                        onMouseEnter={handleHoverEnter}
                    />
                )}

                {isSidebarOpen && (
                    <div data-sidebar-open={isSidebarOpen} className="h-full">
                        {/* Sidebar */}
                        <aside
                            ref={sidebarRef}
                            onMouseEnter={handleHoverEnter}
                            onMouseLeave={handleHoverLeave}
                            className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                                  ${isSidebarPinned ? 'w-64' : 'w-72'} 
                                  absolute md:static z-20 h-full
                                  flex-shrink-0 border-r border-gray-200 dark:border-gray-700 
                                  bg-white dark:bg-gray-800
                                  transition-all duration-200 ease-in-out
                                  ${!isSidebarOpen ? 'md:w-0 md:min-w-0' : ''}`}
                        >
                            <div className="w-full h-full flex flex-col">
                                {/* Logo Section */}
                                <div className="flex-none p-4 border-b border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-2">
                                        <img
                                            src="/cognify-icon.svg"
                                            alt="Cognify Logo"
                                            className="h-8 w-8"
                                        />
                                        <span className="text-xl font-bold text-gray-800 dark:text-white">
                                            Cognify
                                        </span>
                                    </div>
                                </div>

                                {/* Topics List - Added pt-4 for spacing */}
                                <div className="flex-1 overflow-y-auto pt-4">
                                    <ul className="space-y-2"> {/* Increased space between items */}
                                        <li>
                                            <div
                                                className={`flex items-center p-2 mx-2 rounded-lg cursor-pointer  {/* Added mx-2 for side padding */}
                                                      hover:bg-gray-100 dark:hover:bg-gray-700
                                                      ${selectedTopic?.topic_id === ALL_TOPICS_TOPIC_ID ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                                                onClick={() => onSelectTopic(AllTopicsTopicValue)}
                                                onDragOver={(e) => handleDragOver(e, ALL_TOPICS_TOPIC_ID)}
                                                onDragLeave={handleDragLeave}
                                                onDrop={(e) => handleDrop(e, ALL_TOPICS_TOPIC_ID)}
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
                                                    !isUncategorizedTopic(topic) && (
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
                                                    )
                                                ) : (
                                                    <div
                                                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer
                                                              hover:bg-gray-100 dark:hover:bg-gray-700
                                                              ${selectedTopic?.topic_id === topic.topic_id ? 'bg-gray-100 dark:bg-gray-700' : ''}
                                                              ${isUncategorizedTopic(topic) ? 'border-t border-b border-gray-200 dark:border-gray-700' : ''}`}
                                                        onDragOver={(e) => handleDragOver(e, topic.topic_id)}
                                                        onDragLeave={handleDragLeave}
                                                        onDrop={(e) => handleDrop(e, topic.topic_id)}
                                                    >
                                                        <span
                                                            onClick={() => onSelectTopic(topic)}
                                                            className="flex-1 text-gray-700 dark:text-gray-300 flex justify-between items-center"
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                {isUncategorizedTopic(topic) ? (
                                                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                                                    </svg>
                                                                )}
                                                                <span className={isUncategorizedTopic(topic) ? 'text-gray-500 dark:text-gray-400 italic' : ''}>
                                                                    {topic.topic_name}
                                                                </span>
                                                            </span>
                                                            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                                                {topic.entry_count || 0}
                                                            </span>
                                                        </span>
                                                        {!isUncategorizedTopic(topic) && (
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
                                                                        e.stopPropagation();
                                                                        setTopicToDelete(topic);
                                                                    }}
                                                                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                                                    title="Delete topic"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Add Topic Button - At bottom */}
                                <div className="border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        onClick={() => setIsCreating(true)}
                                        className="w-full p-4 text-left text-sm font-medium text-gray-600 
                                                 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50
                                                 flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Topic
                                    </button>
                                </div>
                            </div>

                            {/* Pin/Toggle Button */}
                            <div className={`absolute -right-4 top-2 ${!isSidebarOpen ? 'md:right-0' : ''}`}>
                                <button
                                    onClick={handlePinClick}
                                    className="p-2 bg-white dark:bg-gray-800 border border-gray-200 
                                         dark:border-gray-700 rounded-full shadow 
                                         hover:bg-gray-50 dark:hover:bg-gray-700 
                                         transition-colors"
                                    title={isSidebarPinned ? "Unpin Sidebar" : "Pin Sidebar"}
                                >
                                    <svg
                                        className={`w-4 h-4 text-gray-400 hover:text-gray-600 
                                              dark:hover:text-gray-200 transform transition-transform 
                                              ${isSidebarPinned ? '-rotate-45' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 5h14l-4.5 12.5L12 6l-2.5 11.5L5 5z"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </aside>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {topicToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4 dark:text-white">Delete Topic</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Are you sure you want to delete "{topicToDelete.topic_name}"? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-4">
                            <button
                                onClick={() => setTopicToDelete(null)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteTopic(topicToDelete)}
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default LeftSidebar 