import axios from 'axios'
import { useAuthStore } from '../contexts/authStore'

// API URL - Same origin for single container deployment
const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),
  
  register: (username, email, password) =>
    api.post('/auth/register', { username, email, password }),
}

// User API
export const userAPI = {
  getMe: () =>
    api.get('/users/me'),
  
  updateMe: (data) =>
    api.patch('/users/me', data),
  
  getOnlineUsers: () =>
    api.get('/users/online'),
}

// Channel API
export const channelAPI = {
  getAll: () =>
    api.get('/channels/'),
  
  getTextChannels: () =>
    api.get('/channels/type/text'),
  
  getVoiceChannels: () =>
    api.get('/channels/type/voice'),
  
  create: (data) =>
    api.post('/channels/', data),
  
  update: (id, data) =>
    api.patch(`/channels/${id}`, data),
  
  delete: (id) =>
    api.delete(`/channels/${id}`),
}

// Message API
export const messageAPI = {
  getByChannel: (channelId, params = {}) =>
    api.get(`/channels/${channelId}/messages`, { params }),
  
  create: (channelId, content) =>
    api.post(`/channels/${channelId}/messages`, { content }),
  
  update: (channelId, messageId, content) =>
    api.patch(`/channels/${channelId}/messages/${messageId}`, { content }),
  
  delete: (channelId, messageId) =>
    api.delete(`/channels/${channelId}/messages/${messageId}`),
}

export default api
