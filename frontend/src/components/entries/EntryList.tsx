import { Entry } from '../../lib/api/entriesApi';
import { DragEvent, useState } from 'react';

interface EntryListProps {
    entries: Entry[];
    onDragStart: (e: DragEvent<HTMLDivElement>, entry: Entry) => void;
    onDragEnd: (e: DragEvent<HTMLDivElement>) => void;
    onDelete: (entry: Entry) => void;
    onEdit: (entryId: number, newContent: string) => Promise<void>;
    emptyMessage?: string;
}

const EntryList = ({ 
    entries, 
    onDragStart, 
    onDragEnd, 
    onDelete,
    onEdit,
    emptyMessage = "No entries found"
}: EntryListProps) => {
    const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
    const [editingContent, setEditingContent] = useState<string>('');

    const handleStartEdit = (entry: Entry) => {
        setEditingEntryId(entry.entry_id);
        setEditingContent(entry.content);
    };

    const handleCancelEdit = () => {
        setEditingEntryId(null);
        setEditingContent('');
    };

    const handleSaveEdit = async (entryId: number) => {
        try {
            await onEdit(entryId, editingContent);
            setEditingEntryId(null);
            setEditingContent('');
        } catch (err) {
            console.error('Error saving edit:', err);
            // TODO: Show error notification
        }
    };

    if (entries.length === 0) {
        return (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="space-y-1.5">
            {entries.map(entry => (
                <div
                    key={entry.entry_id}
                    className="px-2.5 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm group relative cursor-move
                             hover:shadow-md transition-shadow duration-200"
                    draggable={editingEntryId !== entry.entry_id}
                    onDragStart={(e) => onDragStart(e, entry)}
                    onDragEnd={onDragEnd}
                >
                    <div className="flex-1">
                        {editingEntryId === entry.entry_id ? (
                            <div className="space-y-1.5">
                                <textarea
                                    value={editingContent}
                                    onChange={(e) => setEditingContent(e.target.value)}
                                    className="w-full p-1.5 border border-gray-300 dark:border-gray-600 
                                             rounded-md bg-white dark:bg-gray-700 
                                             text-gray-700 dark:text-gray-300 text-sm
                                             focus:border-blue-500 dark:focus:border-blue-400
                                             focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                                    rows={3}
                                    autoFocus
                                />
                                <div className="flex justify-end gap-1.5">
                                    <button
                                        onClick={handleCancelEdit}
                                        className="px-2 py-0.5 text-sm text-gray-600 dark:text-gray-400 
                                                 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleSaveEdit(entry.entry_id)}
                                        className="px-2 py-0.5 text-sm text-white bg-blue-500 
                                                 hover:bg-blue-600 rounded"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        {entry.content}
                                    </p>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 block">
                                        {new Date(entry.creation_date).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                                    <button
                                        onClick={() => handleStartEdit(entry)}
                                        className="p-0.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400
                                                 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                        title="Edit entry"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => onDelete(entry)}
                                        className="p-0.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400
                                                 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                        title="Delete entry"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default EntryList; 