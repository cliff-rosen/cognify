import { useState, useRef, useEffect } from 'react';
import { ChatThread, chatApi } from '../../lib/api/chatApi';

interface ChatControlsProps {
    currentThread: ChatThread | null;
    chatThreads: ChatThread[];
    onNewChat: () => void;
    onArchiveThread: () => void;
    onThreadSelect: (thread: ChatThread) => void;
    onThreadRename: (threadId: number, newTitle: string) => void;
}

export default function ChatControls({
    currentThread,
    chatThreads,
    onNewChat,
    onArchiveThread,
    onThreadSelect,
    onThreadRename
}: ChatControlsProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);

    // Add click-outside handler for dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-focus input when editing starts
    useEffect(() => {
        if (isEditing && editInputRef.current) {
            editInputRef.current.focus();
        }
    }, [isEditing]);

    return (
        <>
            {/* Chat Controls */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={onNewChat}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg 
                             bg-blue-500 text-white hover:bg-blue-600 
                             transition-colors duration-200"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New
                </button>
                <button
                    onClick={onArchiveThread}
                    disabled={!currentThread}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-lg 
                              transition-colors duration-200
                              ${!currentThread
                            ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-14 0l2-2h10l2 2" />
                    </svg>
                    Archive
                </button>
            </div>

            {/* Thread Dropdown */}
            <div className="relative shrink-0" ref={dropdownRef}>
                <div className="w-full flex items-center justify-between gap-2 px-4 py-3 
                        border-b border-gray-200 dark:border-gray-700">
                    {isEditing && currentThread ? (
                        <form
                            className="flex-1 flex items-center gap-2"
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (currentThread && editTitle.trim()) {
                                    onThreadRename(currentThread.thread_id, editTitle.trim());
                                    setIsEditing(false);
                                }
                            }}
                        >
                            <input
                                ref={editInputRef}
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="flex-1 bg-white dark:bg-gray-700 text-sm text-gray-700 
                                         dark:text-gray-300 rounded px-2 py-1 border border-gray-300 
                                         dark:border-gray-600 focus:outline-none focus:ring-2 
                                         focus:ring-blue-500"
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        setIsEditing(false);
                                    }
                                }}
                            />
                            <button
                                type="submit"
                                className="text-blue-500 hover:text-blue-600 p-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="text-gray-500 hover:text-gray-600 p-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </form>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex-1 flex items-center justify-between gap-2 
                                         hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2 py-1"
                            >
                                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                    {currentThread ? currentThread.title : 'Select Chat'}
                                </span>
                                <svg className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 
                                              ${isDropdownOpen ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {currentThread && (
                                <button
                                    onClick={() => {
                                        setEditTitle(currentThread.title);
                                        setIsEditing(true);
                                    }}
                                    className="p-1 text-gray-500 hover:text-gray-600 dark:text-gray-400 
                                             dark:hover:text-gray-300"
                                    title="Rename chat"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                            )}
                        </>
                    )}
                </div>

                {isDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-0 bg-white dark:bg-gray-800 
                          border-b border-gray-200 dark:border-gray-700 
                          shadow-lg z-10 max-h-[300px] overflow-y-auto">
                        {chatThreads.map(thread => (
                            <div
                                key={thread.thread_id}
                                onClick={() => {
                                    onThreadSelect(thread);
                                    setIsDropdownOpen(false);
                                }}
                                className={`p-3 cursor-pointer border-l-2 
                                  hover:bg-gray-50 dark:hover:bg-gray-700
                                  ${currentThread?.thread_id === thread.thread_id
                                        ? 'border-blue-500 bg-gray-50 dark:bg-gray-700'
                                        : 'border-transparent'}`}
                            >
                                <div className="font-medium text-gray-700 dark:text-gray-300 truncate">
                                    {thread.title}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {chatApi.formatChatTimestamp(thread.last_message_at)}
                                </div>
                            </div>
                        ))}
                        {chatThreads.length === 0 && (
                            <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                                No chat threads yet
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
} 