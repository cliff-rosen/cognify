import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'

export function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="border-b bg-background">
      <div className="flex h-16 items-center px-4">
        <Link to="/" className="text-xl font-bold">
          Cognify
        </Link>
        <div className="ml-auto flex items-center space-x-4">
          {user ? (
            <>
              <span>{user.email}</span>
              <Button variant="ghost" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button>Login</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
} 