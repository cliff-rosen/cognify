import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'

export default function TopBar() {
    const { isAuthenticated, logout, user } = useAuth()
    const { isDarkMode, toggleTheme } = useTheme()

    return (
        <div className="bg-white dark:bg-gray-900">
            <nav className="bg-white dark:bg-gray-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-end gap-4">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            aria-label="Toggle theme"
                        >
                            {isDarkMode ? (
                                <SunIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            ) : (
                                <MoonIcon className="h-5 w-5 text-gray-500" />
                            )}
                        </button>

                        {isAuthenticated && user && (
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                                {user.username}
                            </span>
                        )}

                        {isAuthenticated ? (
                            <button
                                onClick={logout}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 
                                         bg-gray-50 hover:bg-gray-100 rounded-md transition-colors
                                         dark:text-gray-300 dark:hover:text-gray-200 dark:bg-gray-800/30 dark:hover:bg-gray-800/50"
                            >
                                Logout
                            </button>
                        ) : <div />}
                    </div>
                </div>
            </nav>
        </div>
    )
} 