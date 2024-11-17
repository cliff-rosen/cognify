import React, { useState } from 'react'

const TopBar: React.FC = () => {
    const [thought, setThought] = useState('')

    const handleAddThought = () => {
        console.log('Adding thought:', thought)
        setThought('')
    }

    return (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-3xl mx-auto flex gap-2">
                <input
                    type="text"
                    value={thought}
                    onChange={(e) => setThought(e.target.value)}
                    placeholder="Add a new thought..."
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    onClick={handleAddThought}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                    Add Thought
                </button>
            </div>
        </div>
    )
}

export default TopBar 