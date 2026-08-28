import api from "@/lib/api";

export interface MessageUser {
  id: number;
  name: string;
  display_name?: string;
  custom_nickname?: string | null;
  username: string;
  avatar: string | null;
  cover?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  verified: boolean;
  badges?: string[];
  is_online?: boolean;
  last_seen?: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  created_at?: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: number[];
  has_reacted: boolean;
}

export interface MessageReplySnippet {
  id: number;
  sender_id: number;
  sender_name: string;
  text: string;
}

export interface DirectMessageSharedData {
  type: "post" | "blog" | "series" | "story" | "video" | "snippet" | string;
  id: number | string;
  title?: string;
  author_name?: string;
  author_username?: string;
  author_avatar?: string | null;
  author_verified?: boolean;
  excerpt?: string;
  image?: string | null;
  url?: string;
}

export interface DirectMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  recipient_id: number;
  reply_to_id?: number | null;
  reply_to?: MessageReplySnippet | null;
  text: string;
  image?: string | null;
  images?: string[];
  audio_url?: string | null;
  audio_duration?: number | null;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  file_type?: string | null;
  video_url?: string | null;
  shared_data?: DirectMessageSharedData | null;
  reactions?: MessageReaction[];
  is_edited?: boolean;
  edited_at?: string | null;
  can_edit?: boolean;
  is_starred?: boolean;
  is_seen: boolean;
  seen_at?: string | null;
  created_at: string;
  created_at_human?: string;
  is_pending?: boolean;
  sender?: {
    id: number;
    name: string;
    display_name?: string;
    custom_nickname?: string | null;
    username: string;
    avatar: string | null;
    verified: boolean;
  } | null;
}

export interface ConversationItem {
  id: number;
  is_pinned?: boolean;
  pinned_message?: DirectMessage | null;
  user: MessageUser | null;
  last_message: {
    id?: number;
    text: string;
    created_at: string;
    created_at_iso?: string;
    is_seen: boolean;
    sender_id: number;
  } | null;
  unread_count: number;
  updated_at?: string;
}

export interface ConversationDetailResponse {
  conversation: ConversationItem;
  messages: DirectMessage[];
  has_more: boolean;
  is_following: boolean;
}

export interface MediaGalleryResponse {
  media: DirectMessage[];
  files: DirectMessage[];
  links: DirectMessage[];
}

export const messagesService = {
  async getConversations(): Promise<{ conversations: ConversationItem[]; total_unread: number }> {
    const res = await api.get("/api/conversations");
    return res.data;
  },

  async getConversation(
    id: number | string,
    params?: { before_id?: number; limit?: number }
  ): Promise<ConversationDetailResponse> {
    const res = await api.get(`/api/conversations/${id}`, { params });
    return res.data;
  },

  async startConversation(payload: { recipient_id?: number; username?: string }): Promise<{ conversation: ConversationItem }> {
    const res = await api.post("/api/conversations/start", payload);
    return res.data;
  },

  async sendMessage(
    conversationId: number | string,
    payload: {
      text?: string;
      images?: File[];
      video?: File | null;
      file?: File | null;
      reply_to_id?: number | null;
      audio?: Blob | File | null;
      audio_duration?: number | null;
      shared_data?: DirectMessageSharedData | null;
    }
  ): Promise<{ message: DirectMessage; conversation: ConversationItem }> {
    const formData = new FormData();
    if (payload.text) {
      formData.append("text", payload.text);
    }
    if (payload.reply_to_id) {
      formData.append("reply_to_id", String(payload.reply_to_id));
    }
    if (payload.audio_duration) {
      formData.append("audio_duration", String(payload.audio_duration));
    }
    if (payload.shared_data) {
      formData.append("shared_data", JSON.stringify(payload.shared_data));
    }
    if (payload.audio) {
      const fileName = payload.audio instanceof File ? payload.audio.name : "voice_note.webm";
      formData.append("audio", payload.audio, fileName);
    }
    if (payload.images && payload.images.length > 0) {
      payload.images.forEach((file) => {
        formData.append("images[]", file);
      });
    }
    if (payload.video) {
      formData.append("video", payload.video);
    }
    if (payload.file) {
      formData.append("file", payload.file);
    }

    const res = await api.post(`/api/conversations/${conversationId}/messages`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  async editMessage(
    messageId: number | string,
    text: string
  ): Promise<{ success: boolean; message: DirectMessage; conversation?: ConversationItem }> {
    const res = await api.put(`/api/messages/${messageId}`, { text });
    return res.data;
  },

  async toggleStar(
    messageId: number | string
  ): Promise<{ success: boolean; is_starred: boolean; message: DirectMessage }> {
    const res = await api.post(`/api/messages/${messageId}/star`);
    return res.data;
  },

  async togglePinMessage(
    conversationId: number | string,
    messageId: number | string
  ): Promise<{ success: boolean; conversation: ConversationItem }> {
    const res = await api.post(`/api/conversations/${conversationId}/pin/${messageId}`);
    return res.data;
  },

  async getMediaGallery(
    conversationId: number | string
  ): Promise<MediaGalleryResponse> {
    const res = await api.get(`/api/conversations/${conversationId}/media`);
    return res.data;
  },

  async setContactNickname(
    userId: number | string,
    nickname: string | null
  ): Promise<{ success: boolean; nickname: string | null; display_name: string }> {
    const res = await api.post(`/api/contacts/${userId}/nickname`, { nickname });
    return res.data;
  },

  async searchMessages(
    conversationId: number | string,
    query: string
  ): Promise<{ results: DirectMessage[]; count: number }> {
    const res = await api.get(`/api/conversations/${conversationId}/search`, { params: { q: query } });
    return res.data;
  },

  async deleteMessage(
    conversationId: number | string,
    messageId: number | string
  ): Promise<{ success: boolean; message_id: number; conversation: ConversationItem }> {
    const res = await api.delete(`/api/conversations/${conversationId}/messages/${messageId}`);
    return res.data;
  },

  async togglePin(conversationId: number | string): Promise<{ success: boolean; is_pinned: boolean; conversation: ConversationItem }> {
    const res = await api.post(`/api/conversations/${conversationId}/pin`);
    return res.data;
  },

  async sendTyping(conversationId: number | string, isTyping: boolean): Promise<{ success: boolean }> {
    const res = await api.post(`/api/conversations/${conversationId}/typing`, { is_typing: isTyping });
    return res.data;
  },

  async toggleReaction(
    conversationId: number | string,
    messageId: number | string,
    emoji: string
  ): Promise<{ message: DirectMessage }> {
    const res = await api.post(`/api/conversations/${conversationId}/messages/${messageId}/react`, { emoji });
    return res.data;
  },

  async markAsRead(conversationId: number | string): Promise<{ success: boolean }> {
    const res = await api.post(`/api/conversations/${conversationId}/read`);
    return res.data;
  },

  async deleteConversation(conversationId: number | string): Promise<{ message: string }> {
    const res = await api.delete(`/api/conversations/${conversationId}`);
    return res.data;
  },

  async getUnreadCount(): Promise<{ unread_count: number }> {
    const res = await api.get("/api/messages/unread-count");
    return res.data;
  },
};
