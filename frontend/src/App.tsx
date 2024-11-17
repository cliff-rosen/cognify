import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Navbar from './components/Navbar'
import { ThemeProvider } from './context/ThemeContext'

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
            <div className="flex-none">
              <Navbar />
            </div>
            <div className="flex-1 h-[calc(100vh-64px)]">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
              </Routes>
            </div>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App 