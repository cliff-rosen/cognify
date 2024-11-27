import { Entry } from '../../lib/api/entriesApi';

interface TaskEntryListProps {
    entries: Entry[];
    selectedEntries: Set<number>;
    onEntrySelect: (entryId: number) => void;
    onSelectAll: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    loadingText?: string;
    onAnalyzeTasks: () => void;
}

export default function TaskEntryList({
    entries,
    selectedEntries,
    onEntrySelect,
    onSelectAll,
    onCancel,
    isLoading,
    loadingText,
    onAnalyzeTasks
}: TaskEntryListProps) {
    if (entries.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No entries to analyze
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Selection Header */}
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
                    </div>
                </div>
            ))}

            {/* Bottom Actions Bar */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-4 border-t 
                          border-gray-200 dark:border-gray-700 mt-4 flex justify-between gap-3">
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 
                                 hover:text-gray-800 dark:hover:text-gray-200 
                                 border border-gray-300 dark:border-gray-600 rounded-md"
                    >
                        Cancel
                    </button>
                </div>
                <button
                    onClick={onAnalyzeTasks}
                    disabled={isLoading || selectedEntries.size === 0}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md 
                             hover:bg-blue-600 disabled:bg-gray-400 
                             disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isLoading && (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10"
                                stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    )}
                    Analyze Tasks
                </button>
            </div>
        </div>
    );
} 