import { supabase } from '@/lib/supabase';
import { createNotification } from './notificationService';

export type Chat = {
  id: string;
  opportunity_id: string;
  publisher_entity_id: string | null;
  company_id: string | null;
  customer_user_id: string;
  customer_phone: string | null;
  status: string;
  last_whatsapp_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  chat_id: string;
  sender_user_id: string;
  body: string;
  is_system: boolean;
  created_at: string;
};

export type PublisherEntityContact = {
  id: string;
  publisher_entity_id: string;
  whatsapp_number: string | null;
  whatsapp_enabled: boolean;
  chat_enabled: boolean;
  visibility_policy: string;
};

export type OpportunityContactOptions = {
  chat_available: boolean;
  whatsapp_available: boolean;
  whatsapp_number: string | null;
  whatsapp_message: string | null;
};

export async function getOrCreateChat(
  opportunityId: string,
  publisherEntityId: string | null,
  customerPhone?: string,
): Promise<Chat> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('يجب تسجيل الدخول لبدء المحادثة');

  // Prevent self-chat: check if the user is the owner of the publisher entity
  // This is validated below when we look up the entity

  // Check if the opportunity is visible to this user (must be active for non-owners)
  const { data: opp } = await supabase
    .from('opportunities')
    .select('status, created_by')
    .eq('id', opportunityId)
    .maybeSingle();

  if (!opp) throw new Error('الفرصة غير موجودة');
  if (opp.status !== 'active' && opp.created_by !== user.id) {
    throw new Error('لا تملك صلاحية إنشاء محادثة على هذه الفرصة');
  }

  // Check for existing chat
  const { data: existing } = await supabase
    .from('chats')
    .select('*')
    .eq('opportunity_id', opportunityId)
    .eq('customer_user_id', user.id)
    .maybeSingle();

  if (existing) return existing as Chat;

  // Create new chat linked to publisher_entity_id
  const insertPayload: Record<string, unknown> = {
    opportunity_id: opportunityId,
    customer_user_id: user.id,
    customer_phone: customerPhone ?? null,
  };

  if (publisherEntityId) {
    const { data: entity } = await supabase
      .from('publisher_entities')
      .select('id, owner_user_id')
      .eq('id', publisherEntityId)
      .maybeSingle();

    if (entity?.owner_user_id === user.id) {
      throw new Error('لا يمكنك محادثة نفسك');
    }

    if (entity) {
      insertPayload['publisher_entity_id'] = publisherEntityId;
    }
  }

  // Also set company_id if a matching company exists (backward compat with V1)
  if (publisherEntityId) {
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('id', publisherEntityId)
      .maybeSingle();
    if (company) {
      insertPayload['company_id'] = company.id;
    }
  }

  const { data, error } = await supabase
    .from('chats')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) throw error;
  const newChat = data as Chat;

  await supabase.from('chat_messages').insert({
    chat_id: newChat.id,
    sender_user_id: user.id,
    body: 'بدأت محادثة جديدة حول هذا العرض',
    is_system: true,
  });

  // Notify the publisher entity owner
  try {
    if (publisherEntityId) {
      const { data: entity } = await supabase
        .from('publisher_entities')
        .select('owner_user_id')
        .eq('id', publisherEntityId)
        .maybeSingle();

      if (entity?.owner_user_id && entity.owner_user_id !== user.id) {
        await createNotification(
          entity.owner_user_id,
          'new_chat',
          'محادثة جديدة حول عرضكم',
          'بدأ أحد العملاء محادثة جديدة حول عرضكم. يمكنك الرد من خلال المحادثات.',
          'chat',
          newChat.id,
        );
      }
    }
  } catch {
    // notification failure should not block chat creation
  }

  return newChat;
}

export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ChatMessage[];
}

export async function sendMessage(chatId: string, body: string): Promise<ChatMessage> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('يجب تسجيل الدخول');

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      chat_id: chatId,
      sender_user_id: user.id,
      body,
      is_system: false,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as ChatMessage;
}

export function subscribeToChatMessages(chatId: string, onMessage: (msg: ChatMessage) => void) {
  const channel = supabase
    .channel(`chat:${chatId}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` },
      (payload) => onMessage(payload.new as ChatMessage),
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export function buildWhatsAppLink(number: string, message: string): string {
  const cleaned = number.replace(/[^\d]/g, '');
  const text = encodeURIComponent(message);
  return `https://wa.me/${cleaned}?text=${text}`;
}

// ── Publisher entity contacts ──────────────────────────────────────────────

export async function getPublisherEntityContact(
  publisherEntityId: string,
): Promise<PublisherEntityContact | null> {
  const { data, error } = await supabase
    .from('publisher_entity_contacts')
    .select('*')
    .eq('publisher_entity_id', publisherEntityId)
    .maybeSingle();

  if (error) return null;
  return data as PublisherEntityContact | null;
}

// ── Secure contact options via RPC ─────────────────────────────────────────

export async function getOpportunityContactOptions(
  opportunityId: string,
): Promise<OpportunityContactOptions> {
  const { data, error } = await supabase
    .rpc('get_opportunity_contact_options', { p_opportunity_id: opportunityId });

  if (error || !data || data.length === 0) {
    return { chat_available: false, whatsapp_available: false, whatsapp_number: null, whatsapp_message: null };
  }
  return data[0] as OpportunityContactOptions;
}
