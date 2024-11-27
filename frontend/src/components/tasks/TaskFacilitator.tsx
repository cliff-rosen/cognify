import { useState } from 'react';

export default function TaskFacilitator() {
    const [taskInput, setTaskInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    return (
        <div className="h-full flex flex-col">
            {/* Task Input Area */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <textarea
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    placeholder="Describe your task..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             dark:bg-gray-700 dark:text-white resize-none"
                    rows={3}
                />
                <div className="mt-3 flex justify-between items-center">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        AI will analyze and suggest the best way to handle your task
                    </div>
                    <button
                        onClick={() => setIsAnalyzing(true)}
                        disabled={!taskInput.trim() || isAnalyzing}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg 
                                 hover:bg-blue-600 disabled:bg-gray-400 
                                 disabled:cursor-not-allowed"
                    >
                        {isAnalyzing ? 'Not yet implemented...' : 'Analyze Task'}
                    </button>
                </div>
            </div>

            {/* Task Analysis Results */}
            <div className="flex-1 overflow-y-auto p-4">
                {isAnalyzing ? (
                    <div className="space-y-4">
                        <div className="animate-pulse space-y-3">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400">
                        Enter your task above to get started
                    </div>
                )}
            </div>

            {/* Available Connectors */}
            <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Available Connectors
                </h3>
                <div className="flex flex-wrap gap-2">
                    {/* Example connector badges */}
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Desktop
                    </span>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        Email
                    </span>
                    {/* Add more connector badges */}
                </div>
            </div>
        </div>
    );
} 