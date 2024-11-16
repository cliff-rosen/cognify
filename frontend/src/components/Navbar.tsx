import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function Navbar() {
    const { isAuthenticated, user, logout } = useAuth()

    console.log('Navbar Render - isAuthenticated:', isAuthenticated)
    console.log('Navbar Render - User:', user)

    return (
        <nav className="flex justify-between items-center p-4 bg-gray-800 text-white">
            <div className="text-xl font-bold">
                <Link to="/">COGNIFY</Link>
            </div>
            <div>
                {isAuthenticated && user ? (
                    <>
                        <span className="mr-4">Welcome, {user.username}</span>
                        <button onClick={logout} className="bg-red-500 px-4 py-2 rounded">
                            Logout
                        </button>
                    </>
                ) : (
                    <Link to="/login" className="bg-blue-500 px-4 py-2 rounded">
                        Login
                    </Link>
                )}
            </div>
        </nav>
    )
} 