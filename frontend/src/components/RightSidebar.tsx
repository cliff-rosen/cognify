import { useState, useEffect } from 'react';
import {
    UNCATEGORIZED_TOPIC_ID,
    Topic,
    UncategorizedTopic,
    AllTopicsTopic
} from '../lib/api/topicsApi';
import { Entry, entriesApi } from '../lib/api/entriesApi';
import TaskFacilitator from './tasks/TaskFacilitator';
import ChatArea from './chat/ChatArea';
import CategorizeAssistant from './categorize/CategorizeAssistant';

// interface RightSidebarProps {
//     currentTopic: Topic | UncategorizedTopic | AllTopicsTopic | null;
//     onEntriesMoved?: () => void;
//     onTopicsChanged?: () => void;
// }

// type AssistantMode = 'chat' | 'categorize' | 'facilitate';

export default function RightSidebar({ currentTopic, onEntriesMoved, onTopicsChanged }: RightSidebarProps) {
    const [mode, setMode] = useState<AssistantMode>('chat');
    const [entries, setEntries] = useState<Entry[]>([]);
    const [_isLoading, setIsLoading] = useState(false);

    const fetchEntries = async () => {
        console.log('fetchEntries called');

        if (mode === 'categorize' && currentTopic?.topic_id !== UNCATEGORIZED_TOPIC_ID) return;

        let topicId
        if (!currentTopic) {
            topicId = -1;  // -1 for all topics
        } else if (currentTopic.topic_id === UNCATEGORIZED_TOPIC_ID) {
            topicId = UNCATEGORIZED_TOPIC_ID;  // 0 for uncategorized
        } else {
            topicId = currentTopic.topic_id;  // specific topic id
        }


        setIsLoading(true);
        try {
            const fetchedEntries = await entriesApi.getEntries(topicId);
            setEntries(fetchedEntries);
        } catch (error) {
            console.error('Error fetching entries:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (mode === 'categorize' || mode === 'facilitate') {
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
            {/* Header with Tabs commented out ... */}

            {/* Mode Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full overflow-y-auto">
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
                        <TaskFacilitator entries={entries} />
                    )}
                </div>
            </div>
        </div>
    );
} 