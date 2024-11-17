import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import TopBar from '../components/home/TopBar'
import LeftSidebar from '../components/home/LeftSidebar'
import CenterWorkspace from '../components/home/CenterWorkspace'
import RightSidebar from '../components/home/RightSidebar'
import { useState } from 'react'

export default function Home() {
    const { isAuthenticated, user } = useAuth()
    const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)

    if (!isAuthenticated) {
        return (
            <div className="flex min-h-screen items-center justify-center dark:bg-gray-900">
                <div className="text-center">
                    <h1 className="text-3xl font-bold dark:text-white">
                        Welcome to Cognify
                    </h1>
                </div>
            </div>
        )
    }

    return (
        <div className="absolute inset-0 dark:bg-gray-900">
            {/* Top Section */}
            <div className="absolute top-0 left-0 right-0">
                <TopBar />
            </div>
            
            {/* Main Content Area */}
            <div className="absolute top-[73px] bottom-0 left-0 right-0 flex">
                {/* Left Sidebar */}
                <div className="w-64 border-r border-gray-200 dark:border-gray-700">
                    <LeftSidebar 
                        onSelectTopic={setSelectedTopicId}
                        selectedTopicId={selectedTopicId}
                    />
                </div>
                
                {/* Center Workspace */}
                <div className="flex-1">
                    <CenterWorkspace selectedTopicId={selectedTopicId} />
                </div>
                
                {/* Right Sidebar */}
                <div className="w-80 border-l border-gray-200 dark:border-gray-700">
                    <RightSidebar />
                </div>
            </div>
        </div>
    )
} 