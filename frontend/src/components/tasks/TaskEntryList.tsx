import { Entry, TaskAnalysis, TaskCategory } from '../../lib/api/entriesApi';
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

function TaskCategoryBadge({ category }: { category: TaskCategory }) {
    const colors = {
        plan: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        research: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        perform: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    };

    const labels = {
        plan: 'Plan',
        research: 'Research',
        perform: 'Perform'
    };

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[category]}`}>
            {labels[category]}
        </span>
    );
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

            {/* Categories */}
            <div className="flex gap-2">
                {analysis.categorization.categories.map((category, index) => (
                    <TaskCategoryBadge key={index} category={category} />
                ))}
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="space-y-4 mt-4 pl-4 border-l-2 border-blue-100 dark:border-blue-900">
                    {/* Rationale */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Rationale
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {analysis.categorization.rationale}
                        </p>
                    </div>

                    {/* Next Steps */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Next Steps
                        </h4>
                        <ul className="space-y-1">
                            {analysis.next_steps.map((step, index) => (
                                <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    {step}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Confidence Score */}
                    <div className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Confidence: </span>
                        <span className="text-gray-700 dark:text-gray-300">
                            {Math.round(analysis.categorization.confidence_score * 100)}%
                        </span>
                    </div>
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