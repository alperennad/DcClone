import { wsService } from './websocket'

// ICE Configuration with STUN + TURN
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Open Relay TURN (free)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all'
}

/**
 * WebRTC Service for Voice Communication
 * Handles peer connections, signaling, and audio streams
 */
class WebRTCService {
  constructor() {
    // Local media stream
    this.localStream = null
    // Map of userId -> RTCPeerConnection
    this.peers = new Map()
    // Current voice channel ID
    this.channelId = null
    // Current user info
    this.myUserId = null
    // Callbacks
    this.onRemoteStream = null
    this.onUserJoined = null
    this.onUserLeft = null
    this.onConnectionStateChange = null
  }

  /**
   * Initialize WebRTC service
   */
  initialize(myUserId) {
    this.myUserId = myUserId
    
    // Listen for WebSocket signaling messages
    wsService.on('signaling', (data) => this.handleSignaling(data))
    
    console.log('[WebRTC] Initialized for user:', myUserId)
  }

  /**
   * Get local audio stream
   */
  async getLocalStream() {
    if (this.localStream) {
      return this.localStream
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        },
        video: false
      })
      console.log('[WebRTC] Local stream acquired')
      return this.localStream
    } catch (error) {
      console.error('[WebRTC] Failed to get local stream:', error)
      throw error
    }
  }

  /**
   * Join a voice channel
   */
  async joinVoiceChannel(channelId) {
    console.log('[WebRTC] Joining voice channel:', channelId)
    this.channelId = channelId

    // Get local audio first
    await this.getLocalStream()

    // Notify server
    wsService.send({
      type: 'signaling',
      data: {
        signal_type: 'join_voice',
        channel_id: channelId
      }
    })

    console.log('[WebRTC] Joined voice channel:', channelId)
  }

  /**
   * Leave voice channel
   */
  leaveVoiceChannel() {
    console.log('[WebRTC] Leaving voice channel:', this.channelId)
    
    if (this.channelId) {
      wsService.send({
        type: 'signaling',
        data: {
          signal_type: 'leave_voice',
          channel_id: this.channelId
        }
      })
    }

    // Close all peer connections
    this.peers.forEach((pc, userId) => {
      console.log('[WebRTC] Closing peer connection:', userId)
      pc.close()
    })
    this.peers.clear()

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    this.channelId = null
    console.log('[WebRTC] Left voice channel')
  }

  /**
   * Create peer connection for a user
   */
  createPeerConnection(userId) {
    console.log('[WebRTC] Creating peer connection for:', userId)

    if (this.peers.has(userId)) {
      console.log('[WebRTC] Reusing existing peer connection for:', userId)
      return this.peers.get(userId)
    }

    const pc = new RTCPeerConnection(ICE_SERVERS)

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream)
        console.log('[WebRTC] Added local track to peer:', userId)
      })
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track from:', userId)
      const [remoteStream] = event.streams
      if (this.onRemoteStream) {
        this.onRemoteStream(userId, remoteStream)
      }
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC] Sending ICE candidate to:', userId)
        wsService.send({
          type: 'signaling',
          data: {
            signal_type: 'ice_candidate',
            channel_id: this.channelId,
            target_user_id: userId,
            data: event.candidate
          }
        })
      }
    }

    // Handle ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE state with ${userId}:`, pc.iceConnectionState)
      if (pc.iceConnectionState === 'failed') {
        console.log('[WebRTC] ICE failed, restarting...')
        pc.restartIce()
      }
    }

    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state with ${userId}:`, pc.connectionState)
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(userId, pc.connectionState)
      }
    }

    this.peers.set(userId, pc)
    return pc
  }

  /**
   * Handle incoming signaling messages
   */
  async handleSignaling(data) {
    console.log('[WebRTC] Raw signaling data:', data)
    
    const { signal_type, from_user_id, from_username, data: signalData } = data

    if (!from_user_id) {
      console.warn('[WebRTC] No from_user_id in signaling data')
      return
    }

    // Don't process our own messages
    if (from_user_id === this.myUserId) {
      console.log('[WebRTC] Ignoring own message')
      return
    }

    console.log(`[WebRTC] Processing ${signal_type} from:`, from_user_id, 'myId:', this.myUserId)

    switch (signal_type) {
      case 'offer':
        await this.handleOffer(from_user_id, signalData)
        break
      case 'answer':
        await this.handleAnswer(from_user_id, signalData)
        break
      case 'ice_candidate':
        await this.handleIceCandidate(from_user_id, signalData)
        break
      case 'user_joined_voice':
        await this.handleUserJoined(from_user_id, from_username)
        break
      case 'user_left_voice':
        this.handleUserLeft(from_user_id)
        break
    }
  }

  /**
   * Handle offer from another user
   */
  async handleOffer(fromUserId, offer) {
    console.log('[WebRTC] Handling offer from:', fromUserId)

    try {
      const pc = this.createPeerConnection(fromUserId)

      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      console.log('[WebRTC] Set remote description (offer)')

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      console.log('[WebRTC] Created answer')

      // Send answer
      wsService.send({
        type: 'signaling',
        data: {
          signal_type: 'answer',
          channel_id: this.channelId,
          target_user_id: fromUserId,
          data: answer
        }
      })
      console.log('[WebRTC] Sent answer to:', fromUserId)

    } catch (error) {
      console.error('[WebRTC] Error handling offer:', error)
    }
  }

  /**
   * Handle answer from another user
   */
  async handleAnswer(fromUserId, answer) {
    console.log('[WebRTC] Handling answer from:', fromUserId)

    const pc = this.peers.get(fromUserId)
    if (!pc) {
      console.warn('[WebRTC] No peer connection for:', fromUserId)
      return
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer))
      console.log('[WebRTC] Set remote description (answer)')
    } catch (error) {
      console.error('[WebRTC] Error handling answer:', error)
    }
  }

  /**
   * Handle ICE candidate from another user
   */
  async handleIceCandidate(fromUserId, candidate) {
    const pc = this.peers.get(fromUserId)
    if (!pc) {
      console.warn('[WebRTC] No peer connection for ICE:', fromUserId)
      return
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
      console.log('[WebRTC] Added ICE candidate from:', fromUserId)
    } catch (error) {
      console.error('[WebRTC] Error adding ICE candidate:', error)
    }
  }

  /**
   * Handle user joined voice channel
   */
  async handleUserJoined(userId, username) {
    console.log('[WebRTC] User joined voice:', userId, username)

    if (this.onUserJoined) {
      this.onUserJoined(userId, username)
    }

    // Create peer connection and send offer
    try {
      const pc = this.createPeerConnection(userId)

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      })

      await pc.setLocalDescription(offer)
      console.log('[WebRTC] Created offer for:', userId)

      // Send offer
      wsService.send({
        type: 'signaling',
        data: {
          signal_type: 'offer',
          channel_id: this.channelId,
          target_user_id: userId,
          data: offer
        }
      })
      console.log('[WebRTC] Sent offer to:', userId)

    } catch (error) {
      console.error('[WebRTC] Error creating offer:', error)
    }
  }

  /**
   * Handle user left voice channel
   */
  handleUserLeft(userId) {
    console.log('[WebRTC] User left voice:', userId)

    const pc = this.peers.get(userId)
    if (pc) {
      pc.close()
      this.peers.delete(userId)
    }

    if (this.onUserLeft) {
      this.onUserLeft(userId)
    }
  }

  /**
   * Set mute state
   */
  setMuted(muted) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted
      })
    }
  }
}

// Singleton instance
export const webrtcService = new WebRTCService()
