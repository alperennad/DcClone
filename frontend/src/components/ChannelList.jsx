import './ChannelList.css'

function ChannelList({ 
  channels, 
  activeChannel, 
  onChannelSelect, 
  onVoiceJoin,
  onVoiceLeave,
  voiceState,
  onCreateChannel
}) {
  const isInVoice = voiceState.isInVoice

  return (
    <div className="channel-list">
      {/* Text Channels */}
      <div className="channel-category">
        <div className="category-header">
          <h4>TEXT CHANNELS</h4>
          {onCreateChannel && (
            <button 
              className="create-channel-btn" 
              onClick={() => onCreateChannel('text')}
              title="Create Text Channel"
            >
              +
            </button>
          )}
        </div>
        <ul>
          {channels.text.length === 0 && (
            <li className="channel-empty">No text channels</li>
          )}
          {channels.text.map(channel => (
            <li
              key={channel.id}
              className={`channel-item ${activeChannel?.id === channel.id ? 'active' : ''}`}
              onClick={() => onChannelSelect(channel)}
            >
              <span className="channel-hash">#</span>
              <span className="channel-name">{channel.name}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Voice Channels */}
      <div className="channel-category">
        <div className="category-header">
          <h4>VOICE CHANNELS</h4>
          {onCreateChannel && (
            <button 
              className="create-channel-btn" 
              onClick={() => onCreateChannel('voice')}
              title="Create Voice Channel"
            >
              +
            </button>
          )}
        </div>
        <ul>
          {channels.voice.length === 0 && (
            <li className="channel-empty">No voice channels</li>
          )}
          {channels.voice.map(channel => {
            const isThisVoiceActive = voiceState.channelId === channel.id
            
            return (
              <li
                key={channel.id}
                className={`channel-item voice ${isThisVoiceActive ? 'active' : ''}`}
              >
                <span className="voice-icon">
                  {isThisVoiceActive ? '🔊' : '🔈'}
                </span>
                <span className="channel-name">{channel.name}</span>
                
                {!isInVoice ? (
                  <button 
                    className="join-voice-btn"
                    onClick={() => onVoiceJoin(channel)}
                  >
                    Join
                  </button>
                ) : isThisVoiceActive ? (
                  <button 
                    className="leave-voice-btn"
                    onClick={onVoiceLeave}
                  >
                    Leave
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default ChannelList
