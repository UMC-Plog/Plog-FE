export interface ChatSender {
  id: string
  name: string
  avatarUrl: string
}

interface BaseChatMessage {
  id: string
  projectId: string
  sender: ChatSender
  isMine: boolean
  sentAt: string
}

export interface TextChatMessage extends BaseChatMessage {
  type: 'text'
  text: string
}

export interface FileChatMessage extends BaseChatMessage {
  type: 'file'
  fileName: string
  fileSize: string
  mimeType: string
  dataUrl?: string
}

export type ChatMessage = TextChatMessage | FileChatMessage
