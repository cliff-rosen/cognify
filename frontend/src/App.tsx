import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { TopicProvider } from './context/TopicContext'
import Home from './pages/Home'
import Navbar from './components/Navbar'
import { ThemeProvider } from './context/ThemeContext'

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <TopicProvider>
            <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
              <div className="flex-none">
                <Navbar />
              </div>
              <div className="flex-1 overflow-hidden">
                <Routes>
                  <Route path="/" element={<Home />} />
                </Routes>
              </div>
            </div>
          </TopicProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App 