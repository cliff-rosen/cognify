import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'

export default function Navbar() {
    const { isAuthenticated, logout } = useAuth()
    const { isDarkMode, toggleTheme } = useTheme()

    return (
        <nav className="bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="text-xl font-bold text-gray-800 dark:text-white">
                            Cognify
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
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
                        {isAuthenticated ? (
                            <button
                                onClick={logout}
                                className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                            >
                                Logout
                            </button>
                        ) : (
                            <Link
                                to="/login"
                                className="px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                            >
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
} 