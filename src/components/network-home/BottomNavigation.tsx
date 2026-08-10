import { Home, Bell, Plus, Network, User } from 'lucide-react';

type Props = {
  unreadNotifications: number;
  onCreateClick: () => void;
  onHomeClick: () => void;
  onNotificationsClick: () => void;
  onNetworkClick: () => void;
  onAccountClick: () => void;
};

export default function BottomNavigation({
  unreadNotifications,
  onCreateClick,
  onHomeClick,
  onNotificationsClick,
  onNetworkClick,
  onAccountClick,
}: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-gray-200/60 shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-around max-w-5xl mx-auto px-1" style={{ height: '64px' }}>
        {/* Home */}
        <button
          onClick={onHomeClick}
          className="tap-scale flex flex-col items-center justify-center gap-1 flex-1 text-siwar-600"
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-xl icon-3d-active">
            <Home className="w-5 h-5 icon-emboss-active" fill="currentColor" />
          </div>
          <span className="text-[10px] font-medium">الرئيسية</span>
        </button>

        {/* Notifications */}
        <button
          onClick={onNotificationsClick}
          className="tap-scale flex flex-col items-center justify-center gap-1 flex-1 text-gray-500 hover:text-siwar-600 transition-colors relative"
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-xl icon-3d">
            <Bell className="w-5 h-5 icon-emboss" />
          </div>
          <span className="text-[10px] font-medium">الإشعارات</span>
          {unreadNotifications > 0 && (
            <span className="absolute top-0.5 right-1/2 translate-x-4 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[9px] font-bold text-white rounded-full ring-2 ring-white badge-3d animate-bounce-in">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </button>

        {/* Create Opportunity (center, prominent) */}
        <button
          onClick={onCreateClick}
          className="tap-scale flex flex-col items-center justify-center gap-0.5 flex-1"
        >
          <div
            className="flex items-center justify-center w-14 h-14 -mt-5 text-white rounded-2xl ring-4 ring-white transition-all duration-300 hover:scale-110 active:scale-95"
            style={{
              background: 'linear-gradient(145deg, #1a4731 0%, #2d6a4f 100%)',
              boxShadow:
                '0 6px 16px -4px rgba(26,71,49,0.5), inset 2px 2px 4px rgba(255,255,255,0.25), inset -2px -2px 4px rgba(0,0,0,0.2)',
            }}
          >
            <Plus className="w-6 h-6 text-white" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }} />
          </div>
          <span className="text-[10px] font-bold text-siwar-700 -mt-0.5">إنشاء فرصة</span>
        </button>

        {/* Network */}
        <button
          onClick={onNetworkClick}
          className="tap-scale flex flex-col items-center justify-center gap-1 flex-1 text-gray-500 hover:text-siwar-600 transition-colors"
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-xl icon-3d">
            <Network className="w-5 h-5 icon-emboss" />
          </div>
          <span className="text-[10px] font-medium">الشبكة</span>
        </button>

        {/* Account */}
        <button
          onClick={onAccountClick}
          className="tap-scale flex flex-col items-center justify-center gap-1 flex-1 text-gray-500 hover:text-siwar-600 transition-colors"
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-xl icon-3d">
            <User className="w-5 h-5 icon-emboss" />
          </div>
          <span className="text-[10px] font-medium">الحساب</span>
        </button>
      </div>
    </nav>
  );
}
