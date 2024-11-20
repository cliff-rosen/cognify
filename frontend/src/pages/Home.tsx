import { useAuth } from '../context/AuthContext'
import TopBar from '../components/home/TopBar'
import LeftSidebar from '../components/home/LeftSidebar'
import CenterWorkspace from '../components/home/CenterWorkspace'
import RightSidebar from '../components/home/RightSidebar'
import { useState, useRef } from 'react'
import { Entry } from '../lib/api/entriesApi'
import { Topic, UNCATEGORIZED_TOPIC_ID, UncategorizedTopic } from '../lib/api/topicsApi'

export default function HomeComponent() {
    const { isAuthenticated, login, register, error } = useAuth()
    const [topics, setTopics] = useState<(Topic | UncategorizedTopic)[]>([])
    const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
    const centerWorkspaceRef = useRef<{ refreshEntries: () => void } | null>(null)
    const [showRightSidebar, setShowRightSidebar] = useState(true)
    const [isRegistering, setIsRegistering] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: ''
    })
    const [passwordError, setPasswordError] = useState<string | null>(null)

    const handleEntryAdded = (entry: Entry) => {
        if (selectedTopicId === null ||
            selectedTopicId === entry.topic_id ||
            (selectedTopicId === UNCATEGORIZED_TOPIC_ID && entry.topic_id === null)) {
            centerWorkspaceRef.current?.refreshEntries()
        }
    }

    const handleTopicCreated = (newTopic: Topic) => {
        setTopics(prevTopics => [...prevTopics, newTopic])
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (isRegistering) {
            if (formData.password !== formData.confirmPassword) {
                setPasswordError("Passwords don't match")
                return
            }

            register.mutate(
                { email: formData.email, password: formData.password },
                {
                    onSuccess: () => {
                        setIsRegistering(false)
                        setFormData(prev => ({
                            ...prev,
                            password: '',
                            confirmPassword: ''
                        }))
                        setPasswordError(null)
                    }
                }
            )
        } else {
            login.mutate({ username: formData.email, password: formData.password })
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
        if (e.target.name === 'password' || e.target.name === 'confirmPassword') {
            setPasswordError(null)
        }
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 bg-gray-50">
                <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold dark:text-white mb-2">
                            Welcome to Cognify
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300">
                            {isRegistering ? 'Create your account' : 'Sign in to your account'}
                        </p>
                    </div>

                    {(error || passwordError) && (
                        <div className={`border px-4 py-3 rounded relative ${error?.includes('successful')
                            ? 'bg-green-100 border-green-400 text-green-700'
                            : 'bg-red-100 border-red-400 text-red-700'
                            }`}>
                            {passwordError || error}
                        </div>
                    )}

                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="rounded-md shadow-sm space-y-4">
                            <div>
                                <label htmlFor="email" className="sr-only">Email address</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="Email address"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="sr-only">Password</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    placeholder="Password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                />
                            </div>
                            {isRegistering && (
                                <div>
                                    <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        required
                                        className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        placeholder="Confirm Password"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <button
                                type="submit"
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                {isRegistering ? 'Register' : 'Sign in'}
                            </button>
                        </div>
                    </form>

                    <div className="text-center">
                        <button
                            onClick={() => {
                                setIsRegistering(!isRegistering)
                                setFormData(prev => ({
                                    ...prev,
                                    password: '',
                                    confirmPassword: ''
                                }))
                                setPasswordError(null)
                            }}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500"
                        >
                            {isRegistering
                                ? 'Already have an account? Sign in'
                                : 'Need an account? Register'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col dark:bg-gray-900">
            {/* Top Bar */}
            <div className="flex-none">
                <TopBar onEntryAdded={handleEntryAdded} onTopicCreated={handleTopicCreated} />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex min-h-0">
                {/* Left Sidebar */}
                <aside className="w-64 flex-none border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                    <LeftSidebar
                        onSelectTopic={setSelectedTopicId}
                        selectedTopicId={selectedTopicId}
                        topics={topics}
                        onTopicsChange={setTopics}
                        onEntryMoved={() => {
                            centerWorkspaceRef.current?.refreshEntries()
                        }}
                    />
                </aside>

                {/* Center Content */}
                <main className={`flex-1 min-w-0 overflow-hidden flex`}>
                    <div className="flex-1">
                        <CenterWorkspace
                            ref={centerWorkspaceRef}
                            selectedTopicId={selectedTopicId}
                        />
                    </div>

                    {/* Toggle Button */}
                    <div className="flex-none border-l border-gray-200 dark:border-gray-700 flex items-center">
                        <button
                            onClick={() => setShowRightSidebar(!showRightSidebar)}
                            className="p-1 -ml-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow"
                            title={showRightSidebar ? "Hide AI Assistant" : "Show AI Assistant"}
                        >
                            <svg
                                className="w-4 h-4 text-gray-600 dark:text-gray-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d={showRightSidebar
                                        ? "M9 5l7 7-7 7"  // chevron-right when sidebar is visible
                                        : "M15 19l-7-7 7-7" // chevron-left when sidebar is hidden
                                    }
                                />
                            </svg>
                        </button>
                    </div>

                    {/* Right Sidebar with conditional rendering */}
                    {showRightSidebar && (
                        <aside className="w-80 flex-none border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
                            <RightSidebar />
                        </aside>
                    )}
                </main>
            </div>
        </div>
    )
} 