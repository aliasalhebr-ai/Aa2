import { useState, useEffect } from 'react';
import { MessageCircle, Lock } from 'lucide-react';
import type { OpportunityDetailViewModel } from '@/types';
import { getOrCreateChat, getOpportunityContactOptions, buildWhatsAppLink } from '@/services/chatService';

type Props = {
  vm: OpportunityDetailViewModel;
  isLoggedIn: boolean;
  onToast: (message: string, type: 'success' | 'error') => void;
  selectedItemName?: string | null;
};

export default function ContactSection({ vm, isLoggedIn, onToast, selectedItemName }: Props) {
  const [startingChat, setStartingChat] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [whatsappChecked, setWhatsappChecked] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!vm.publisher) { setWhatsappChecked(true); return; }

      const options = await getOpportunityContactOptions(vm.id);
      if (cancelled) return;

      setChatEnabled(options.chat_available);
      if (options.whatsapp_available && options.whatsapp_number && options.whatsapp_message) {
        const itemContext = selectedItemName ? ` (بخصوص: ${selectedItemName})` : '';
        const titleContext = ` ضمن فرصة: ${vm.title}`;
        setWhatsappUrl(buildWhatsAppLink(options.whatsapp_number, options.whatsapp_message + itemContext + titleContext));
      } else {
        setWhatsappUrl(null);
      }
      setWhatsappChecked(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vm.id, vm.publisher, selectedItemName, vm.title]);

  const handleChat = async () => {
    if (!isLoggedIn) {
      onToast('يجب تسجيل الدخول لبدء محادثة', 'error');
      return;
    }
    if (!vm.publisher) return;

    if (vm.publisher.isOwner) {
      onToast('لا يمكنك محادثة نفسك', 'error');
      return;
    }

    if (!chatEnabled) {
      onToast('الجهة لم تتيح المحادثة', 'error');
      return;
    }

    setStartingChat(true);
    try {
      await getOrCreateChat(vm.id, vm.publisher.id);
      onToast('تم إنشاء المحادثة بنجاح', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'تعذر بدء المحادثة';
      onToast(msg, 'error');
    } finally {
      setStartingChat(false);
    }
  };

  const handleWhatsApp = () => {
    if (!isLoggedIn) {
      onToast('يجب تسجيل الدخول', 'error');
      return;
    }
    if (!whatsappUrl) {
      onToast('الجهة لم تتيح التواصل عبر واتساب', 'error');
      return;
    }
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex gap-2">
        {chatEnabled ? (
          <button
            onClick={handleChat}
            disabled={startingChat}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-siwar-600 text-white rounded-xl text-sm font-bold hover:bg-siwar-700 transition-colors disabled:opacity-50"
          >
            <MessageCircle className="w-4 h-4" />
            {startingChat ? 'جاري...' : 'محادثة'}
          </button>
        ) : (
          <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-50 text-gray-400 rounded-xl text-sm font-medium border border-gray-100">
            <Lock className="w-3.5 h-3.5" />
            المحادثة غير متاحة
          </div>
        )}
        {whatsappUrl ? (
          <button
            onClick={handleWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.89-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            واتساب
          </button>
        ) : whatsappChecked ? (
          <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-50 text-gray-400 rounded-xl text-sm font-medium border border-gray-100">
            <Lock className="w-3.5 h-3.5" />
            واتساب غير متاح
          </div>
        ) : null}
      </div>
    </div>
  );
}
