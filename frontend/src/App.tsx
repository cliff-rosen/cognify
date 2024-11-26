import { BrowserRouter } from 'react-router-dom'
import Home from './pages/Home'
import Navbar from './components/Navbar'
import { ThemeProvider } from './context/ThemeContext'

function App() {
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