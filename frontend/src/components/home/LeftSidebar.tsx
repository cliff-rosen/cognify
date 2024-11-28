import React, { useState, useEffect, useRef } from 'react'
import { Topic, topicsApi, isUncategorizedTopic, ALL_TOPICS_TOPIC_ID, UncategorizedTopic } from '../../lib/api/topicsApi'
import { DragEvent } from 'react'
import { Entry, entriesApi } from '../../lib/api/entriesApi'

interface LeftSidebarProps {
    onSelectTopic: (topicId: number | null) => void;
    selectedTopicId: number | null;
    topics: (Topic | UncategorizedTopic)[];
    onTopicsChange: (topics: (Topic | UncategorizedTopic)[]) => void;
    onEntryMoved: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
    onSelectTopic,
    selectedTopicId,
    topics,
    onTopicsChange,
    onEntryMoved
}) => {
    // Sidebar state
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isSidebarPinned, setIsSidebarPinned] = useState(true);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout>();

    // Other state
    const [isLoading, setIsLoading] = useState(false);
    const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newTopicName, setNewTopicName] = useState('');
    const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);
    const draggedEntryRef = useRef<Entry | null>(null);

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
            await topicsApi.deleteTopic(topic.topic_id)
            onTopicsChange(topics.filter(t => t.topic_id !== topic.topic_id))
            if (selectedTopicId === topic.topic_id) {
                onSelectTopic(ALL_TOPICS_TOPIC_ID)
            }
            setTopicToDelete(null)
        } catch (error) {
            console.error('Error deleting topic:', error)
        }
    }

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
                                                      ${selectedTopicId === ALL_TOPICS_TOPIC_ID ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                                                onClick={() => onSelectTopic(ALL_TOPICS_TOPIC_ID)}
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
                                                              ${selectedTopicId === topic.topic_id ? 'bg-gray-100 dark:bg-gray-700' : ''}
                                                              ${isUncategorizedTopic(topic) ? 'border-t border-b border-gray-200 dark:border-gray-700' : ''}`}
                                                        onDragOver={(e) => handleDragOver(e, topic.topic_id)}
                                                        onDragLeave={handleDragLeave}
                                                        onDrop={(e) => handleDrop(e, topic.topic_id)}
                                                    >
                                                        <span
                                                            onClick={() => onSelectTopic(topic.topic_id)}
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
        </>
    )
}

export default LeftSidebar 