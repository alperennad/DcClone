import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import { useAuthStore } from '../contexts/authStore'
import './Auth.css'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authAPI.login(username, password)
      const { access_token, user } = response.data
      login(access_token, user)
      navigate('/chat')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>Welcome Back!</h1>
        <p className="auth-subtitle">We're so excited to see you again!</p>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        
        <p className="auth-footer">
          Need an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
