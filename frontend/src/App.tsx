import { BrowserRouter } from 'react-router-dom'
import Home from './pages/Home'
import Navbar from './components/Navbar'
import LeftSidebar from './components/home/LeftSidebar'
import { ThemeProvider } from './context/ThemeContext'
import { useAuth } from './context/AuthContext'
import { useEffect, useState } from 'react'
import { setSessionExpiredHandler } from './lib/api'
import { Topic, UNCATEGORIZED_TOPIC_ID, ALL_TOPICS_TOPIC_ID, UncategorizedTopic } from './lib/api/topicsApi'
import { entriesApi, Entry } from './lib/api/entriesApi'
import { topicsApi } from './lib/api/topicsApi'
import LoginForm from './components/auth/LoginForm'

function App() {
  const { handleSessionExpired, isAuthenticated, login, register, error } = useAuth()
  const [topics, setTopics] = useState<(Topic | UncategorizedTopic)[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(ALL_TOPICS_TOPIC_ID)
  const [isRegistering, setIsRegistering] = useState(false)

  useEffect(() => {
    // Set up the session expired handler
    setSessionExpiredHandler(handleSessionExpired)

    // Clean up when component unmounts
    return () => setSessionExpiredHandler(() => { })
  }, [handleSessionExpired])

  const handleEntryAdded = (entry: Entry) => {
    // Refresh topics if needed
    refreshTopics()
  }

  const handleTopicCreated = (topic: Topic) => {
    setTopics(prevTopics => [...prevTopics, topic])
  }

  const refreshTopics = async () => {
    try {
      const fetchedTopics = await topicsApi.getTopics()
      setTopics(fetchedTopics)
    } catch (error) {
      console.error('Error refreshing topics:', error)
    }
  }

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <ThemeProvider>
          <div className="min-h-screen flex items-center justify-center dark:bg-gray-900 bg-gray-50">
            <LoginForm
              isRegistering={isRegistering}
              setIsRegistering={setIsRegistering}
              login={login}
              register={register}
              error={error}
            />
          </div>
        </ThemeProvider>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <ThemeProvider>
        <div className="h-full flex bg-white dark:bg-gray-900">
          {/* Left Sidebar - Remove padding */}
          <div className="w-64 flex-none">
            <LeftSidebar
              onSelectTopic={setSelectedTopicId}
              selectedTopicId={selectedTopicId}
              topics={topics}
              onTopicsChange={setTopics}
              onEntryMoved={() => {
                // Handle entry moved
              }}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-none">
              <Navbar 
                onEntryAdded={handleEntryAdded}
                onTopicCreated={handleTopicCreated}
                onTopicsChanged={refreshTopics}
              />
            </div>
            <div className="flex-1 overflow-hidden">
              <Home 
                selectedTopicId={selectedTopicId}
                topics={topics}
                setTopics={setTopics}
              />
            </div>
          </div>
        </div>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App 