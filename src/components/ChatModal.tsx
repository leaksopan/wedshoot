'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@/hooks/useChat'
import { useAuth } from '@/hooks/useAuth'
import { Message } from '@/types/database'

interface ChatModalProps {
  isOpen: boolean
  onClose: () => void
  vendorId: string
  vendorName: string
  serviceName?: string
}

const ChatModal = ({ isOpen, onClose, vendorId, vendorName, serviceName }: ChatModalProps) => {
  const router = useRouter()
  const { user } = useAuth()
  const { getOrCreateChatRoom, loadMessages, sendMessage, messages, loading } = useChat()
  
  const [roomId, setRoomId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const initializeChatRoom = useCallback(async () => {
    if (!user) {
      // Redirect ke login jika belum authenticate
      router.push('/login')
      return
    }

    const roomId = await getOrCreateChatRoom(vendorId)
    if (roomId) {
      setRoomId(roomId)
      await loadMessages(roomId)
    }
  }, [user, vendorId, getOrCreateChatRoom, loadMessages, router])

  // Initialize chat room ketika modal dibuka
  useEffect(() => {
    if (isOpen && user && vendorId) {
      initializeChatRoom()
    }
  }, [isOpen, user, vendorId, initializeChatRoom])

  // Auto scroll ke pesan terbaru
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!roomId || !messageText.trim() || sending) return

    setSending(true)
    const success = await sendMessage(roomId, messageText)
    
    if (success) {
      setMessageText('')
      // Auto scroll setelah kirim pesan
      setTimeout(scrollToBottom, 100)
    }
    setSending(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const goToFullChat = () => {
    if (roomId) {
      onClose()
      router.push(`/chat/${roomId}`)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg h-[600px] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {vendorName.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{vendorName}</h3>
              {serviceName && (
                <p className="text-red-100 text-sm">Tentang: {serviceName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={goToFullChat}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              title="Buka chat lengkap"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-center">Mulai percakapan dengan {vendorName}</p>
              <p className="text-sm text-center mt-2">Tanyakan tentang layanan, harga, atau detail lainnya</p>
            </div>
          ) : (
            messages.map((message: Message) => {
              const isMyMessage = message.sender_id === user?.id
              return (
                <div key={message.id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${isMyMessage ? 'order-2' : 'order-1'}`}>
                    {/* Sender name untuk pesan bukan dari saya */}
                    {!isMyMessage && (
                      <p className="text-xs text-gray-500 mb-1 px-3">
                        {message.sender?.full_name || vendorName}
                      </p>
                    )}
                    
                    {/* Message bubble */}
                    <div className={`rounded-2xl px-4 py-2 ${
                      isMyMessage 
                        ? 'bg-red-500 text-white' 
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}>
                      {/* Reply preview jika ada */}
                      {message.reply_to && (
                        <div className={`mb-2 p-2 rounded-lg border-l-4 ${
                          isMyMessage 
                            ? 'bg-red-600 border-red-300' 
                            : 'bg-gray-100 border-gray-400'
                        }`}>
                          <p className={`text-xs ${isMyMessage ? 'text-red-200' : 'text-gray-600'}`}>
                            Balasan untuk {message.reply_to.sender?.full_name}
                          </p>
                          <p className={`text-sm ${isMyMessage ? 'text-red-100' : 'text-gray-800'}`}>
                            {message.reply_to.content.substring(0, 50)}...
                          </p>
                        </div>
                      )}

                      {/* Message content */}
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      
                      {/* File attachment jika ada */}
                      {message.file_url && (
                        <div className="mt-2">
                          {message.message_type === 'image' ? (
                            <img 
                              src={message.file_url} 
                              alt="Image" 
                              className="max-w-full h-auto rounded-lg"
                            />
                          ) : (
                            <a 
                              href={message.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={`inline-flex items-center space-x-2 p-2 rounded-lg ${
                                isMyMessage ? 'bg-red-600' : 'bg-gray-100'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-sm">{message.file_name}</span>
                            </a>
                          )}
                        </div>
                      )}
                      
                      {/* Timestamp dan status */}
                      <div className={`flex items-center justify-between mt-2 text-xs ${
                        isMyMessage ? 'text-red-200' : 'text-gray-500'
                      }`}>
                        <span>{formatTime(message.created_at)}</span>
                        {isMyMessage && (
                          <div className="flex items-center space-x-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {message.read_at && (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ketik pesan..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || sending}
              className={`p-3 rounded-xl transition-colors ${
                messageText.trim() && !sending
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {sending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2 text-center">
            Tekan Enter untuk mengirim • Shift+Enter untuk baris baru
          </p>
        </div>
      </div>
    </div>
  )
}

export default ChatModal 