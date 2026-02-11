// context/NotificationsContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from './UserContext';

const NotificationsContext = createContext();

export const NotificationsProvider = ({ children }) => {
  const { user } = useUser();
  const [notificationCount, setNotificationCount] = useState(0);

  const updateNotifications = async () => {
    if (!user?.token) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/bookings/unread-count', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        }
      });
      const data = await response.json();
      setNotificationCount(data.count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    updateNotifications();
    const interval = setInterval(updateNotifications, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [user?.token]);

  return (
    <NotificationsContext.Provider value={{ notificationCount, updateNotifications }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};