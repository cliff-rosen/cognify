import { useState, useEffect } from 'react';
import {
    UNCATEGORIZED_TOPIC_ID,
    ALL_TOPICS_TOPIC_ID,
    Topic,
    UncategorizedTopic,
    AllTopicsTopic
} from '../../lib/api/topicsApi';
import { Entry, entriesApi } from '../../lib/api/entriesApi';
import TaskFacilitator from '../tasks/TaskFacilitator';
import ChatArea from '../chat/ChatArea';
import CategorizeAssistant from '../categorize/CategorizeAssistant';

interface RightSidebarProps {
    currentTopic: Topic | UncategorizedTopic | AllTopicsTopic | null;
    onEntriesMoved?: () => void;
    onTopicsChanged?: () => void;
}

type AssistantMode = 'chat' | 'categorize' | 'facilitate';

export default function RightSidebar({ currentTopic, onEntriesMoved, onTopicsChanged }: RightSidebarProps) {
    const [mode, setMode] = useState<AssistantMode>('chat');
    const [entries, setEntries] = useState<Entry[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchEntries = async () => {
        if (currentTopic?.topic_id !== UNCATEGORIZED_TOPIC_ID) return;
        
        setIsLoading(true);
        try {
            const fetchedEntries = await entriesApi.getEntries(UNCATEGORIZED_TOPIC_ID);
            setEntries(fetchedEntries);
        } catch (error) {
            console.error('Error fetching entries:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (mode === 'categorize') {
            fetchEntries();
        }
    }, [mode, currentTopic?.topic_id]);

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
            {/* Header with Tabs */}
            <div className="shrink-0 border-b border-gray-200 dark:border-gray-700">
                <div className="px-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold dark:text-white py-4">
                        AI Assistant
                    </h2>
                    <div className="flex space-x-8">
                        <button
                            onClick={() => setMode('chat')}
                            className={`py-4 px-2 relative ${mode === 'chat'
                                ? 'text-blue-500 dark:text-blue-400'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            <span>Chat</span>
                            {mode === 'chat' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 dark:bg-blue-400"></div>
                            )}
                        </button>
                        <button
                            onClick={() => setMode('categorize')}
                            className={`py-4 px-2 relative ${mode === 'categorize'
                                ? 'text-blue-500 dark:text-blue-400'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            <span>Auto Categorize</span>
                            {mode === 'categorize' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 dark:bg-blue-400"></div>
                            )}
                        </button>
                        <button
                            onClick={() => setMode('facilitate')}
                            className={`py-4 px-2 relative ${mode === 'facilitate'
                                ? 'text-blue-500 dark:text-blue-400'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            <span>Facilitate</span>
                            {mode === 'facilitate' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 dark:bg-blue-400"></div>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mode Content */}
            <div className="flex-1 overflow-y-auto">
                {mode === 'chat' && (
                    <ChatArea currentTopic={currentTopic} />
                )}

                {mode === 'categorize' && currentTopic?.topic_id === UNCATEGORIZED_TOPIC_ID && (
                    <CategorizeAssistant
                        entries={entries}
                        onEntriesMoved={onEntriesMoved}
                        onTopicsChanged={onTopicsChanged}
                        refreshEntries={fetchEntries}
                    />
                )}

                {mode === 'categorize' && currentTopic?.topic_id !== UNCATEGORIZED_TOPIC_ID && (
                    <div className="p-4 text-gray-500 dark:text-gray-400">
                        Categorization is only available in the Uncategorized view.
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
        </div>
    );
} 