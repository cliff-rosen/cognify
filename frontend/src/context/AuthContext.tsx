import React, { createContext, useContext, useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'

interface AuthContextType {
    isAuthenticated: boolean
    user: { id: string; username: string } | null
    login: any
    logout: () => void
    error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [user, setUser] = useState<{ id: string; username: string } | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const token = localStorage.getItem('authToken')
        const userData = localStorage.getItem('user')
        if (token && userData) {
            setIsAuthenticated(true)
            setUser(JSON.parse(userData))
        }
    }, [])

    const login = useMutation({
        mutationFn: async (credentials: { username: string; password: string }) => {
            try {
                const params = new URLSearchParams()
                params.append('username', credentials.username)
                params.append('password', credentials.password)

                const response = await api.post('/api/auth/login', params, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                })
                return { ...response.data, username: credentials.username }
            } catch (error: any) {
                throw new Error(error.response?.data?.detail || 'Login failed')
            }
        },
        onSuccess: (data) => {
            setError(null)
            localStorage.setItem('authToken', data.access_token)
            localStorage.setItem('user', JSON.stringify({ id: data.user_id, username: data.username }))
            setIsAuthenticated(true)
            setUser({ id: data.user_id, username: data.username })
        },
        onError: (error: Error) => {
            setError(error.message)
        }
    })

    const logout = () => {
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
        setIsAuthenticated(false)
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout, error }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
} 