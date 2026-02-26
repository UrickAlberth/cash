"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageCircle, Send, X, Bot, User, Loader2 } from 'lucide-react';
import { financialAssistantChat } from '@/ai/flows/financial-assistant-chat';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface Props {
  userId: string;
}

export function FinancialChatbot({ userId }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Olá! Sou seu assistente financeiro. Posso responder perguntas sobre suas finanças, como faturas de cartão, saldo projetado, maiores despesas e muito mais. Como posso ajudar?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const handleSend = async () => {
    const userMessage = input.trim();
    if (!userMessage || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const result = await financialAssistantChat({
        message: userMessage,
        userId,
        currentDate: new Date().toISOString().split('T')[0],
      });
      setMessages((prev) => [...prev, { role: 'assistant', text: result.response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Desculpe, ocorreu um erro. Por favor, tente novamente.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary rounded-full shadow-lg shadow-primary/40 flex items-center justify-center text-white hover:bg-primary/90 transition-all hover:scale-110 active:scale-95"
        aria-label="Abrir assistente financeiro"
      >
        <MessageCircle className="w-7 h-7" />
      </button>

      {/* Chat dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px] h-[600px] flex flex-col p-0 gap-0 rounded-3xl bg-white/95 backdrop-blur-md border border-white/50">
          <DialogHeader className="px-5 py-4 border-b border-primary/10 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-primary font-headline">
              <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              Assistente Financeiro
            </DialogTitle>
          </DialogHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-3">
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                      msg.role === 'user' ? 'bg-primary/20' : 'bg-primary'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4 text-primary" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-primary text-white rounded-tr-sm'
                        : 'bg-primary/10 text-foreground rounded-tl-sm border border-primary/10'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 flex-row">
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center bg-primary">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-primary/10 border border-primary/10 rounded-2xl rounded-tl-sm px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="px-4 py-3 border-t border-primary/10 flex-shrink-0 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre suas finanças..."
              className="rounded-xl h-10 flex-1 text-sm"
              disabled={loading}
            />
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              size="icon"
              className="h-10 w-10 rounded-xl flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
