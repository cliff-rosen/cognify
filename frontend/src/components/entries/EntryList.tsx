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
                    draggable={editingEntryId !== entry.entry_id}
                    onDragStart={(e) => onDragStart(e, entry)}
                    onDragEnd={onDragEnd}
                >
                    <div className="flex-1">
                        {editingEntryId === entry.entry_id ? (
                            <div className="space-y-3">
                                <textarea
                                    value={editingContent}
                                    onChange={(e) => setEditingContent(e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 
                                             rounded-md bg-white dark:bg-gray-700 
                                             text-gray-700 dark:text-gray-300
                                             focus:border-blue-500 dark:focus:border-blue-400
                                             focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                                    rows={3}
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={handleCancelEdit}
                                        className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 
                                                 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleSaveEdit(entry.entry_id)}
                                        className="px-3 py-1.5 text-sm text-white bg-blue-500 
                                                 hover:bg-blue-600 rounded-md"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {entry.content}
                                </p>
                                <div className="mt-2 flex justify-between items-center">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {new Date(entry.creation_date).toLocaleString()}
                                    </span>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                        <button
                                            onClick={() => handleStartEdit(entry)}
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
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default EntryList; 