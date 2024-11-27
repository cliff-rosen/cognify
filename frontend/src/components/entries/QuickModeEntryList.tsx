import { Entry } from '../../lib/api/entriesApi';
import { QuickCategorizeUncategorizedResponse } from '../../lib/api/topicsApi';

interface QuickModeEntryListProps {
    entries: Entry[];
    selectedEntries: Set<number>;
    onEntrySelect: (entryId: number) => void;
    onSelectAll: () => void;
    onCancel: () => void;
    categorySuggestions: QuickCategorizeUncategorizedResponse | null;
    isLoading?: boolean;
    loadingText?: string;
    onAcceptSuggestion?: (entryId: number, topicId: number | null, topicName: string, isNew: boolean) => void;
    onRejectSuggestion?: (entryId: number, topicId: number | null, topicName: string, isNew: boolean) => void;
    isInPlaceCategorizing: boolean;
    onProposeCategorization: () => void;
    onAcceptAllSuggestions: () => void;
    onClearSuggestions: () => void;
}

const QuickModeEntryList = ({
    entries,
    selectedEntries,
    onEntrySelect,
    onSelectAll,
    onCancel,
    categorySuggestions,
    isLoading,
    loadingText,
    onAcceptSuggestion,
    onRejectSuggestion,
    isInPlaceCategorizing,
    onProposeCategorization,
    onAcceptAllSuggestions,
    onClearSuggestions,
}: QuickModeEntryListProps) => {
    if (entries.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No uncategorized entries
            </div>
        );
    }

    const handleAcceptSuggestion = (
        entryId: number,
        topicId: number | null,
        topicName: string,
        isNew: boolean
    ) => {
        onAcceptSuggestion?.(entryId, topicId, topicName, isNew);
    };

    const handleRejectSuggestion = (
        entryId: number,
        topicId: number | null,
        topicName: string,
        isNew: boolean
    ) => {
        onRejectSuggestion?.(entryId, topicId, topicName, isNew);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={selectedEntries.size === entries.length && entries.length > 0}
                        onChange={onSelectAll}
                        className="h-4 w-4 text-blue-500 rounded border-gray-300 
                                 focus:ring-blue-500 dark:border-gray-600 
                                 dark:focus:ring-blue-600"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                        Select All ({selectedEntries.size}/{entries.length})
                    </span>
                </div>
                <button
                    onClick={onCancel}
                    className="text-sm text-gray-500 hover:text-gray-700 
                             dark:text-gray-400 dark:hover:text-gray-200"
                >
                    Cancel
                </button>
            </div>

            {/* Entry List */}
            {entries.map(entry => (
                <div
                    key={entry.entry_id}
                    className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 
                             rounded-lg shadow hover:shadow-md transition-shadow"
                >
                    <input
                        type="checkbox"
                        checked={selectedEntries.has(entry.entry_id)}
                        onChange={() => onEntrySelect(entry.entry_id)}
                        className="mt-1 h-4 w-4 text-blue-500 rounded border-gray-300 
                                 focus:ring-blue-500 dark:border-gray-600 
                                 dark:focus:ring-blue-600"
                    />
                    <div className="flex-1">
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {entry.content}
                        </p>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(entry.creation_date).toLocaleString()}
                        </span>

                        {/* Show suggestions if available */}
                        {categorySuggestions && (
                            <div className="mt-3 space-y-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                                <div className="text-sm font-medium text-yellow-700/80 dark:text-yellow-200/90 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    <span>Suggested Categories</span>
                                </div>

                                {/* Existing Topic Suggestions */}
                                {categorySuggestions.existing_topic_assignments
                                    .filter(topic => topic.entries.some(e => e.entry_id === entry.entry_id))
                                    .map(topic => (
                                        topic.entries
                                            .filter(e => e.entry_id === entry.entry_id)
                                            .map(entryAssignment => (
                                                <div key={`${topic.topic_id}-${entryAssignment.entry_id}`}
                                                    className="group flex items-center gap-1 px-3 py-1.5 
                                                              bg-gray-50 dark:bg-gray-700/50 
                                                              border border-gray-200 dark:border-gray-600
                                                              rounded-md hover:shadow-sm transition-all"
                                                >
                                                    <div className="flex flex-col flex-1">
                                                        <span className="text-sm font-medium text-yellow-700/80 dark:text-yellow-200/90">
                                                            {topic.topic_name}
                                                        </span>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <div className="h-1 w-16 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-blue-500 rounded-full"
                                                                    style={{ width: `${entryAssignment.confidence * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                {Math.round(entryAssignment.confidence * 100)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleAcceptSuggestion(
                                                                entry.entry_id,
                                                                topic.topic_id,
                                                                topic.topic_name,
                                                                false
                                                            )}
                                                            className="p-1 text-green-600 hover:text-green-700 
                                                                     dark:text-green-500 dark:hover:text-green-400
                                                                     hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                                            title="Accept"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectSuggestion(
                                                                entry.entry_id,
                                                                topic.topic_id,
                                                                topic.topic_name,
                                                                false
                                                            )}
                                                            className="p-1 text-red-600 hover:text-red-700
                                                                     dark:text-red-500 dark:hover:text-red-400
                                                                     hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                            title="Reject"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                    ))}

                                {/* New Topic Suggestions */}
                                {categorySuggestions.new_topic_proposals
                                    .filter(topic => topic.entries.some(e => e.entry_id === entry.entry_id))
                                    .map(topic => (
                                        topic.entries
                                            .filter(e => e.entry_id === entry.entry_id)
                                            .map(entryAssignment => (
                                                <div key={`new-${topic.suggested_name}-${entryAssignment.entry_id}`}
                                                    className="group flex items-center gap-1 px-3 py-1.5 
                                                              bg-gray-50 dark:bg-gray-700/50 
                                                              border border-gray-200 dark:border-gray-600
                                                              rounded-md hover:shadow-sm transition-all"
                                                >
                                                    <div className="flex flex-col flex-1">
                                                        <span className="text-sm font-medium text-yellow-700/80 dark:text-yellow-200/90">
                                                            {topic.suggested_name}
                                                            <span className="ml-1.5 text-xs text-green-500 bg-green-50 
                                                                   dark:bg-green-900/20 px-1.5 py-0.5 rounded">
                                                                new
                                                            </span>
                                                        </span>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <div className="h-1 w-16 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-blue-500 rounded-full"
                                                                    style={{ width: `${entryAssignment.confidence * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                {Math.round(entryAssignment.confidence * 100)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleAcceptSuggestion(
                                                                entry.entry_id,
                                                                null,
                                                                topic.suggested_name,
                                                                true
                                                            )}
                                                            className="p-1 text-green-600 hover:text-green-700 
                                                                     dark:text-green-500 dark:hover:text-green-400
                                                                     hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                                            title="Accept"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectSuggestion(
                                                                entry.entry_id,
                                                                null,
                                                                topic.suggested_name,
                                                                true
                                                            )}
                                                            className="p-1 text-red-600 hover:text-red-700
                                                                     dark:text-red-500 dark:hover:text-red-400
                                                                     hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                            title="Reject"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                    ))}
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Bottom Actions Bar */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-4 border-t 
                          border-gray-200 dark:border-gray-700 mt-4 flex justify-between gap-3">
                <div className="flex gap-3">
                    {categorySuggestions && (
                        <>
                            <button
                                onClick={onAcceptAllSuggestions}
                                disabled={isInPlaceCategorizing || selectedEntries.size === 0}
                                className="px-4 py-2 bg-green-500 text-white rounded-md 
                                         hover:bg-green-600 disabled:bg-gray-400 
                                         disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                Accept All Selected ({selectedEntries.size})
                            </button>
                            <button
                                onClick={onClearSuggestions}
                                disabled={isInPlaceCategorizing}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 
                                         hover:text-gray-800 dark:hover:text-gray-200 
                                         border border-gray-300 dark:border-gray-600 
                                         rounded-md transition-colors duration-150
                                         disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Clear Suggestions
                            </button>
                        </>
                    )}
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 
                                 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 
                                 rounded-md transition-colors duration-150"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onProposeCategorization}
                        disabled={isInPlaceCategorizing}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md 
                                 hover:bg-blue-600 disabled:bg-gray-400 
                                 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isInPlaceCategorizing && (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10"
                                    stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        )}
                        Propose Categories for All Entries
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuickModeEntryList; 