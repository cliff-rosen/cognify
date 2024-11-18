import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import TopBar from '../components/home/TopBar'
import LeftSidebar from '../components/home/LeftSidebar'
import CenterWorkspace from '../components/home/CenterWorkspace'
import RightSidebar from '../components/home/RightSidebar'
import { useState, useRef } from 'react'
import { Entry } from '../lib/api/entriesApi'

export default function Home() {
    const { isAuthenticated, user } = useAuth()
    const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
    const centerWorkspaceRef = useRef<{ refreshEntries: () => void } | null>(null)

    const handleEntryAdded = (entry: Entry) => {
        // Only refresh if:
        // 1. We're in dashboard view (selectedTopicId is null) OR
        // 2. The new entry belongs to the currently selected topic
        if (!selectedTopicId || entry.topic_id === selectedTopicId) {
            centerWorkspaceRef.current?.refreshEntries()
        }
    }

    if (!isAuthenticated) {
        return (
            <div className="flex h-full items-center justify-center dark:bg-gray-900">
                <div className="text-center">
                    <h1 className="text-3xl font-bold dark:text-white">
                        Welcome to Cognify
                    </h1>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col dark:bg-gray-900">
            {/* Top Section */}
            <div className="flex-none">
                <TopBar onEntryAdded={handleEntryAdded} />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex h-[calc(100%-64px)]">
                {/* Left Sidebar */}
                <div className="w-64 flex border-r border-gray-200 dark:border-gray-700">
                    <LeftSidebar
                        onSelectTopic={setSelectedTopicId}
                        selectedTopicId={selectedTopicId}
                    />
                </div>

                {/* Center Workspace */}
                <div className="flex-1 flex">
                    <CenterWorkspace 
                        ref={centerWorkspaceRef}
                        selectedTopicId={selectedTopicId} 
                    />
                </div>

                {/* Right Sidebar */}
                <div className="w-80 flex border-l border-gray-200 dark:border-gray-700">
                    <RightSidebar />
                </div>
            </div>
        </div>
    )
} 