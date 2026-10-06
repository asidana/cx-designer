/**
 * Notifications — toast notifications for user feedback
 */

import React, { useEffect, useState } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationsProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export const Notifications: React.FC<NotificationsProps> = ({ notifications, onDismiss }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 16,
      right: 16,
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      maxWidth: 350
    }}>
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};

const NotificationItem: React.FC<{
  notification: Notification;
  onDismiss: (id: string) => void;
}> = ({ notification, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const duration = notification.duration || 5000;
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(notification.id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#6366f1'
  };

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  if (!isVisible) return null;

  return (
    <div style={{
      background: '#1a1a2e',
      border: `1px solid ${colors[notification.type]}`,
      borderRadius: 8,
      padding: 12,
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      animation: 'slideIn 0.3s ease',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{ fontSize: 20 }}>{icons[notification.type]}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>
          {notification.title}
        </div>
        {notification.message && (
          <div style={{ fontSize: 12, color: '#888' }}>
            {notification.message}
          </div>
        )}
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onDismiss(notification.id), 300);
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#888',
          cursor: 'pointer',
          fontSize: 16,
          padding: 0
        }}
      >
        ×
      </button>
    </div>
  );
};

/**
 * Hook for managing notifications
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = `notif_${Date.now()}`;
    setNotifications((prev) => [...prev, { ...notification, id }]);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const success = (title: string, message?: string) => {
    addNotification({ type: 'success', title, message });
  };

  const error = (title: string, message?: string) => {
    addNotification({ type: 'error', title, message });
  };

  const warning = (title: string, message?: string) => {
    addNotification({ type: 'warning', title, message });
  };

  const info = (title: string, message?: string) => {
    addNotification({ type: 'info', title, message });
  };

  return {
    notifications,
    addNotification,
    dismissNotification,
    success,
    error,
    warning,
    info
  };
}
