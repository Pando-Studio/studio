'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui';
import { Send, User, Bot, FileText } from 'lucide-react';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  citations?: Array<{
    sourceId: string;
    content: string;
    score: number;
  }>;
  createdAt: string;
}

interface Conversation {
  id: string;
  title?: string;
  messages: Message[];
}

export default function ChatPage() {
  const params = useParams();
  const studioId = params.id as string;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (studioId) {
      fetchConversations();
    }
  }, [studioId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/studios/${studioId}/chat`);
      const data = await response.json();
      setConversations(data.conversations || []);
      if (data.conversations?.[0]) {
        setCurrentConversation(data.conversations[0]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);

    // Optimistic update
    const tempMessage: Message = {
      id: 'temp-' + Date.now(),
      role: 'USER',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };

    if (currentConversation) {
      setCurrentConversation({
        ...currentConversation,
        messages: [...currentConversation.messages, tempMessage],
      });
    }

    try {
      const response = await fetch(`/api/studios/${studioId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationId: currentConversation?.id,
          mode: 'ASK',
        }),
      });

      const data = await response.json();

      if (data.message) {
        setCurrentConversation((prev) => {
          if (!prev) {
            return {
              id: data.conversationId,
              messages: [tempMessage, data.message],
            };
          }
          return {
            ...prev,
            id: data.conversationId,
            messages: [
              ...prev.messages.filter((m) => m.id !== tempMessage.id),
              { ...tempMessage, id: 'user-' + Date.now() },
              data.message,
            ],
          };
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] p-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Chat avec vos sources</h1>
        <p className="text-muted-foreground">
          Posez des questions sur vos documents et obtenez des reponses basees sur votre contenu
        </p>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-auto border rounded-lg p-4 mb-4 bg-muted/20">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-muted-foreground">Chargement...</div>
          </div>
        ) : !currentConversation?.messages.length ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Commencez une conversation</h3>
            <p className="text-muted-foreground text-sm max-w-md mt-2">
              Posez une question sur vos documents. L'assistant utilisera le contenu de vos sources
              pour vous repondre.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentConversation.messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'USER' ? 'justify-end' : ''
                }`}
              >
                {message.role !== 'USER' && (
                  <div className="p-2 bg-primary/10 rounded-lg h-fit">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.role === 'USER'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.citations && message.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs font-medium mb-2 opacity-70">Sources:</p>
                      <div className="space-y-1">
                        {message.citations.slice(0, 3).map((citation, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-xs opacity-70"
                          >
                            <FileText className="h-3 w-3 mt-0.5" />
                            <span className="line-clamp-1">{citation.content}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {message.role === 'USER' && (
                  <div className="p-2 bg-muted rounded-lg h-fit">
                    <User className="h-5 w-5" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Posez une question sur vos sources..."
          className="flex-1 min-h-[44px] max-h-32 px-4 py-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          rows={1}
          disabled={sending}
        />
        <Button onClick={sendMessage} disabled={!input.trim() || sending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
