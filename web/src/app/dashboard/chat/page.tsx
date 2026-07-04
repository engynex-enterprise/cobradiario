'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth-provider';
import { getSocket } from '@/lib/socket';
import { fetchMessages, sendMessage, type Message } from '@/lib/graphql';
import { Send } from 'lucide-react';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

const timeFmt = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' });

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    fetchMessages(50)
      .then((d) => {
        // El backend devuelve descendente (recientes primero); mostramos ascendente.
        setMessages([...d.messages].reverse());
        scrollToBottom();
      })
      .catch((e) => toast.error(e.message));
  }, [scrollToBottom]);

  // Realtime: nuevos mensajes del tenant.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onMsg = (msg: Message) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      scrollToBottom();
    };
    socket.on('message.created', onMsg);
    return () => {
      socket.off('message.created', onMsg);
    };
  }, [scrollToBottom]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    setBody('');
    try {
      const { sendMessage: msg } = await sendMessage(text);
      // El evento realtime puede llegar antes o después; dedupe por id.
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      scrollToBottom();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
      setBody(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col p-4 sm:p-6">
      <PageHeader
        title="Chat"
        description="Mensajería interna del equipo en tiempo real: coordina cobros, reporta novedades y mantén a administradores y cobradores en la misma página."
      />

      <div className="mt-4 flex flex-1 flex-col overflow-hidden rounded-xl border bg-card">
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No hay mensajes todavía. ¡Escribe el primero!</p>
          ) : (
            messages.map((m) => {
              const mine = m.userId === user?.id;
              return (
                <div key={m.id} className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {initials(m.authorName)}
                  </div>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {!mine && <p className="mb-0.5 text-xs font-semibold opacity-80">{m.authorName}</p>}
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`mt-1 text-[10px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {timeFmt.format(new Date(m.createdAt))}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={submit} className="flex items-center gap-2 border-t p-3">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escribe un mensaje…"
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={sending || !body.trim()} aria-label="Enviar">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
