import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../contexts/authStore'
import { wsService } from '../services/websocket'
import { webrtcService } from '../services/webrtc'
import { channelAPI, messageAPI } from '../services/api'
import ChannelList from '../components/ChannelList'
import MessageList from '../components/MessageList'
import MessageInput from '../components/MessageInput'
import UserList from '../components/UserList'
import VoicePanel from '../components/VoicePanel'
import './Chat.css'

function Chat() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [channels, setChannels] = useState({ text: [], voice: [] })
  const [activeChannel, setActiveChannel] = useState(null)
  const [messages, setMessages] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [voiceState, setVoiceState] = useState({
    isInVoice: false,
    channelId: null,
    isMuted: false,
    participants: []
  })
  const remoteStreamsRef = useRef(new Map())
  const messageListRef = useRef(null)

  // Connect WebSocket on mount
  useEffect(() => {
    wsService.connect()
    
    // Setup WebRTC callbacks with user ID
    webrtcService.initialize(user?.id)
    webrtcService.onRemoteStream = (userId, stream) => {
      // Store stream in ref for VoicePanel to access
      remoteStreamsRef.current.set(userId, stream)
      
      // Force re-render to update VoicePanel
      setVoiceState(prev => ({ ...prev }))
    }
    webrtcService.onUserJoined = (userId, username) => {
      setVoiceState(prev => {
        const exists = prev.participants.find(p => p.user_id === userId)
        if (exists) return prev
        return {
          ...prev,
          participants: [...prev.participants, { user_id: userId, username }]
        }
      })
    }
    webrtcService.onUserLeft = (userId) => {
      remoteStreamsRef.current.delete(userId)
      setVoiceState(prev => ({
        ...prev,
        participants: prev.participants.filter(p => p.user_id !== userId)
      }))
    }

    // Setup WebSocket listeners
    const unsubscribers = [
      wsService.on('auth_success', () => {
        console.log('WebSocket authenticated')
      }),

      wsService.on('message_new', (data) => {
        setMessages(prev => [...prev, data])
      }),

      wsService.on('user_online', (data) => {
        setOnlineUsers(prev => {
          const exists = prev.find(u => u.user_id === data.user_id)
          if (exists) {
            return prev.map(u => u.user_id === data.user_id ? { ...u, is_online: true } : u)
          }
          return [...prev, data]
        })
      }),

      wsService.on('user_offline', (data) => {
        setOnlineUsers(prev => prev.filter(u => u.user_id !== data.user_id))
      }),

      wsService.on('online_users_list', (data) => {
        setOnlineUsers(data.users)
      }),

      wsService.on('user_joined_voice', (data) => {
        setVoiceState(prev => ({
          ...prev,
          participants: [...prev.participants, { user_id: data.user_id, username: data.username }]
        }))
      }),

      wsService.on('user_left_voice', (data) => {
        setVoiceState(prev => ({
          ...prev,
          participants: prev.participants.filter(p => p.user_id !== data.user_id)
        }))
      }),

      wsService.on('voice_users_list', (data) => {
        setVoiceState(prev => ({
          ...prev,
          participants: data.users
        }))
        // Initialize WebRTC connections with existing users
        data.users.forEach(user => {
          webrtcService.handleUserJoined(user.user_id, user.username)
        })
      }),

      // Handle WebRTC signaling
      wsService.on('signaling', (data) => {
        webrtcService.handleSignaling(data)
      })
    ]

    return () => {
      unsubscribers.forEach(unsub => unsub())
      wsService.disconnect()
      webrtcService.leaveVoiceChannel()
    }
  }, [])

  // Load channels
  useEffect(() => {
    const loadChannels = async () => {
      try {
        const [textRes, voiceRes] = await Promise.all([
          channelAPI.getTextChannels(),
          channelAPI.getVoiceChannels()
        ])
        setChannels({
          text: textRes.data,
          voice: voiceRes.data
        })
        
        // Set first text channel as active if none selected
        if (textRes.data.length > 0 && !activeChannel) {
          handleChannelSelect(textRes.data[0])
        }
      } catch (error) {
        console.error('Error loading channels:', error)
      }
    }

    loadChannels()
  }, [])

  const handleChannelSelect = useCallback(async (channel) => {
    // Leave previous channel
    if (activeChannel) {
      wsService.leaveChannel(activeChannel.id)
    }
    
    setActiveChannel(channel)
    setMessages([])
    
    // Load message history from API
    try {
      const response = await messageAPI.getByChannel(channel.id)
      setMessages(response.data)
    } catch (error) {
      console.error('Error loading messages:', error)
    }
    
    // Join new channel via WebSocket
    wsService.joinChannel(channel.id)
  }, [activeChannel])

  const handleSendMessage = useCallback((content) => {
    if (activeChannel) {
      wsService.sendMessage(activeChannel.id, content)
    }
  }, [activeChannel])

  const handleVoiceJoin = useCallback(async (channel) => {
    try {
      await webrtcService.joinVoiceChannel(channel.id)
      setVoiceState({
        isInVoice: true,
        channelId: channel.id,
        isMuted: false,
        participants: []
      })
    } catch (error) {
      console.error('Error joining voice channel:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }, [])

  const handleVoiceLeave = useCallback(() => {
    webrtcService.leaveVoiceChannel()
    setVoiceState({
      isInVoice: false,
      channelId: null,
      isMuted: false,
      participants: []
    })
  }, [])

  const handleToggleMute = useCallback(() => {
    const newMuted = !voiceState.isMuted
    webrtcService.setMuted(newMuted)
    setVoiceState(prev => ({ ...prev, isMuted: newMuted }))
  }, [voiceState.isMuted])

  const handleCreateChannel = useCallback(async (type) => {
    const name = prompt(`Enter ${type} channel name:`)
    if (!name) return
    
    try {
      await channelAPI.create({
        name,
        type: type === 'text' ? 'text' : 'voice',
        description: ''
      })
      // Refresh channels
      const [textRes, voiceRes] = await Promise.all([
        channelAPI.getTextChannels(),
        channelAPI.getVoiceChannels()
      ])
      setChannels({
        text: textRes.data,
        voice: voiceRes.data
      })
    } catch (error) {
      console.error('Error creating channel:', error)
      alert('Failed to create channel')
    }
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="chat-container">
      {/* Server/Channel Sidebar */}
      <div className="sidebar">
        <div className="server-header">
          <h2>Discord Clone</h2>
        </div>
        
        <ChannelList
          channels={channels}
          activeChannel={activeChannel}
          onChannelSelect={handleChannelSelect}
          onVoiceJoin={handleVoiceJoin}
          onVoiceLeave={handleVoiceLeave}
          onCreateChannel={handleCreateChannel}
          voiceState={voiceState}
        />

        {voiceState.isInVoice && (
          <VoicePanel
            channel={channels.voice.find(c => c.id === voiceState.channelId)}
            participants={voiceState.participants}
            isMuted={voiceState.isMuted}
            onToggleMute={handleToggleMute}
            onLeave={handleVoiceLeave}
            remoteStreams={remoteStreamsRef.current}
          />
        )}

        <div className="user-panel">
          <div className="user-info">
            <div className="user-avatar">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <span className="username">{user?.username}</span>
              <span className="status">Online</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="main-content">
        {activeChannel ? (
          <>
            <div className="channel-header">
              <span className="channel-icon">#</span>
              <h3>{activeChannel.name}</h3>
              {activeChannel.description && (
                <span className="channel-description">
                  {activeChannel.description}
                </span>
              )}
            </div>

            <MessageList 
              messages={messages} 
              currentUserId={user?.id}
              ref={messageListRef}
            />

            <MessageInput onSend={handleSendMessage} />
          </>
        ) : (
          <div className="no-channel">
            <h3>Select a channel to start chatting</h3>
          </div>
        )}
      </div>

      {/* Members Sidebar */}
      <div className="members-sidebar">
        <UserList users={onlineUsers} title="Online" />
      </div>
    </div>
  )
}

export default Chat
