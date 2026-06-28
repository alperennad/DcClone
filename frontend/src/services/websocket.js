import { useAuthStore } from '../contexts/authStore'

// WebSocket URL - Same origin for single container deployment
const WS_URL = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`

export class WebSocketService {
  constructor() {
    this.ws = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
    this.listeners = new Map()
    this.messageQueue = []
    this.isConnected = false
    this.isAuthenticated = false
  }

  connect() {
    const token = useAuthStore.getState().token
    if (!token) {
      console.error('No token available for WebSocket connection')
      return
    }

    this.ws = new WebSocket(WS_URL)

    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.isConnected = true
      this.reconnectAttempts = 0
      
      // Send authentication
      this.send({
        type: 'auth',
        data: { token }
      })

      // Process queued messages
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift()
        this.send(msg)
      }
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        this.handleMessage(message)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      this.isConnected = false
      this.isAuthenticated = false
      this.attemptReconnect()
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
    this.isAuthenticated = false
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * this.reconnectAttempts
    
    console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`)
    
    setTimeout(() => {
      this.connect()
    }, delay)
  }

  send(message) {
    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      this.messageQueue.push(message)
    }
  }

  handleMessage(message) {
    const { type, data } = message

    // Handle auth success
    if (type === 'auth_success') {
      this.isAuthenticated = true
    }

    // Handle auth error
    if (type === 'auth_error') {
      console.error('WebSocket authentication failed:', data.error)
      this.isAuthenticated = false
    }

    // Notify listeners
    const callbacks = this.listeners.get(type) || []
    callbacks.forEach(callback => callback(data))

    // Also notify wildcard listeners
    const wildcardCallbacks = this.listeners.get('*') || []
    wildcardCallbacks.forEach(callback => callback(type, data))
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    this.listeners.get(eventType).push(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType)
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  // Message methods
  sendMessage(channelId, content) {
    this.send({
      type: 'message_new',
      data: { channel_id: channelId, content }
    })
  }

  joinChannel(channelId) {
    this.send({
      type: 'channel_join',
      data: { channel_id: channelId }
    })
  }

  leaveChannel(channelId) {
    this.send({
      type: 'channel_leave',
      data: { channel_id: channelId }
    })
  }

  // Voice/WebRTC signaling methods
  joinVoiceChannel(channelId) {
    this.send({
      type: 'signaling',
      data: {
        signal_type: 'join_voice',
        channel_id: channelId
      }
    })
  }

  leaveVoiceChannel(channelId) {
    this.send({
      type: 'signaling',
      data: {
        signal_type: 'leave_voice',
        channel_id: channelId
      }
    })
  }

  sendVoiceOffer(channelId, targetUserId, offer) {
    this.send({
      type: 'signaling',
      data: {
        signal_type: 'offer',
        channel_id: channelId,
        target_user_id: targetUserId,
        data: offer
      }
    })
  }

  sendVoiceAnswer(channelId, targetUserId, answer) {
    this.send({
      type: 'signaling',
      data: {
        signal_type: 'answer',
        channel_id: channelId,
        target_user_id: targetUserId,
        data: answer
      }
    })
  }

  sendIceCandidate(channelId, targetUserId, candidate) {
    this.send({
      type: 'signaling',
      data: {
        signal_type: 'ice_candidate',
        channel_id: channelId,
        target_user_id: targetUserId,
        data: candidate
      }
    })
  }

  sendPing() {
    this.send({
      type: 'ping',
      timestamp: Date.now()
    })
  }
}

// Singleton instance
export const wsService = new WebSocketService()
