import React, { useState } from 'react'

const RightSidebar: React.FC = () => {
    const [message, setMessage] = useState('')

    return (
        <div className="flex flex-col h-full">
            {/* Header - Fixed */}
            <div className="flex-none p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold dark:text-white">AI Assistant</h2>
            </div>
            
            {/* Messages - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                        <p className="dark:text-white">How can I help you today?</p>
                    </div>
                </div>
            </div>
            
            {/* Input Area - Fixed */}
            <div className="flex-none p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 
                                 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                    <button 
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg 
                                 hover:bg-blue-600 transition-colors"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    )
}

export default RightSidebar 