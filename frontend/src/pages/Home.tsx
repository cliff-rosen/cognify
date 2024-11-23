import { useAuth } from '../context/AuthContext'
import TopBar from '../components/home/TopBar'
import LeftSidebar from '../components/home/LeftSidebar'
import CenterWorkspace from '../components/home/CenterWorkspace'
import RightSidebar from '../components/home/RightSidebar'
import { useState, useRef } from 'react'
import { Entry } from '../lib/api/entriesApi'
import { Topic, UNCATEGORIZED_TOPIC_ID, UncategorizedTopic, topicsApi } from '../lib/api/topicsApi'
import LoginForm from '../components/auth/LoginForm'

export default function HomeComponent() {
    const { isAuthenticated, login, register, error } = useAuth()
    const [topics, setTopics] = useState<(Topic | UncategorizedTopic)[]>([])
    const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
    const centerWorkspaceRef = useRef<{ refreshEntries: () => void } | null>(null)
    const [showRightSidebar, setShowRightSidebar] = useState(true)
    const [isRegistering, setIsRegistering] = useState(false)

    const handleEntryAdded = (entry: Entry) => {
        if (selectedTopicId === null ||
            selectedTopicId === entry.topic_id ||
            (selectedTopicId === UNCATEGORIZED_TOPIC_ID && entry.topic_id === null)) {
            centerWorkspaceRef.current?.refreshEntries()
        }
    }

    const handleTopicCreated = (newTopic: Topic) => {
        setTopics(prevTopics => [...prevTopics, newTopic])
    }

    const refreshTopics = async () => {
        try {
            const fetchedTopics = await topicsApi.getTopics();
            setTopics(fetchedTopics);
        } catch (error) {
            console.error('Error refreshing topics:', error);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 bg-gray-50">
                <LoginForm
                    isRegistering={isRegistering}
                    setIsRegistering={setIsRegistering}
                    login={login}
                    register={register}
                    error={error}
                />
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col dark:bg-gray-900">
            {/* Top Bar */}
            <div className="flex-none">
                <TopBar onEntryAdded={handleEntryAdded} onTopicCreated={handleTopicCreated} onTopicsChanged={refreshTopics} />
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
                <main className="flex-1 min-w-0 overflow-hidden flex min-h-0">
                    <div className="flex-1">
                        <CenterWorkspace
                            ref={centerWorkspaceRef}
                            selectedTopicId={selectedTopicId}
                            onEntriesMoved={() => {
                                centerWorkspaceRef.current?.refreshEntries();
                            }}
                            onTopicsChanged={refreshTopics}
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
                        <aside className="w-80 flex-none border-l border-gray-200 dark:border-gray-700">
                            <RightSidebar />
                        </aside>
                    )}
                </main>
            </div>
        </div>
    )
} 