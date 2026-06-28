import './UserList.css'

function UserList({ users, title }) {
  if (!users || users.length === 0) {
    return null
  }

  return (
    <div className="user-list">
      <h4>{title} — {users.length}</h4>
      <ul>
        {users.map(user => (
          <li key={user.user_id} className="user-item">
            <div className={`user-status ${user.is_online ? 'online' : 'offline'}`}>
              <div className="user-avatar">
                {user.username?.charAt(0).toUpperCase()}
              </div>
            </div>
            <span className="user-name">{user.username}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default UserList
