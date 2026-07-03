import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface QueuedLog {
  id: string;
  type: 'CARD' | 'STICKER';
  payload: any;
  timestamp: string;
}

interface OfflineContextType {
  isOnline: boolean;
  queuedLogs: QueuedLog[];
  queueLog: (type: 'CARD' | 'STICKER', payload: any) => Promise<any>;
  syncLogs: () => Promise<void>;
  isSyncing: boolean;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedLogs, setQueuedLogs] = useState<QueuedLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { token } = useAuth();

  // Listen to connection changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('App went online. Triggering sync...');
    };
    const handleOffline = () => {
      setIsOnline(false);
      console.log('App went offline.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load initial queue
    const saved = localStorage.getItem('abes_offline_queue');
    if (saved) {
      setQueuedLogs(JSON.parse(saved));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Automatic sync when coming back online
  useEffect(() => {
    if (isOnline && queuedLogs.length > 0 && token) {
      syncLogs();
    }
  }, [isOnline, token]);

  const queueLog = async (type: 'CARD' | 'STICKER', payload: any) => {
    // If online, perform direct API call
    if (isOnline) {
      const endpoint = type === 'CARD' ? '/api/entry/scan-card' : '/api/entry/scan-sticker';
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error');
      }
      return data;
    } else {
      // Offline mode: queue the log locally
      const tempId = `off_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newLog: QueuedLog = {
        id: tempId,
        type,
        payload,
        timestamp: new Date().toISOString()
      };

      const updatedQueue = [...queuedLogs, newLog];
      setQueuedLogs(updatedQueue);
      localStorage.setItem('abes_offline_queue', JSON.stringify(updatedQueue));
      
      // Simulate successful local logging response for the UI
      return {
        success: true,
        offline: true,
        message: 'Network offline. Entry logged locally. Will sync when online.',
        timestamp: newLog.timestamp,
        cardholder: payload.idCardNumber ? { name: `ID: ${payload.idCardNumber}`, role: 'Offline Sync' } : null,
        vehicle: payload.stickerNumber ? { plateNumber: `Sticker: ${payload.stickerNumber}`, vehicleType: 'Offline Sync' } : null,
        direction: 'IN' // Default mock direction
      };
    }
  };

  const syncLogs = async () => {
    if (isSyncing || queuedLogs.length === 0 || !token) return;
    setIsSyncing(true);
    console.log(`[Offline Sync] Starting sync of ${queuedLogs.length} logs...`);

    const updatedQueue = [...queuedLogs];
    const failedLogs: QueuedLog[] = [];

    for (const log of updatedQueue) {
      try {
        const endpoint = log.type === 'CARD' ? '/api/entry/scan-card' : '/api/entry/scan-sticker';
        const response = await fetch(`http://localhost:5000${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(log.payload)
        });
        
        if (!response.ok) {
          // If server rejects with validation errors, we remove it to prevent blocking the queue.
          // In production, we'd log it to a local conflict resolver.
          console.error(`[Offline Sync] Failed to sync log ${log.id}:`, await response.json());
        }
      } catch (err) {
        console.error(`[Offline Sync] Network error syncing log ${log.id}:`, err);
        failedLogs.push(log); // Keep in queue to retry later
      }
    }

    setQueuedLogs(failedLogs);
    localStorage.setItem('abes_offline_queue', JSON.stringify(failedLogs));
    setIsSyncing(false);
    console.log(`[Offline Sync] Sync complete. ${updatedQueue.length - failedLogs.length} synced successfully.`);
  };

  return (
    <OfflineContext.Provider value={{
      isOnline,
      queuedLogs,
      queueLog,
      syncLogs,
      isSyncing
    }}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
