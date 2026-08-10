import { useEffect } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type Props = {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
};

export default function Toast({ message, type = 'success', onClose }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, type === 'error' ? 6000 : 3000);
    return () => clearTimeout(timer);
  }, [onClose, type]);

  const Icon = type === 'error' ? XCircle : type === 'info' ? Info : CheckCircle2;
  const iconColor = type === 'error' ? 'text-red-400' : type === 'info' ? 'text-blue-400' : 'text-siwar-400';

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] animate-bounce-in">
      <div className="glass-dark flex items-center gap-2.5 px-5 py-3.5 text-white rounded-xl shadow-float max-w-[90vw]">
        <Icon className={`w-4.5 h-4.5 ${iconColor} flex-shrink-0`} />
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="mr-1 text-gray-400 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
