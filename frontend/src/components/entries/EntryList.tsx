import { Entry } from '../../lib/api/entriesApi';
import { DragEvent } from 'react';

interface EntryListProps {
    entries: Entry[];
    onDragStart: (e: DragEvent<HTMLDivElement>, entry: Entry) => void;
    onDragEnd: (e: DragEvent<HTMLDivElement>) => void;
    onDelete: (entry: Entry) => void;
    isQuickMode?: boolean;
    selectedEntries?: Set<number>;
    onEntrySelect?: (entryId: number) => void;
    emptyMessage?: string;
}

const EntryList = ({ 
    entries, 
    onDragStart, 
    onDragEnd, 
    onDelete,
    isQuickMode = false,
    selectedEntries = new Set(),
    onEntrySelect,
    emptyMessage = "No entries found"
}: EntryListProps) => {
    if (entries.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {entries.map(entry => (
                <div
                    key={entry.entry_id}
                    className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow group relative cursor-move"
                    draggable="true"
                    onDragStart={(e) => onDragStart(e, entry)}
                    onDragEnd={onDragEnd}
                >
                    <div className="flex gap-3">
                        {isQuickMode && onEntrySelect && (
                            <input
                                type="checkbox"
                                checked={selectedEntries.has(entry.entry_id)}
                                onChange={() => onEntrySelect(entry.entry_id)}
                                className="mt-1 h-4 w-4 text-blue-500 rounded border-gray-300 
                                         focus:ring-blue-500 dark:border-gray-600 
                                         dark:focus:ring-blue-600"
                            />
                        )}
                        <div className="flex-1">
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {entry.content}
                            </p>
                            <div className="mt-2 flex justify-between items-center">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {new Date(entry.creation_date).toLocaleString()}
                                </span>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button
                                        className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                        title="Edit entry"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => onDelete(entry)}
                                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                        title="Delete entry"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default EntryList; 