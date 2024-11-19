import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import TopBar from '../components/home/TopBar'
import LeftSidebar from '../components/home/LeftSidebar'
import CenterWorkspace from '../components/home/CenterWorkspace'
import RightSidebar from '../components/home/RightSidebar'
import { useState, useRef } from 'react'
import { Entry } from '../lib/api/entriesApi'
import { Topic } from '../lib/api/topicsApi'

export default function Home() {
    const { isAuthenticated, user } = useAuth()
    const [topics, setTopics] = useState<Topic[]>([])
    const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
    const centerWorkspaceRef = useRef<{ refreshEntries: () => void } | null>(null)
    const [showRightSidebar, setShowRightSidebar] = useState(true)

    const handleEntryAdded = (entry: Entry) => {
        if (!selectedTopicId || entry.topic_id === selectedTopicId) {
            centerWorkspaceRef.current?.refreshEntries()
        }
    }

    const handleTopicCreated = (newTopic: Topic) => {
        setTopics(prevTopics => [...prevTopics, newTopic])
    }

    if (!isAuthenticated) {
        return (
            <div className="h-screen flex items-center justify-center dark:bg-gray-900">
                <div className="text-center">
                    <h1 className="text-3xl font-bold dark:text-white">
                        Welcome to Cognify
                    </h1>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col dark:bg-gray-900">
            {/* Top Bar */}
            <div className="flex-none">
                <TopBar onEntryAdded={handleEntryAdded} onTopicCreated={handleTopicCreated} />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex min-h-0">
                {/* Left Sidebar */}
                <aside className="w-64 flex-none border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                    <LeftSidebar
                        onSelectTopic={setSelectedTopicId}
                        selectedTopicId={selectedTopicId}
                        topics={topics}
                        onTopicsChange={setTopics}
                        onEntryMoved={() => {
                            centerWorkspaceRef.current?.refreshEntries()
                        }}
                    />
                </aside>

                {/* Center Content */}
                <main className={`flex-1 min-w-0 overflow-hidden flex`}>
                    <div className="flex-1">
                        <CenterWorkspace 
                            ref={centerWorkspaceRef}
                            selectedTopicId={selectedTopicId} 
                        />
                    </div>
                    
                    {/* Toggle Button */}
                    <div className="flex-none border-l border-gray-200 dark:border-gray-700 flex items-center">
                        <button
                            onClick={() => setShowRightSidebar(!showRightSidebar)}
                            className="p-1 -ml-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow"
                            title={showRightSidebar ? "Hide AI Assistant" : "Show AI Assistant"}
                        >
                            <svg 
                                className="w-4 h-4 text-gray-600 dark:text-gray-300" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d={showRightSidebar 
                                        ? "M9 5l7 7-7 7"  // chevron-right when sidebar is visible
                                        : "M15 19l-7-7 7-7" // chevron-left when sidebar is hidden
                                    }
                                />
                            </svg>
                        </button>
                    </div>

                    {/* Right Sidebar with conditional rendering */}
                    {showRightSidebar && (
                        <aside className="w-80 flex-none border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
                            <RightSidebar />
                        </aside>
                    )}
                </main>
            </div>
        </div>
    )
} 