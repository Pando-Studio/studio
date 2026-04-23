'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui';
import {
  useStudio,
  useSources,
  useConversations,
} from '../context/StudioContext';
import type { ConversationMessage } from '../context/StudioContext';
import {
  useStudioConversations,
  useConversation,
  useCreateConversation,
  useDeleteConversation,
  useRenameConversation,
} from '@/lib/queries';
import {
  Send,
  Plus,
  MessageSquare,
  FileText,
  Sparkles,
  Bot,
  User,
  Loader2,
  ChevronDown,
  Trash2,
  Pencil,
  Copy,
  X,
  Settings2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { MarkdownMessage } from '../MarkdownMessage';
import { toolLabels, toolTemplateIds, type PlanStep } from '@/lib/ai/chat-tools';
import { useMentions, type MentionItem } from '@/hooks/use-mentions';
import { MentionDropdown } from '../MentionDropdown';
import { GenerationPlanCard } from '../GenerationPlanCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CitationInfo {
  id: string;
  name: string;
  chunkId?: string;
  excerpt?: string;
}

interface ToolCall {
  toolName: string;
  args: Record<string, unknown>;
}

interface PendingApproval {
  toolName: string;
  args: Record<string, unknown> | null;
  templateName: string;
  templateId: string;
}

interface MessageWithMetadata extends ConversationMessage {
  metadata?: {
    toolCalls?: ToolCall[];
    pendingApprovals?: PendingApproval[];
  } | null;
  /** Inline pending approvals parsed from stream */
  pendingApprovals?: PendingApproval[];
}

// ---------------------------------------------------------------------------
// Tool Approval Card
// ---------------------------------------------------------------------------

const TOOL_APPROVAL_SEPARATOR = '\n\n---TOOL_APPROVAL---\n';

interface ToolApprovalCardProps {
  approval: PendingApproval;
  studioId: string;
  conversationId: string | null;
  onApproved: () => void;
  onCancelled: () => void;
}

function ToolApprovalCard({ approval, studioId, conversationId, onApproved, onCancelled }: ToolApprovalCardProps) {
  const [status, setStatus] = useState<'pending' | 'editing' | 'generating' | 'done' | 'cancelled'>('pending');
  const [editArgs, setEditArgs] = useState<Record<string, unknown>>(approval.args ?? {});
  const [editTitle, setEditTitle] = useState((approval.args?.title as string) ?? '');

  const handleApprove = async (args: Record<string, unknown>) => {
    setStatus('generating');
    try {
      const response = await fetch(`/api/studios/${studioId}/chat/approve-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: approval.toolName,
          args,
          conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute tool');
      }

      setStatus('done');
      onApproved();
      toast.success('Generation lancee');
    } catch {
      setStatus('pending');
      toast.error('Erreur lors de la generation');
    }
  };

  const handleCancel = () => {
    setStatus('cancelled');
    onCancelled();
  };

  if (status === 'cancelled') {
    return (
      <div className="mt-3 p-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-muted-foreground">
        Generation annulee.
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="mt-3 p-3 rounded-lg border border-green-200 bg-green-50 text-sm text-green-700 flex items-center gap-2">
        <Check className="h-4 w-4" />
        Generation lancee avec succes. Suivez la progression dans le panneau de droite.
      </div>
    );
  }

  const title = editTitle || (approval.args?.title as string) || 'Sans titre';

  return (
    <div className="mt-3 p-3 rounded-lg border border-blue-200 bg-blue-50/50">
      <div className="flex items-start gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-blue-900">{approval.templateName}</div>
          <div className="text-xs text-blue-700 mt-0.5">Titre: {title}</div>
          {approval.args && Object.keys(approval.args).length > 1 && (
            <div className="text-xs text-blue-600 mt-1">
              {Object.entries(approval.args)
                .filter(([k]) => k !== 'title')
                .map(([k, v]) => `${k}: ${String(v)}`)
                .join(' / ')}
            </div>
          )}
        </div>
      </div>

      {status === 'editing' && (
        <div className="mb-3 space-y-2">
          <div>
            <label className="text-xs font-medium text-blue-800">Titre</label>
            <input
              className="w-full mt-0.5 text-sm rounded border border-blue-200 bg-white px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
              value={editTitle}
              onChange={(e) => {
                setEditTitle(e.target.value);
                setEditArgs((prev) => ({ ...prev, title: e.target.value }));
              }}
            />
          </div>
          {Object.entries(editArgs)
            .filter(([k]) => k !== 'title')
            .map(([key, value]) => (
              <div key={key}>
                <label className="text-xs font-medium text-blue-800">{key}</label>
                <input
                  className="w-full mt-0.5 text-sm rounded border border-blue-200 bg-white px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
                  value={String(value ?? '')}
                  onChange={(e) =>
                    setEditArgs((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => handleApprove(status === 'editing' ? editArgs : (approval.args ?? {}))}
          disabled={status === 'generating'}
          className="gap-1"
        >
          {status === 'generating' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          Generer
        </Button>
        {status !== 'editing' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatus('editing')}
            disabled={status === 'generating'}
            className="gap-1"
          >
            <Settings2 className="h-3 w-3" />
            Modifier
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={status === 'generating'}
          className="gap-1 text-destructive hover:text-destructive"
        >
          <X className="h-3 w-3" />
          Annuler
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Source Attribution Footer
// ---------------------------------------------------------------------------

interface SourceAttributionProps {
  citations: CitationInfo[];
}

function SourceAttribution({ citations }: SourceAttributionProps) {
  if (citations.length === 0) return null;
  return (
    <div className="mt-2 pt-2 border-t border-gray-100">
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs text-muted-foreground">Sources:</span>
        {citations.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-xs text-muted-foreground"
          >
            <FileText className="h-2.5 w-2.5 mr-0.5" />
            {c.name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChatPanel
// ---------------------------------------------------------------------------

export function ChatPanel() {
  const { studio, widgets, conversations: studioConversations, isViewer } = useStudio();
  const { sources, selectedSourceIds } = useSources();
  const { activeConversationId, setActiveConversationId } = useConversations();

  const studioId = studio?.id ?? '';
  const conversationsQuery = useStudioConversations(studioId);
  const activeConvQuery = useConversation(studioId, activeConversationId);
  const createConvMut = useCreateConversation(studioId);
  const deleteConvMut = useDeleteConversation(studioId);
  const renameConvMut = useRenameConversation(studioId);

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localMessages, setLocalMessages] = useState<MessageWithMetadata[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(activeConversationId ?? null);
  const [generatingWidget, setGeneratingWidget] = useState<string | null>(null);
  const [showConvList, setShowConvList] = useState(false);
  const [renamingConvId, setRenamingConvId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [citationMap, setCitationMap] = useState<Record<string, { sourceId: string; chunkId?: string; excerpt?: string }>>({});
  const [messageCitations, setMessageCitations] = useState<CitationInfo[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const convListRef = useRef<HTMLDivElement>(null);

  // @mentions hook
  const mentions = useMentions({
    sources,
    widgets,
    conversations: studioConversations,
  });

  // Load messages from server when switching conversations
  useEffect(() => {
    if (activeConvQuery.data?.messages) {
      const serverMessages: MessageWithMetadata[] = activeConvQuery.data.messages.map((m: ConversationMessage) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        metadata: m.metadata as MessageWithMetadata['metadata'],
      }));
      setLocalMessages(serverMessages);
      setConversationId(activeConversationId ?? null);
    }
  }, [activeConvQuery.data, activeConversationId]);

  // Auto-select most recent conversation on mount
  useEffect(() => {
    if (!activeConversationId && conversationsQuery.data?.length) {
      setActiveConversationId(conversationsQuery.data[0].id);
    }
  }, [activeConversationId, conversationsQuery.data, setActiveConversationId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (convListRef.current && !convListRef.current.contains(e.target as Node)) {
        setShowConvList(false);
      }
    };
    if (showConvList) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showConvList]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }
  }, []);

  const handleNewConversation = async () => {
    try {
      const result = await createConvMut.mutateAsync({});
      if (result.conversation) {
        setActiveConversationId(result.conversation.id);
        setLocalMessages([]);
        setConversationId(result.conversation.id);
        setShowConvList(false);
      }
    } catch {
      toast.error('Impossible de creer la conversation');
    }
  };

  const handleSwitchConversation = (convId: string) => {
    setActiveConversationId(convId);
    setShowConvList(false);
  };

  const handleDeleteConversation = async (convId: string) => {
    try {
      await deleteConvMut.mutateAsync(convId);
      if (activeConversationId === convId) {
        const remaining = conversationsQuery.data?.filter((c) => c.id !== convId);
        setActiveConversationId(remaining?.[0]?.id);
        setLocalMessages([]);
        setConversationId(null);
      }
      toast.success('Conversation supprimee');
    } catch {
      toast.error('Impossible de supprimer la conversation');
    }
  };

  const handleRenameConversation = async (convId: string) => {
    if (!renameValue.trim()) return;
    try {
      await renameConvMut.mutateAsync({ conversationId: convId, title: renameValue.trim() });
      setRenamingConvId(null);
      setRenameValue('');
    } catch {
      toast.error('Impossible de renommer la conversation');
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  /**
   * Parse a streamed response that may contain a tool approval separator.
   * Returns the text content and any pending approvals.
   */
  const parseStreamedContent = (raw: string): { text: string; approvals: PendingApproval[] } => {
    const sepIdx = raw.indexOf(TOOL_APPROVAL_SEPARATOR);
    if (sepIdx === -1) return { text: raw, approvals: [] };

    const text = raw.substring(0, sepIdx);
    const jsonStr = raw.substring(sepIdx + TOOL_APPROVAL_SEPARATOR.length);
    try {
      const approvals = JSON.parse(jsonStr) as PendingApproval[];
      return { text, approvals };
    } catch {
      return { text: raw, approvals: [] };
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || !studio) return;

    const userMessage: MessageWithMetadata = {
      id: `msg-${Date.now()}`,
      role: 'USER',
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };

    setLocalMessages((prev) => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);
    mentions.close();

    try {
      const sourceIdsToUse = Array.from(selectedSourceIds);

      const response = await fetch(`/api/studios/${studio.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          sourceIds: sourceIdsToUse,
          conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Read conversation ID from header
      const newConversationId = response.headers.get('X-Conversation-Id');
      if (newConversationId && !conversationId) {
        setConversationId(newConversationId);
      }

      // Parse citations from response header (now includes excerpt)
      const citationsHeader = response.headers.get('X-Citations');
      let currentCitations: CitationInfo[] = [];
      if (citationsHeader) {
        try {
          const parsed = JSON.parse(decodeURIComponent(citationsHeader)) as CitationInfo[];
          currentCitations = parsed;
          const newMap: Record<string, { sourceId: string; chunkId?: string; excerpt?: string }> = {};
          for (const c of parsed) {
            newMap[c.name] = { sourceId: c.id, chunkId: c.chunkId, excerpt: c.excerpt };
          }
          setCitationMap((prev) => ({ ...prev, ...newMap }));
          setMessageCitations(parsed);
        } catch {
          // ignore parse errors
        }
      }

      // Create a placeholder assistant message for streaming
      const streamingMsgId = `msg-stream-${Date.now()}`;
      const streamingMessage: MessageWithMetadata = {
        id: streamingMsgId,
        role: 'ASSISTANT',
        content: '',
        createdAt: new Date().toISOString(),
      };
      setLocalMessages((prev) => [...prev, streamingMessage]);

      // Read the plain text stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;

        // Parse for tool approvals and update display content
        const { text: displayText } = parseStreamedContent(fullContent);
        setLocalMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamingMsgId
              ? { ...msg, content: displayText }
              : msg
          )
        );
      }

      // Final parse — extract pending approvals
      const { text: finalText, approvals } = parseStreamedContent(fullContent);
      setLocalMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMsgId
            ? {
                ...msg,
                content: finalText,
                pendingApprovals: approvals.length > 0 ? approvals : undefined,
              }
            : msg
        )
      );
    } catch {
      toast.error("Erreur lors de l'envoi du message");
      const errorMessage: MessageWithMetadata = {
        id: `msg-${Date.now() + 1}`,
        role: 'ASSISTANT',
        content: 'Desole, une erreur est survenue. Veuillez reessayer.',
        createdAt: new Date().toISOString(),
      };
      setLocalMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => sendMessage(message);

  const handleGenerate = async (toolCall: ToolCall) => {
    if (!studio) return;

    setGeneratingWidget(toolCall.toolName);

    try {
      const templateId = toolTemplateIds[toolCall.toolName];
      const sourceIds = Array.from(selectedSourceIds);

      if (!templateId) {
        throw new Error(`No template configured for ${toolCall.toolName}`);
      }

      // Use unified async generation endpoint
      const response = await fetch(`/api/studios/${studio.id}/widgets/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetTemplateId: templateId,
          title: (toolCall.args.title as string) || 'Sans titre',
          inputs: toolCall.args,
          sourceIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate');
      }

      // Add success message
      const successMessage: MessageWithMetadata = {
        id: `msg-${Date.now()}`,
        role: 'ASSISTANT',
        content: 'La generation a ete lancee avec succes. Vous pouvez suivre sa progression dans le panneau de droite.',
        createdAt: new Date().toISOString(),
      };
      setLocalMessages((prev) => [...prev, successMessage]);
    } catch {
      toast.error('Erreur lors de la generation');
      const errorMessage: MessageWithMetadata = {
        id: `msg-${Date.now()}`,
        role: 'ASSISTANT',
        content: 'Desole, une erreur est survenue lors de la generation. Veuillez reessayer.',
        createdAt: new Date().toISOString(),
      };
      setLocalMessages((prev) => [...prev, errorMessage]);
    } finally {
      setGeneratingWidget(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Let mention handler intercept first
    if (mentions.handleKeyDown(e)) {
      // If Enter/Tab was intercepted for mention selection, handle it
      if ((e.key === 'Enter' || e.key === 'Tab') && mentions.state.items.length > 0) {
        const item = mentions.state.items[mentions.state.highlightIndex];
        if (item) {
          const newValue = mentions.selectMention(item, message);
          setMessage(newValue);
          resizeTextarea();
        }
      }
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMentionSelect = (item: MentionItem) => {
    const newValue = mentions.selectMention(item, message);
    setMessage(newValue);
    textareaRef.current?.focus();
    resizeTextarea();
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Message copie');
  };

  // Get approvals from either inline stream data or server metadata
  const getApprovals = (msg: MessageWithMetadata): PendingApproval[] => {
    if (msg.pendingApprovals && msg.pendingApprovals.length > 0) {
      return msg.pendingApprovals;
    }
    if (msg.metadata?.pendingApprovals && msg.metadata.pendingApprovals.length > 0) {
      return msg.metadata.pendingApprovals;
    }
    return [];
  };

  if (isViewer) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center px-6">
        <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Mode lecture</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Le chat est disponible pour les membres du studio. Explorez les widgets dans le panneau de droite.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Conversation header */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 bg-white">
        <div className="relative flex-1" ref={convListRef}>
          {/* Conversation dropdown trigger */}
          <button
            onClick={() => setShowConvList(!showConvList)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-md border border-gray-200 hover:bg-gray-50 transition-colors w-full text-left"
          >
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm truncate flex-1">
              {activeConvQuery.data?.title || 'Nouvelle conversation'}
            </span>
            <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', showConvList && 'rotate-180')} />
          </button>

          {/* Conversation list dropdown */}
          {showConvList && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
              <div className="p-1">
                <button
                  onClick={handleNewConversation}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-yellow-50 transition-colors text-primary"
                >
                  <Plus className="h-4 w-4" />
                  Nouvelle conversation
                </button>
                {conversationsQuery.data?.length ? (
                  <div className="border-t my-1" />
                ) : null}
                {conversationsQuery.data?.map((conv) => (
                  <div
                    key={conv.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md group',
                      conv.id === activeConversationId ? 'bg-yellow-50' : 'hover:bg-gray-50',
                    )}
                  >
                    {renamingConvId === conv.id ? (
                      <form
                        className="flex-1 flex gap-1"
                        onSubmit={(e) => { e.preventDefault(); handleRenameConversation(conv.id); }}
                      >
                        <input
                          className="flex-1 text-sm bg-transparent border-b border-primary outline-none"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          autoFocus
                          onBlur={() => setRenamingConvId(null)}
                        />
                      </form>
                    ) : (
                      <button
                        onClick={() => handleSwitchConversation(conv.id)}
                        className="flex-1 text-left min-w-0"
                      >
                        <div className="text-sm truncate">{conv.title || 'Sans titre'}</div>
                        <div className="text-xs text-muted-foreground">
                          {conv._count?.messages ?? 0} messages
                        </div>
                      </button>
                    )}
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingConvId(conv.id);
                          setRenameValue(conv.title || '');
                        }}
                        className="p-1 rounded hover:bg-muted"
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conv.id);
                        }}
                        className="p-1 rounded hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Selected sources indicator */}
        {selectedSourceIds.size > 0 && (
          <div className="flex items-center gap-2 px-2.5 py-1 bg-yellow-100 rounded-full flex-shrink-0">
            <FileText className="h-3.5 w-3.5 text-yellow-700" />
            <span className="text-xs font-medium text-yellow-700">
              {selectedSourceIds.size} source{selectedSourceIds.size > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {localMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-4 bg-yellow-100 rounded-full mb-4">
              <Sparkles className="h-8 w-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Bienvenue dans votre Studio
            </h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Posez des questions sur vos sources, generez du contenu interactif,
              ou laissez l&apos;IA vous aider a planifier vos formations.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 hover:bg-yellow-50 hover:border-primary"
                onClick={() => sendMessage('Resume les points cles de mes sources')}
                disabled={isLoading}
              >
                Resumer les sources
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 hover:bg-yellow-50 hover:border-primary"
                onClick={() => sendMessage('Genere un quiz sur le contenu')}
                disabled={isLoading}
              >
                Generer un quiz
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-300 hover:bg-yellow-50 hover:border-primary"
                onClick={() => sendMessage('Cree un nuage de mots')}
                disabled={isLoading}
              >
                Nuage de mots
              </Button>
            </div>
          </div>
        ) : (
          <>
            {localMessages.map((msg) => {
              const approvals = getApprovals(msg);
              return (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-3',
                    msg.role === 'USER' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'ASSISTANT' && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-yellow-600" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[70%] rounded-lg px-4 py-2 group/msg relative',
                      msg.role === 'USER'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-white border border-gray-200'
                    )}
                  >
                    {msg.role === 'ASSISTANT' ? (
                      <>
                        <MarkdownMessage content={msg.content} citationMap={citationMap} />
                        {/* Copy button */}
                        <button
                          onClick={() => handleCopyMessage(msg.content)}
                          className="absolute top-1 right-1 p-1 rounded opacity-0 group-hover/msg:opacity-100 hover:bg-background/50 transition-opacity"
                          title="Copier"
                        >
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}

                    {/* Tool approval cards (new needsApproval flow) */}
                    {approvals.map((approval, i) => {
                      // Special case: generation plan tool
                      if (approval.toolName === 'propose_generation_plan' && approval.args) {
                        const planArgs = approval.args as {
                          planTitle?: string;
                          planDescription?: string;
                          steps?: PlanStep[];
                        };
                        return (
                          <GenerationPlanCard
                            key={`plan-${i}`}
                            planTitle={planArgs.planTitle ?? 'Plan de generation'}
                            planDescription={planArgs.planDescription ?? ''}
                            steps={planArgs.steps ?? []}
                            studioId={studioId}
                            conversationId={conversationId}
                            onPlanStarted={(planId) => {
                              const startMsg: MessageWithMetadata = {
                                id: `msg-${Date.now()}`,
                                role: 'ASSISTANT',
                                content: `Plan de generation lance (${planArgs.steps?.length ?? 0} etapes). Suivez la progression ci-dessus.`,
                                createdAt: new Date().toISOString(),
                              };
                              setLocalMessages((prev) => [...prev, startMsg]);
                              void planId; // used for tracking
                            }}
                            onPlanComplete={(results) => {
                              const completedCount = results.filter(
                                (r) => r.status === 'completed',
                              ).length;
                              const doneMsg: MessageWithMetadata = {
                                id: `msg-${Date.now()}`,
                                role: 'ASSISTANT',
                                content: `Plan termine: ${completedCount}/${results.length} widget(s) genere(s) avec succes.`,
                                createdAt: new Date().toISOString(),
                              };
                              setLocalMessages((prev) => [...prev, doneMsg]);
                            }}
                            onCancelled={() => {}}
                          />
                        );
                      }

                      // Regular tool approval card
                      return (
                        <ToolApprovalCard
                          key={`${approval.toolName}-${i}`}
                          approval={approval}
                          studioId={studioId}
                          conversationId={conversationId}
                          onApproved={() => {
                            const successMsg: MessageWithMetadata = {
                              id: `msg-${Date.now()}`,
                              role: 'ASSISTANT',
                              content: `Generation lancee: ${(approval.args?.title as string) || approval.templateName}`,
                              createdAt: new Date().toISOString(),
                            };
                            setLocalMessages((prev) => [...prev, successMsg]);
                          }}
                          onCancelled={() => {}}
                        />
                      );
                    })}

                    {/* Legacy tool call buttons (for messages loaded from server without pendingApprovals) */}
                    {approvals.length === 0 && msg.metadata?.toolCalls?.map((toolCall, i) => (
                      <GenerateButton
                        key={i}
                        toolCall={toolCall}
                        onGenerate={() => handleGenerate(toolCall)}
                        isGenerating={generatingWidget === toolCall.toolName}
                      />
                    ))}

                    {/* Source attribution footer */}
                    {msg.role === 'ASSISTANT' && messageCitations.length > 0 && msg.content.includes('[Source:') && (
                      <SourceAttribution citations={messageCitations} />
                    )}
                  </div>
                  {msg.role === 'USER' && (
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-500" />
                    </div>
                  )}
                </div>
              );
            })}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="relative">
          {/* @mention dropdown */}
          {mentions.state.isOpen && (
            <MentionDropdown
              items={mentions.state.items}
              highlightIndex={mentions.state.highlightIndex}
              onSelect={handleMentionSelect}
            />
          )}

          {/* Message input */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => {
                  const val = e.target.value;
                  setMessage(val);
                  resizeTextarea();
                  // Trigger @mention detection
                  mentions.handleInputChange(val, e.target.selectionStart ?? val.length);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Posez une question ou tapez @ pour mentionner..."
                className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none min-h-[36px] max-h-[120px]"
                disabled={isLoading}
                rows={1}
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
              className="h-9 w-9 p-0 flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legacy GenerateButton (for backward compat with old messages)
// ---------------------------------------------------------------------------

interface GenerateButtonProps {
  toolCall: ToolCall;
  onGenerate: () => void;
  isGenerating: boolean;
}

function GenerateButton({ toolCall, onGenerate, isGenerating }: GenerateButtonProps) {
  const label = toolLabels[toolCall.toolName] || `Generer (${toolCall.toolName})`;

  return (
    <Button
      onClick={onGenerate}
      disabled={isGenerating}
      className="mt-3"
      size="sm"
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Sparkles className="h-4 w-4 mr-2" />
      )}
      {label}
    </Button>
  );
}
