import CenterWorkspace from './CenterWorkspace'
import RightSidebar from './RightSidebar'
import { useState, useRef, forwardRef, useImperativeHandle } from 'react'
import { Entry } from '../lib/api/entriesApi'
import { Topic, UNCATEGORIZED_TOPIC_ID, ALL_TOPICS_TOPIC_ID, AllTopicsTopicValue, UncategorizedTopicValue, UncategorizedTopic } from '../lib/api/topicsApi'
import { topicsApi } from '../lib/api/topicsApi'

interface HomeProps {
    selectedTopicId: number | null;
    topics: (Topic | UncategorizedTopic)[];
    setTopics: (topics: (Topic | UncategorizedTopic)[]) => void;
}

export interface EntriesWorkspaceHandle {
    refreshEntries: () => void;
}

const EntriesWorkspace = forwardRef<EntriesWorkspaceHandle, HomeProps>(
    ({ selectedTopicId, topics, setTopics }, ref) => {
        const centerWorkspaceRef = useRef<{ refreshEntries: () => void } | null>(null)
        const [showRightSidebar, setShowRightSidebar] = useState(true)

        useImperativeHandle(ref, () => ({
            refreshEntries: () => centerWorkspaceRef.current?.refreshEntries()
        }))


        const refreshTopics = async () => {
            try {
                const fetchedTopics = await topicsApi.getTopics();
                setTopics(fetchedTopics);
            } catch (error) {
                console.error('Error refreshing topics:', error);
            }
        };

        const getCurrentTopic = () => {
            if (selectedTopicId === ALL_TOPICS_TOPIC_ID) {
                return AllTopicsTopicValue;
            }
            if (selectedTopicId === UNCATEGORIZED_TOPIC_ID) {
                return UncategorizedTopicValue;
            }
            return topics.find(t => t.topic_id === selectedTopicId) || null;
        };

        return (
            <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
                {/* Main Content Area */}
                <div className="flex-1 flex min-h-0">
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
                        <div className="w-6 flex-none flex items-center justify-center">
                            <button
                                onClick={() => setShowRightSidebar(!showRightSidebar)}
                                className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                                            ? "M9 5l7 7-7 7"
                                            : "M15 19l-7-7 7-7"
                                        }
                                    />
                                </svg>
                            </button>
                        </div>

                        {/* Right Sidebar */}
                        {showRightSidebar && (
                            <div className="pt-2 pr-2">
                                <aside className="w-[500px] flex-shrink-0 border-l border-gray-200 dark:border-gray-700 overflow-y-auto h-full">
                                    <RightSidebar
                                        currentTopic={getCurrentTopic()}
                                        onEntriesMoved={() => centerWorkspaceRef.current?.refreshEntries()}
                                        onTopicsChanged={refreshTopics}
                                    />
                                </aside>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        )
    }
);

export default EntriesWorkspace;