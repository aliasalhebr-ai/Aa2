import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, MessageCircle, ArrowLeft } from 'lucide-react';
import {
  getOrCreateChat, getChatMessages, sendMessage, subscribeToChatMessages,
  type Chat, type ChatMessage,
} from '@/services/chatService';
import { supabase } from '@/lib/supabase';

type Props = {
  opportunityId: string;
  companyId: string;
  opportunityTitle: string;
  onClose: () => void;
  onToast: (message: string, type: 'success' | 'error') => void;
};

export default function ChatPanel({ opportunityId, companyId, opportunityTitle, onClose, onToast }: Props) {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await getOrCreateChat(opportunityId, companyId);
      setChat(c);
      const msgs = await getChatMessages(c.id);
      setMessages(msgs);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'فشل فتح المحادثة', 'error');
    } finally {
      setLoading(false);
    }
  }, [opportunityId, companyId, onToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!chat) return;
    const unsub = subscribeToChatMessages(chat.id, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    return unsub;
  }, [chat]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chat) return;
    setSending(true);
    try {
      await sendMessage(chat.id, input.trim());
      setInput('');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'فشل الإرسال', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md h-[75vh] sm:h-[600px] flex flex-col pointer-events-auto animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-l from-siwar-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-siwar-100 flex items-center justify-center">
              <MessageCircle className="w-4.5 h-4.5 text-siwar-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">محادثة مع صاحب العرض</h3>
              <p className="text-[10px] text-gray-500 line-clamp-1">{opportunityTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto fancy-scroll px-4 py-3 space-y-2.5 bg-gray-50/50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-siwar-200 border-t-siwar-600 rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">ابدأ المحادثة بكتابة رسالة</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_user_id === currentUserId && !msg.is_system;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${
                      msg.is_system
                        ? 'bg-gray-100 text-gray-500 text-center text-xs mx-auto rounded-full px-4 py-1.5'
                        : isMine
                          ? 'bg-siwar-600 text-white rounded-bl-md'
                          : 'bg-white text-gray-800 border border-gray-100 rounded-br-md shadow-sm'
                    }`}
                  >
                    {msg.body}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="اكتب رسالتك..."
              className="flex-1 px-4 py-2.5 rounded-full bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-siwar-300 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="w-10 h-10 rounded-full bg-siwar-600 text-white flex items-center justify-center hover:bg-siwar-700 disabled:opacity-40 transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
