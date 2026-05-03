import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import apiService from '../apiService';
import { connectSocket, disconnectSocket } from '../socket';

const Navbar = () => {
  const isLoggedIn = Boolean(localStorage.getItem('token'));
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  const adminUsername = process.env.REACT_APP_ADMIN_USERNAME || 'adi24';
  const [theme, setTheme] = React.useState(document.body.dataset.theme || localStorage.getItem('theme') || 'light');
  const [notifications, setNotifications] = React.useState([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    const fetchNotifications = async () => {
      if (!isLoggedIn) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      try {
        const response = await apiService.get('/users/notifications');

        if (!active) {
          return;
        }

        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount || 0);
      } catch (_error) {}
    };

    fetchNotifications();
    const intervalId = window.setInterval(fetchNotifications, 12000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [isLoggedIn]);

  React.useEffect(() => {
    if (!isLoggedIn) {
      disconnectSocket();
      return undefined;
    }

    const token = localStorage.getItem('token');
    const socket = connectSocket(token);
    const handleNotification = (notification) => {
      setNotifications((current) => [notification, ...current].slice(0, 30));
      setUnreadCount((current) => current + 1);
    };

    socket.on('notification:new', handleNotification);

    return () => {
      socket.off('notification:new', handleNotification);
    };
  }, [isLoggedIn]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = nextTheme;
    localStorage.setItem('theme', nextTheme);
    setTheme(nextTheme);
  };

  const handleMarkNotificationsRead = async () => {
    try {
      const response = await apiService.patch('/users/notifications/read');
      setNotifications(response.data.notifications || []);
      setUnreadCount(0);
    } catch (_error) {}
  };

  return (
    <header className="navbar-shell">
      <nav className="navbar">
        <NavLink className="brand-mark" to="/">
          <span className="brand-dot" />
          <div>
            <strong>PersonalBlogAI</strong>
            <span>Fresh writing for curious readers</span>
          </div>
        </NavLink>

        <div className="links">
          <button type="button" className="nav-link theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/">
            Home
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/explore">
            Explore
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/admin/login">
            {isLoggedIn ? 'Account' : 'Login / Signup'}
          </NavLink>
          {isLoggedIn && (
            <>
              <button
                type="button"
                className={`nav-link notification-bell ${notificationsOpen ? 'active' : ''}`}
                onClick={() => setNotificationsOpen((current) => !current)}
              >
                Bell
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>
              <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/admin/dashboard">
                {currentUser?.username ? `${currentUser.username}'s Dashboard` : 'Dashboard'}
              </NavLink>
              {currentUser?.username === adminUsername && (
                <NavLink className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} to="/admin/moderation">
                  Moderation
                </NavLink>
              )}
            </>
          )}
        </div>
      </nav>

      {notificationsOpen && isLoggedIn && (
        <aside className="notification-dropdown">
          <div className="notification-dropdown-header">
            <div>
              <p className="eyebrow">Updates</p>
              <h3>Notifications</h3>
            </div>
            <button type="button" className="secondary-button" onClick={handleMarkNotificationsRead}>
              Mark all read
            </button>
          </div>

          {notifications.length === 0 ? (
            <p className="state-panel">You are all caught up.</p>
          ) : (
            <div className="notification-list">
              {notifications.map((notification, index) => (
                <Link
                  className={`notification-item ${notification.read ? '' : 'notification-item-unread'}`}
                  key={`${notification.type}-${notification.createdAt}-${index}`}
                  onClick={() => setNotificationsOpen(false)}
                  to={notification.link || '/admin/dashboard'}
                >
                  <strong>{notification.type}</strong>
                  <span>{notification.message}</span>
                  <small>{new Date(notification.createdAt).toLocaleString()}</small>
                </Link>
              ))}
            </div>
          )}
        </aside>
      )}
    </header>
  );
};

export default Navbar;
