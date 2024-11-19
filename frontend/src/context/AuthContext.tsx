import React, { createContext, useContext, useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'

interface AuthContextType {
    isAuthenticated: boolean
    user: { id: string; username: string } | null
    login: any
    register: any
    logout: () => void
    error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [user, setUser] = useState<{ id: string; username: string } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isRegistering, setIsRegistering] = useState(false)

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

                return response.data
            } catch (error: any) {
                throw new Error(error.response?.data?.detail || 'Login failed')
            }
        },
        onSuccess: (data) => {
            setError(null)
            localStorage.setItem('authToken', data.access_token)
            localStorage.setItem('user', JSON.stringify({
                id: data.user_id,
                username: data.username
            }))
            setIsAuthenticated(true)
            setUser({
                id: data.user_id,
                username: data.username
            })
        },
        onError: (error: Error) => {
            setError(error.message)
        }
    })

    const register = useMutation({
        mutationFn: async (credentials: { email: string; password: string }) => {
            try {
                const response = await api.post('/api/auth/register', credentials)
                return response.data
            } catch (error: any) {
                if (error.response) {
                    const errorMessage = error.response.data?.detail || 
                                       error.response.data?.message || 
                                       error.response.data || 
                                       'Registration failed'
                    throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage))
                } else if (error.request) {
                    throw new Error('No response from server. Please try again.')
                } else {
                    throw new Error(error.message || 'Registration failed. Please try again.')
                }
            }
        },
        onSuccess: () => {
            setError(null)
            setError('Registration successful! Please sign in.')
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
        <AuthContext.Provider value={{ isAuthenticated, user, login, register, logout, error }}>
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