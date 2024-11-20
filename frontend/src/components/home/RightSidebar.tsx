import React from 'react'

const RightSidebar: React.FC = () => {
    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex-none p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold dark:text-white">AI Assistant</h2>
            </div>
            
            {/* Coming Soon Message */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center space-y-4">
                    <div className="inline-block p-3 bg-blue-50 dark:bg-blue-900/30 rounded-full">
                        <svg 
                            className="w-8 h-8 text-blue-500 dark:text-blue-400" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                            />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            Chat Coming Soon!
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-4">
                            Soon you'll be able to chat with our AI assistant to analyze your thoughts, 
                            get insights, and organize your topics more effectively.
                        </p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">
                            Tip: You can collapse this panel using the arrow button on the left
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RightSidebar 