import { BrowserRouter } from 'react-router-dom'
import Home from './pages/Home'
import Navbar from './components/Navbar'
import { ThemeProvider } from './context/ThemeContext'
import { useAuth } from './context/AuthContext'
import { useEffect } from 'react'
import { setSessionExpiredHandler } from './lib/api'

function App() {
  const { handleSessionExpired } = useAuth()

  useEffect(() => {
    // Set up the session expired handler
    setSessionExpiredHandler(handleSessionExpired)

    // Clean up when component unmounts
    return () => setSessionExpiredHandler(() => {})
  }, [handleSessionExpired])

  return (
    <BrowserRouter>
      <ThemeProvider>
        <div className="h-full flex flex-col bg-white dark:bg-gray-900">
          <div className="flex-none">
            <Navbar />
          </div>
          <div className="flex-1 overflow-hidden">
            <Home />
          </div>
        </div>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App 