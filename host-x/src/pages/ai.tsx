import { useState, useRef, useEffect } from "react";
import { useAiChat } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Bot, Send, User, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant" | "system"; content: string };

export default function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "مرحباً! أنا مساعد SERVER HUB الذكي 🤖\n\nاسألني عن كودك، أخطائك، تثبيت المكاتب، أو أي شيء يخص مشروعك."
    }
  ]);
  const [input, setInput] = useState("");
  const chatMutation = useAiChat();
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, chatMutation.isPending]);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || chatMutation.isPending) return;
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);

    chatMutation.mutate(
      { data: { message: text, history: newMessages.map(m => ({ role: m.role, content: m.content })) } },
      {
        onSuccess: (res) => setMessages(prev => [...prev, { role: "assistant", content: res.reply }]),
        onError: () => setMessages(prev => [...prev, { role: "system", content: "عذراً، حدث خطأ في الاتصال. حاول مجدداً." }])
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="h-full flex flex-col bg-background" dir="rtl">
      {/* Header */}
      <div className="px-4 py-2 border-b border-border bg-card flex items-center gap-3 shrink-0">
        <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Bot className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold leading-none">المساعد الذكي</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">NVIDIA NIM · SERVER HUB AI</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] text-green-500">متصل</span>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground"
            onClick={() => setMessages([{ role: "assistant", content: "تم مسح المحادثة. كيف يمكنني مساعدتك؟" }])}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages — scrollable */}
      <div ref={messagesRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5
              ${m.role === "user" ? "bg-primary text-primary-foreground"
                : m.role === "system" ? "bg-destructive/20" : "bg-muted border border-border"}`}>
              {m.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5 text-primary" />}
            </div>
            <div className={`rounded-2xl px-3.5 py-2.5 max-w-[88%] text-sm leading-relaxed
              ${m.role === "user"
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : m.role === "system"
                  ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-sm"
                  : "bg-muted/50 text-foreground border border-border/40 rounded-tl-sm"
              }`}>
              {m.role === "user" ? (
                <span className="whitespace-pre-wrap">{m.content}</span>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none break-words
                  prose-p:my-1 prose-headings:my-2
                  prose-code:text-primary prose-code:bg-primary/10 prose-code:rounded prose-code:px-1 prose-code:before:content-none prose-code:after:content-none prose-code:text-[11px] prose-code:font-mono
                  prose-pre:my-2 prose-pre:bg-background prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:text-xs prose-pre:p-3
                  prose-ul:my-1 prose-li:my-0.5">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-primary animate-pulse" />
            </div>
            <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-muted/50 border border-border/40">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input — pinned at bottom, safe-area aware */}
      <div className="shrink-0 border-t border-border bg-card px-3 pt-2 pb-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اسألني أي شيء... (Enter إرسال · Shift+Enter سطر جديد)"
            rows={1}
            className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground resize-none overflow-hidden leading-relaxed"
            disabled={chatMutation.isPending}
            style={{ minHeight: "42px", maxHeight: "120px" }}
          />
          <Button
            type="button"
            size="icon"
            className="w-10 h-10 rounded-xl shrink-0 self-end"
            disabled={chatMutation.isPending || !input.trim()}
            onClick={handleSend}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
