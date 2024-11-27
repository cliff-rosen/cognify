import { useState } from 'react';
import {
    UNCATEGORIZED_TOPIC_ID,
    ALL_TOPICS_TOPIC_ID,
    Topic,
    UncategorizedTopic,
    AllTopicsTopic
} from '../../lib/api/topicsApi';
import TaskFacilitator from '../tasks/TaskFacilitator';
import ChatArea from '../chat/ChatArea';

interface RightSidebarProps {
    currentTopic: Topic | UncategorizedTopic | AllTopicsTopic | null;
}

type AssistantMode = 'chat' | 'categorize' | 'facilitate';

export default function RightSidebar({ currentTopic }: RightSidebarProps) {
    const [mode, setMode] = useState<AssistantMode>('chat');

    if (!currentTopic) {
        return (
            <div className="h-full flex flex-col bg-white dark:bg-gray-800">
                <div className="shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold dark:text-white">
                            Select a Topic
                        </h2>
                    </div>
                </div>
                <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    Please select a topic from the sidebar
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-800">
            {/* AI Assistant Header */}
            <div className="shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold dark:text-white">
                        AI Assistant
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setMode('chat')}
                            className={`px-3 py-1.5 rounded-lg transition-colors ${mode === 'chat'
                                ? 'bg-blue-500 text-white'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                        >
                            Chat
                        </button>
                        <button
                            onClick={() => setMode('categorize')}
                            className={`px-3 py-1.5 rounded-lg transition-colors ${mode === 'categorize'
                                ? 'bg-blue-500 text-white'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                        >
                            Auto Categorize
                        </button>
                        <button
                            onClick={() => setMode('facilitate')}
                            className={`px-3 py-1.5 rounded-lg transition-colors ${mode === 'facilitate'
                                ? 'bg-blue-500 text-white'
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                        >
                            Facilitate
                        </button>
                    </div>
                </div>
            </div>

            {/* Mode Content */}
            {mode === 'chat' && (
                <ChatArea currentTopic={currentTopic} />
            )}

            {mode === 'categorize' && (
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 text-gray-500 dark:text-gray-400">
                        Auto-categorize mode coming soon...
                    </div>
                </div>
            )}

            {mode === 'facilitate' && (
                <TaskFacilitator
                    currentTopic={currentTopic?.topic_id === ALL_TOPICS_TOPIC_ID ? null :
                        currentTopic?.topic_id === UNCATEGORIZED_TOPIC_ID ? null :
                            currentTopic as Topic}
                />
            )}
        </div>
    );
} 