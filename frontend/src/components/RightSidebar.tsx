import {
    Topic,
    UncategorizedTopic,
    AllTopicsTopic
} from '../lib/api/topicsApi';
import ChatArea from './chat/ChatArea';

interface RightSidebarProps {
    currentTopic: Topic | UncategorizedTopic | AllTopicsTopic | null;
}


export default function RightSidebar({ currentTopic }: RightSidebarProps) {

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
                    <ChatArea currentTopic={currentTopic} />
                </div>
            </div>
        </div>
    );
} 