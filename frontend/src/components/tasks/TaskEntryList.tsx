import { Entry, TaskAnalysis } from '../../lib/api/entriesApi';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useState } from 'react';

interface TaskEntryListProps {
    entries: Entry[];
    selectedEntries: Set<number>;
    onEntrySelect: (entryId: number) => void;
    onSelectAll: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    loadingText?: string;
    onAnalyzeTasks: () => void;
    analysisResults?: TaskAnalysis[];
}

function TaskAnalysisCard({ analysis }: { analysis: TaskAnalysis }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
            {/* Task Content and Scores */}
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {analysis.content}
                    </p>
                    <div className="flex gap-4 mt-2">
                        <div className="text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Complexity: </span>
                            <span className="text-gray-700 dark:text-gray-300">
                                {Math.round(analysis.complexity_score * 100)}%
                            </span>
                        </div>
                        <div className="text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Priority: </span>
                            <span className="text-gray-700 dark:text-gray-300">
                                {Math.round(analysis.priority_score * 100)}%
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 
                             dark:hover:text-gray-200 p-1"
                >
                    {isExpanded ? (
                        <IconChevronDown className="w-5 h-5" />
                    ) : (
                        <IconChevronRight className="w-5 h-5" />
                    )}
                </button>
            </div>

            {/* Facilitation Options */}
            {isExpanded && (
                <div className="space-y-4 mt-4 pl-4 border-l-2 border-blue-100 dark:border-blue-900">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Facilitation Options
                    </h4>
                    {analysis.facilitate_options.map((option, index) => (
                        <div key={index} className="space-y-2">
                            <div className="flex justify-between items-start">
                                <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                                    {option.option_type.replace('_', ' ')}
                                </h5>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {Math.round(option.confidence_score * 100)}% confidence
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {option.description}
                            </p>
                            {option.requirements.length > 0 && (
                                <div className="text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Requirements: </span>
                                    <span className="text-gray-600 dark:text-gray-400">
                                        {option.requirements.join(', ')}
                                    </span>
                                </div>
                            )}
                            <div className="text-sm">
                                <span className="text-gray-500 dark:text-gray-400">Impact: </span>
                                <span className="text-gray-600 dark:text-gray-400">
                                    {option.estimated_impact}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function TaskEntryList({
    entries,
    selectedEntries,
    onEntrySelect,
    onSelectAll,
    onCancel,
    isLoading,
    onAnalyzeTasks,
    analysisResults
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

            {/* Entry List or Analysis Results */}
            {analysisResults ? (
                <div className="space-y-4">
                    {analysisResults.map(analysis => (
                        <TaskAnalysisCard key={analysis.entry_id} analysis={analysis} />
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
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
                </div>
            )}

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
                {!analysisResults && (
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
                )}
            </div>
        </div>
    );
} 