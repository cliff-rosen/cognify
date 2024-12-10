import { BrowserRouter } from 'react-router-dom'
import EntriesWorkspace from './components/EntriesWorkspace'
import TopBar from './components/TopBar'
import LeftSidebar from './components/LeftSidebar'
import { ThemeProvider } from './context/ThemeContext'
import { useAuth } from './context/AuthContext'
import { useEffect, useState, useRef } from 'react'
import { setSessionExpiredHandler } from './lib/api'
import { Topic, UncategorizedTopic, AllTopicsTopic, AllTopicsTopicValue } from './lib/api/topicsApi'
import { Entry } from './lib/api/entriesApi'
import { topicsApi } from './lib/api/topicsApi'
import LoginForm from './components/auth/LoginForm'

function App() {
  const { handleSessionExpired, isAuthenticated, login, register, error } = useAuth()
  const [topics, setTopics] = useState<(Topic | UncategorizedTopic)[]>([])
  const [selectedTopic, setSelectedTopic] = useState<Topic | UncategorizedTopic | AllTopicsTopic>(AllTopicsTopicValue)
  const [isRegistering, setIsRegistering] = useState(false)
  const entriesWorkspaceRef = useRef<{ refreshEntries: () => void } | null>(null);

  useEffect(() => {
    // Set up the session expired handler
    setSessionExpiredHandler(handleSessionExpired)

    // Clean up when component unmounts
    return () => setSessionExpiredHandler(() => { })
  }, [handleSessionExpired])

  const setSelectedTopicWrapper = (topic: Topic | UncategorizedTopic | AllTopicsTopic) => {
    console.log('App setSelectedTopicWrapper', topic)
    setSelectedTopic(topic)
  }

  const handleEntryAdded = (entry: Entry) => {
    console.log('App handleEntryAdded', entry)
    console.log('App selectedTopic', selectedTopic)

    refreshTopics()

    if (selectedTopic === AllTopicsTopicValue || selectedTopic.topic_id === entry.topic_id) {
      entriesWorkspaceRef.current?.refreshEntries()
    }
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
              onSelectTopic={setSelectedTopicWrapper}
              selectedTopic={selectedTopic}
              topics={topics}
              onTopicsChange={setTopics}
              onEntryMoved={() => {
                entriesWorkspaceRef.current?.refreshEntries();
              }}
              onEntryAdded={handleEntryAdded}
              onTopicCreated={handleTopicCreated}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-900">
            <TopBar />
            <div className="flex-1 overflow-hidden">
              <EntriesWorkspace
                ref={entriesWorkspaceRef}
                selectedTopic={selectedTopic}
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