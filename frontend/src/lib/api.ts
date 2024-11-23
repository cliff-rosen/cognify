import axios from 'axios'

console.log('Mode:', import.meta.env.MODE)
const apiUrl = import.meta.env.MODE === 'production'
  ? 'https://cognify-api.ironcliff.ai'
  : 'http://localhost:8000'

export const api = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url?.includes('/login')) {
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
    }
    return Promise.reject(error)
  }
) 
