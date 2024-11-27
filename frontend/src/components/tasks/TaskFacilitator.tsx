import { useState } from 'react';
import { Entry } from '../../lib/api/entriesApi';
import QuickModeEntryList from '../entries/QuickModeEntryList';

interface TaskFacilitatorProps {
    entries: Entry[];
}

export default function TaskFacilitator({ entries }: TaskFacilitatorProps) {
    const [taskInput, setTaskInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const handleSelectionChange = (entryId: number) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (prev.has(entryId)) {
                newSet.delete(entryId);
            } else {
                newSet.add(entryId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.size === entries.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(entries.map(e => e.entry_id)));
        }
    };

    const handleCancel = () => {
        setSelectedIds(new Set());
        setIsAnalyzing(false);
    };

    const handleProposeCategorization = () => {
        setIsAnalyzing(true);
        // TODO: Implement task analysis
    };

    const handleAcceptAllSuggestions = () => {
        // TODO: Implement accepting all suggestions
    };

    const handleClearSuggestions = () => {
        setIsAnalyzing(false);
        setSelectedIds(new Set());
    };

    if (entries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="mb-6">
                    <svg className="w-16 h-16 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300">
                    No Tasks Available
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md">
                    Add some entries first to start analyzing tasks.
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-4">

            {/* Entry Selection List */}
            <div className="flex-1 overflow-y-auto">
                <QuickModeEntryList
                    entries={entries}
                    selectedEntries={selectedIds}
                    onEntrySelect={handleSelectionChange}
                    onSelectAll={handleSelectAll}
                    onCancel={handleCancel}
                    categorySuggestions={null}
                    isLoading={isAnalyzing}
                    loadingText="Analyzing tasks..."
                    isInPlaceCategorizing={false}
                    onProposeCategorization={handleProposeCategorization}
                    onAcceptAllSuggestions={handleAcceptAllSuggestions}
                    onClearSuggestions={handleClearSuggestions}
                />
            </div>

            {/* Available Connectors */}
            <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Available Connectors
                </h3>
                <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Desktop
                    </span>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        Email
                    </span>
                </div>
            </div>
        </div>
    );
} 