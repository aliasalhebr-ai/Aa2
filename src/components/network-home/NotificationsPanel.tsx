import { useState, useEffect, useCallback } from 'react';
import { X, Bell, Check, CheckCheck } from 'lucide-react';
import type { Notification } from '@/types';
import { getNotifications, markAsRead, markAllAsRead } from '@/services/notificationService';

type Props = {
  isLoggedIn: boolean;
  onClose: () => void;
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'منذ لحظات';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  return new Date(dateStr).toLocaleDateString('ar-EG');
}

export default function NotificationsPanel({ isLoggedIn, onClose }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (isLoggedIn) load();
  }, [isLoggedIn, load]);

  const handleMarkRead = useCallback(async (id: string) => {
    await markAsRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  }, []);

  const handleMarkAll = useCallback(async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, []);

  if (!isLoggedIn) {
    return (
      <>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[60] animate-slide-up max-h-[80vh] overflow-y-auto fancy-scroll shadow-float">
          <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
          <div className="px-5 py-8 text-center">
            <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">سجّل دخولك لرؤية إشعاراتك.</p>
            <button onClick={onClose} className="mt-4 px-6 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">إغلاق</button>
          </div>
        </div>
      </>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[60] animate-slide-up max-h-[85vh] overflow-y-auto fancy-scroll shadow-float">
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-gray-200" /></div>
        <div className="sticky top-0 bg-white px-5 pt-2 pb-3 border-b border-gray-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-siwar-600" />
            <h3 className="text-base font-bold text-gray-800">الإشعارات</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-siwar-100 text-siwar-700">{unreadCount}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={handleMarkAll} className="flex items-center gap-1 text-xs text-siwar-600 hover:text-siwar-700">
                <CheckCheck className="w-4 h-4" /> تعليم الكل كمقروء
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-siwar-200 border-t-siwar-600 rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Bell className="w-10 h-10 text-gray-300" />
              <p className="text-sm text-gray-500">لا توجد إشعارات.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleMarkRead(n.id)}
                  className={`w-full p-3 rounded-2xl border text-right transition-all ${
                    n.is_read ? 'border-gray-100 bg-white' : 'border-siwar-100 bg-siwar-50/50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-siwar-600 mt-1.5 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800">{n.title}</p>
                      {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
