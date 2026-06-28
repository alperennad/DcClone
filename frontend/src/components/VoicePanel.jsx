import { useEffect, useRef, useState } from 'react'
import './VoicePanel.css'

function VoicePanel({ channel, participants, isMuted, onToggleMute, onLeave, remoteStreams }) {
  const audioRefs = useRef({})
  const [speakingUsers, setSpeakingUsers] = useState(new Set())

  // Assign remote streams to audio elements
  useEffect(() => {
    if (remoteStreams) {
      remoteStreams.forEach((stream, userId) => {
        const audio = audioRefs.current[userId]
        if (audio && audio.srcObject !== stream) {
          console.log('Assigning stream to audio:', userId)
          audio.srcObject = stream
          audio.play().catch(console.error)
        }
      })
    }
  }, [remoteStreams, participants])

  // Handle audio analysis for speaking detection
  useEffect(() => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const analysers = new Map()
    
    // Analyze remote participants audio
    participants.forEach(participant => {
      const audio = audioRefs.current[participant.user_id]
      if (audio && audio.srcObject && !analysers.has(participant.user_id)) {
        try {
          const source = audioContext.createMediaStreamSource(audio.srcObject)
          const analyser = audioContext.createAnalyser()
          analyser.fftSize = 256
          source.connect(analyser)
          analysers.set(participant.user_id, analyser)
        } catch (e) {
          console.error('Error creating audio context:', e)
        }
      }
    })

    let animationId
    const checkSpeaking = () => {
      const newSpeaking = new Set()
      
      analysers.forEach((analyser, userId) => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(dataArray)
        
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        if (average > 30) { // Threshold for speaking
          newSpeaking.add(userId)
        }
      })
      
      setSpeakingUsers(newSpeaking)
      animationId = requestAnimationFrame(checkSpeaking)
    }
    
    animationId = requestAnimationFrame(checkSpeaking)
    
    return () => {
      cancelAnimationFrame(animationId)
      audioContext.close()
    }
  }, [participants])

  // Create ref callback for each participant
  const setAudioRef = (userId) => (el) => {
    if (el) {
      audioRefs.current[userId] = el
      // Check if we have a stream for this user
      if (remoteStreams && remoteStreams.has(userId)) {
        const stream = remoteStreams.get(userId)
        if (el.srcObject !== stream) {
          el.srcObject = stream
          el.play().catch(console.error)
        }
      }
    }
  }

  return (
    <div className="voice-panel">
      <div className="voice-panel-header">
        <span className="voice-icon">🔊</span>
        <span className="voice-channel-name">{channel?.name}</span>
        <span className="voice-status">
          {participants.length + 1} users
        </span>
      </div>

      <div className="voice-participants">
        {/* Local user */}
        <div className={`voice-participant local ${isMuted ? 'muted' : ''}`}>
          <div className="participant-avatar">
            You
            {isMuted && <span className="mute-indicator">🔇</span>}
          </div>
          <span className="participant-name">You</span>
          <div className="audio-level">
            {isMuted ? (
              <span className="muted-text">Muted</span>
            ) : (
              <div className="speaking-wave">
                <span></span><span></span><span></span>
              </div>
            )}
          </div>
        </div>

        {/* Remote participants */}
        {participants.map(participant => (
          <div 
            key={participant.user_id} 
            className={`voice-participant ${speakingUsers.has(participant.user_id) ? 'speaking' : ''}`}
          >
            <div className="participant-avatar">
              {participant.username?.charAt(0).toUpperCase()}
            </div>
            <span className="participant-name">{participant.username}</span>
            <div className="audio-level">
              {speakingUsers.has(participant.user_id) ? (
                <div className="speaking-wave active">
                  <span></span><span></span><span></span>
                </div>
              ) : (
                <span className="connected-text">Connected</span>
              )}
            </div>
            {/* Hidden audio element for remote stream */}
            <audio
              ref={setAudioRef(participant.user_id)}
              autoPlay
              playsInline
            />
          </div>
        ))}
        
        {participants.length === 0 && (
          <div className="no-participants">No one else is here</div>
        )}
      </div>

      <div className="voice-controls">
        <button 
          className={`voice-btn ${isMuted ? 'muted' : ''}`}
          onClick={onToggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.42 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
            </svg>
          )}
        </button>

        <button 
          className="voice-btn disconnect"
          onClick={onLeave}
          title="Disconnect"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

export default VoicePanel
