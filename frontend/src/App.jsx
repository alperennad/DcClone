import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './contexts/authStore'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/chat" /> : <Login />} 
      />
      <Route 
        path="/register" 
        element={isAuthenticated ? <Navigate to="/chat" /> : <Register />} 
      />
      <Route 
        path="/chat" 
        element={isAuthenticated ? <Chat /> : <Navigate to="/login" />} 
      />
      <Route 
        path="/" 
        element={<Navigate to={isAuthenticated ? "/chat" : "/login"} />} 
      />
    </Routes>
  )
}

export default App
