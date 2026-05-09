"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useChat } from "@/hooks";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { ChatEmptyState } from "./chat-empty-state";
import { ToolApprovalDialog } from "./tool-approval-dialog";
import { ChevronDown, Check, Database } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui";
import type { PendingApproval, Decision } from "@/types";
import { useConversationStore, useChatStore } from "@/stores";
import { useConversations } from "@/hooks";
import { useKBPanelStore } from "@/stores";

export function ChatContainer() {
  return <AuthenticatedChatContainer />;
}

function AuthenticatedChatContainer() {
  const { currentConversationId, currentMessages } = useConversationStore();
  const { addMessage: addChatMessage } = useChatStore();
  const { fetchConversations } = useConversations();
  const prevConversationIdRef = useRef<string | null | undefined>(undefined);

  const handleConversationCreated = useCallback(
    (conversationId: string) => {
      fetchConversations();
    },
    [fetchConversations],
  );

  const {
    messages,
    isConnected,
    isProcessing,
    connect,
    disconnect,
    sendMessage,
    clearMessages,
    setModel,
    pendingApproval,
    sendResumeDecisions,
  } = useChat({
    conversationId: currentConversationId,
    onConversationCreated: handleConversationCreated,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Clear messages when conversation changes, but NOT when going from null to a new ID
  // (that happens when a new chat is saved - we want to keep the messages)
  useEffect(() => {
    const prevId = prevConversationIdRef.current;
    const currId = currentConversationId;

    // Skip initial mount
    if (prevId === undefined) {
      prevConversationIdRef.current = currId;
      return;
    }

    // Clear messages when:
    // 1. Going from a conversation to null (new chat)
    // 2. Switching between two different conversations
    // Do NOT clear when going from null to a conversation (new chat being saved)
    const shouldClear =
      currId === null || // Going to new chat
      (prevId !== null && prevId !== currId); // Switching between conversations

    if (shouldClear) {
      clearMessages();
    }

    prevConversationIdRef.current = currId;
  }, [currentConversationId, clearMessages]);

  // Load messages from conversation store when switching to a saved conversation
  useEffect(() => {
    if (currentMessages.length > 0) {
      clearMessages();
      currentMessages.forEach((msg) => {
        addChatMessage({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          conversationId: msg.conversation_id,
          toolCalls: msg.tool_calls?.map((tc) => ({
            id: tc.tool_call_id,
            name: tc.tool_name,
            args: tc.args,
            result: tc.result,
            status: tc.status === "failed" ? "error" : tc.status,
          })),
          user_rating: msg.user_rating ?? undefined,
          rating_count: msg.rating_count ?? undefined,
          fileIds:
            "files" in msg && Array.isArray((msg as unknown as { files?: unknown[] }).files)
              ? (msg as unknown as { files: { id: string }[] }).files.map((f) => f.id)
              : undefined,
        });
      });
    }
  }, [currentMessages, addChatMessage, clearMessages]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    // Only auto-scroll if user is already near the bottom
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  const { toggle: toggleKBPanel } = useKBPanelStore();

  const handleRegenerate = useCallback(
    (assistantMessageId: string) => {
      const idx = messages.findIndex((m) => m.id === assistantMessageId);
      if (idx < 0) return;
      // Walk backwards to find the user message that prompted this turn.
      for (let i = idx - 1; i >= 0; i--) {
        const m = messages[i];
        if (m?.role === "user") {
          sendMessage(m.content, m.fileIds);
          return;
        }
      }
    },
    [messages, sendMessage],
  );

  return (
    <ChatUI
      messages={messages}
      isConnected={isConnected}
      isProcessing={isProcessing}
      sendMessage={sendMessage}
      onModelChange={setModel}
      onRegenerate={handleRegenerate}
      messagesEndRef={messagesEndRef}
      scrollContainerRef={scrollContainerRef}
      pendingApproval={pendingApproval}
      onResumeDecisions={sendResumeDecisions}
      onToggleKBPanel={toggleKBPanel}
    />
  );
}

function ModelSelector({ onChange }: { onChange: (model: string | null) => void }) {
  const [availableModels, setAvailableModels] = useState<{ value: string; label: string }[]>([
    { value: "", label: "Default" },
  ]);
  const [selected, setSelected] = useState<{ value: string; label: string }>(
    availableModels[0] ?? { value: "", label: "Default" },
  );

  useEffect(() => {
    fetch("/api/v1/agent/models", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.models) {
          const models = [
            { value: "", label: `Default (${data.default})` },
            ...data.models.map((m: string) => ({ value: m, label: m })),
          ];
          setAvailableModels(models);
          setSelected(models[0]);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="text-foreground/55 hover:bg-foreground/5 hover:text-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[11px] tracking-wider uppercase transition-colors">
          {selected.label}
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {availableModels.map((m) => (
          <DropdownMenuItem
            key={m.value}
            onClick={() => {
              setSelected(m);
              onChange(m.value || null);
            }}
            className="flex items-center justify-between text-xs"
          >
            {m.label}
            {selected.value === m.value && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ChatUIProps {
  messages: import("@/types").ChatMessage[];
  isConnected: boolean;
  isProcessing: boolean;
  sendMessage: (content: string, fileIds?: string[]) => void;
  onModelChange?: (model: string | null) => void;
  onRegenerate?: (messageId: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  pendingApproval?: PendingApproval | null;
  onResumeDecisions?: (decisions: Decision[]) => void;
  onToggleKBPanel?: () => void;
}

function ChatUI({
  messages,
  isConnected,
  isProcessing,
  sendMessage,
  onModelChange,
  onRegenerate,
  messagesEndRef,
  scrollContainerRef,
  pendingApproval,
  onResumeDecisions,
  onToggleKBPanel,
}: ChatUIProps) {
  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
      <div
        ref={scrollContainerRef}
        className="flex-1 scrollbar-thin overflow-y-auto px-2 py-4 sm:px-4 sm:py-6"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center">
            <ChatEmptyState onPick={(prompt) => sendMessage(prompt)} />
          </div>
        ) : (
          <MessageList messages={messages} onRegenerate={onRegenerate} />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Human-in-the-Loop: Tool Approval Dialog */}
      {pendingApproval && onResumeDecisions && (
        <div className="px-2 pb-2 sm:px-4 sm:pb-2">
          <ToolApprovalDialog
            actionRequests={pendingApproval.actionRequests}
            reviewConfigs={pendingApproval.reviewConfigs}
            onDecisions={onResumeDecisions}
            disabled={!isConnected}
          />
        </div>
      )}

      <div className="px-2 pb-2 sm:px-4 sm:pb-4">
        <div className="bg-card border-foreground/10 focus-within:border-foreground/30 rounded-2xl border shadow-sm transition-colors">
          <div className="px-3 pt-3 sm:px-4 sm:pt-4">
            <ChatInput
              onSend={sendMessage}
              disabled={!isConnected || !!pendingApproval}
              isProcessing={isProcessing}
            />
          </div>
          <div className="border-foreground/8 flex items-center justify-between border-t px-3 py-2 sm:px-4">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase ${isConnected ? "text-foreground/55" : "text-destructive"}`}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    isConnected ? "bg-brand" : "bg-destructive"
                  } ${isConnected ? "animate-pulse" : ""}`}
                />
                {isConnected ? "Live" : "Offline"}
              </span>
              {onToggleKBPanel && (
                <button
                  onClick={onToggleKBPanel}
                  className="text-foreground/55 hover:bg-foreground/5 hover:text-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                  title="Toggle knowledge bases"
                >
                  <Database className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">KB</span>
                </button>
              )}
            </div>
            {onModelChange && <ModelSelector onChange={onModelChange} />}
          </div>
        </div>
        <p className="text-foreground/40 mt-2 text-center font-mono text-[10px] tracking-wider uppercase">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
