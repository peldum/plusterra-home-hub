import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type ChatMsg = { role: 'user' | 'assistant'; content: string };

const ALLOWED = new Set(['superadmin', 'admin', 'accounting', 'secretaria']);

const SUGGESTIONS = [
  '¿Cómo registro una garantía?',
  '¿Dónde cargo un pago de alquiler?',
  '¿Cómo genero un reporte mensual?',
  '¿Dónde veo las comisiones del mes?',
];

export const InternalAIChat = () => {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [quota, setQuota] = useState<{ limit: number; remaining: number; enabled: boolean; kill: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const allowed = !!user && !!role && ALLOWED.has(role);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data } = await supabase.rpc('get_user_chat_quota', { _uid: user.id });
      const q = Array.isArray(data) ? data[0] : data;
      if (q) {
        setQuota({
          limit: q.daily_limit,
          remaining: q.remaining,
          enabled: q.is_enabled,
          kill: q.kill_switch,
        });
        setRemaining(q.remaining);
      }
    })();
  }, [open, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  if (!allowed) return null;

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || sending) return;
    setInput('');
    const next: ChatMsg[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-internal-chat', {
        body: { question: q, history: messages.slice(-6) },
      });
      if (error) {
        const msg = (error as any)?.context?.body
          ? (await tryReadErr((error as any).context))
          : error.message;
        toast.error(msg || 'Error consultando al asistente');
        setMessages([...next, { role: 'assistant', content: `⚠️ ${msg || 'Error'}` }]);
      } else {
        setMessages([...next, { role: 'assistant', content: data.answer }]);
        if (typeof data.remaining === 'number') setRemaining(data.remaining);
      }
    } catch (e: any) {
      toast.error('Error de conexión');
      setMessages([...next, { role: 'assistant', content: '⚠️ Error de conexión.' }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg px-4 py-3 hover:scale-105 transition-transform"
          aria-label="Abrir asistente"
        >
          <Sparkles className="w-5 h-5" />
          <span className="hidden sm:inline text-sm font-medium">Asistente</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(420px,calc(100vw-2rem))] h-[min(640px,calc(100vh-2rem))] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Asistente Plusterra</div>
                <div className="text-[11px] text-muted-foreground">
                  {remaining !== null
                    ? `${remaining} consulta${remaining === 1 ? '' : 's'} restante${remaining === 1 ? '' : 's'} hoy`
                    : 'Cargando…'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Hola 👋 Preguntame cómo usar cualquier función del sistema y te doy el paso a paso.
                </div>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left text-xs px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
                >
                  {m.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Pensando…
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="p-2 border-t border-border flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Escribí tu pregunta…"
              rows={1}
              className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-24"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
              aria-label="Enviar"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

async function tryReadErr(ctx: any): Promise<string> {
  try {
    const body = ctx?.body;
    if (!body) return '';
    if (typeof body === 'string') return JSON.parse(body)?.error ?? '';
    if (body instanceof ReadableStream) {
      const txt = await new Response(body).text();
      return JSON.parse(txt)?.error ?? '';
    }
    return body?.error ?? '';
  } catch {
    return '';
  }
}