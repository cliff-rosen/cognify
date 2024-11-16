import { useAuth } from '@/context/AuthContext'

export default function Home() {
    const { isAuthenticated, user } = useAuth()

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
                <h1 className="text-3xl font-bold">
                    {isAuthenticated ? `Welcome, ${user?.username}` : 'Welcome to Cognify'}
                </h1>
            </div>
        </div>
    )
} 