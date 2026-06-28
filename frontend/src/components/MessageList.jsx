import { useEffect, useRef, forwardRef } from 'react'
import { format } from 'date-fns'
import './MessageList.css'

const MessageList = forwardRef(({ messages, currentUserId }, ref) => {
  const listRef = useRef(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const formatTime = (timestamp) => {
    try {
      return format(new Date(timestamp), 'h:mm a')
    } catch {
      return ''
    }
  }

  const formatDate = (timestamp) => {
    try {
      return format(new Date(timestamp), 'MMMM d, yyyy')
    } catch {
      return ''
    }
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.created_at)
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
    return groups
  }, {})

  return (
    <div className="message-list" ref={listRef}>
      {Object.entries(groupedMessages).map(([date, dateMessages]) => (
        <div key={date} className="message-group">
          <div className="date-divider">
            <span>{date}</span>
          </div>
          
          {dateMessages.map((message, index) => {
            const isOwnMessage = message.author_id === currentUserId
            const showHeader = index === 0 || 
              dateMessages[index - 1].author_id !== message.author_id

            return (
              <div 
                key={message.id} 
                className={`message ${isOwnMessage ? 'own' : ''}`}
              >
                {showHeader && (
                  <div className="message-header">
                    <div className="message-avatar">
                      {message.author?.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <span className="message-author">
                      {message.author?.username || 'Unknown'}
                    </span>
                    <span className="message-time">
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                )}
                
                {!showHeader && <div className="message-spacer" />}
                
                <div className="message-content">
                  {message.content}
                </div>
              </div>
            )
          })}
        </div>
      ))}
      
      {messages.length === 0 && (
        <div className="no-messages">
          <p>No messages yet. Be the first to send a message!</p>
        </div>
      )}
    </div>
  )
})

MessageList.displayName = 'MessageList'

export default MessageList
