import { useState, useRef, useEffect } from 'react'
import './MessageInput.css'

function MessageInput({ onSend }) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
    }
  }, [message])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const trimmedMessage = message.trim()
    if (trimmedMessage) {
      onSend(trimmedMessage)
      setMessage('')
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form className="message-input-container" onSubmit={handleSubmit}>
      <div className="message-input-wrapper">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message #channel"
          rows={1}
          maxLength={2000}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={!message.trim()}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </form>
  )
}

export default MessageInput
