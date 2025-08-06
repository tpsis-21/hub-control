// @/components/message-sender.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Send, Mail, MessageCircle, User, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { Client } from "@/lib/types";

interface MessageSenderProps {
  client?: Client;
  onSuccess?: () => void;
  className?: string;
}

interface MessageData {
  type: 'email' | 'whatsapp' | 'both';
  subject: string;
  message: string;
  priority: 'low' | 'normal' | 'high';
  scheduledFor?: string;
}

export function MessageSender({ client, onSuccess, className }: MessageSenderProps) {
  const [messageData, setMessageData] = useState<MessageData>({
    type: 'both',
    subject: '',
    message: '',
    priority: 'normal'
  });
  const [isScheduled, setIsScheduled] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageData.subject.trim() || !messageData.message.trim()) {
      toast.error('Assunto e mensagem são obrigatórios');
      return;
    }

    if (client && !client.email && !client.whatsapp) {
      toast.error('Cliente não possui e-mail ou WhatsApp cadastrado');
      return;
    }

    if (isScheduled && !messageData.scheduledFor) {
      toast.error('Data e hora de agendamento são obrigatórias');
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        type: 'general',
        clientId: client?.id,
        clientName: client?.name,
        email: messageData.type === 'whatsapp' ? undefined : client?.email,
        whatsapp: messageData.type === 'email' ? undefined : client?.whatsapp,
        subject: messageData.subject,
        message: messageData.message,
        priority: messageData.priority,
        scheduledFor: isScheduled ? messageData.scheduledFor : undefined
      };

      const response = await fetch('/api/message-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', ...payload })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(isScheduled ? 'Mensagem agendada com sucesso!' : 'Mensagem adicionada à fila!');
        
        // Limpar formulário
        setMessageData({
          type: 'both',
          subject: '',
          message: '',
          priority: 'normal'
        });
        setIsScheduled(false);
        
        onSuccess?.();
      } else {
        toast.error(data.error || 'Erro ao enviar mensagem');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (type: 'normal' | 'urgent') => {
    if (!client) {
      toast.error('Cliente não selecionado');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, type })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(`Lembrete ${type === 'urgent' ? 'urgente' : 'normal'} enviado!`);
        onSuccess?.();
      } else {
        toast.error(data.error || 'Erro ao enviar lembrete');
      }
    } catch (error) {
      console.error('Erro ao enviar lembrete:', error);
      toast.error('Erro ao enviar lembrete');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Alta</Badge>;
      case 'normal':
        return <Badge variant="default">Normal</Badge>;
      case 'low':
        return <Badge variant="secondary">Baixa</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'whatsapp':
        return <MessageCircle className="h-4 w-4" />;
      case 'both':
        return (
          <div className="flex gap-1">
            <Mail className="h-3 w-3" />
            <MessageCircle className="h-3 w-3" />
          </div>
        );
      default:
        return <Send className="h-4 w-4" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Enviar Mensagem
          {client && (
            <Badge variant="outline" className="ml-auto">
              <User className="h-3 w-3 mr-1" />
              {client.name}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {client 
            ? `Envie uma mensagem personalizada para ${client.name}`
            : 'Envie mensagens personalizadas para clientes'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {client && (
          <>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="space-y-1">
                <div className="font-medium">{client.name}</div>
                <div className="text-sm text-muted-foreground">
                  {client.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {client.email}
                    </div>
                  )}
                  {client.whatsapp && (
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {client.whatsapp}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div>Vence em: {new Date(client.expirationDate).toLocaleDateString('pt-BR')}</div>
                <Badge variant={client.status === 'Ativo' ? 'default' : 'secondary'}>
                  {client.status}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Lembretes Rápidos</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendReminder('normal')}
                  disabled={loading}
                  className="flex items-center gap-1"
                >
                  <Clock className="h-3 w-3" />
                  Lembrete Normal
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendReminder('urgent')}
                  disabled={loading}
                  className="flex items-center gap-1 text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Lembrete Urgente
                </Button>
              </div>
            </div>

            <Separator />
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Envio</Label>
              <Select
                value={messageData.type}
                onValueChange={(value: 'email' | 'whatsapp' | 'both') => 
                  setMessageData(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">
                    <div className="flex items-center gap-2">
                      {getTypeIcon('both')}
                      E-mail e WhatsApp
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Apenas E-mail
                    </div>
                  </SelectItem>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Apenas WhatsApp
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                value={messageData.priority}
                onValueChange={(value: 'low' | 'normal' | 'high') => 
                  setMessageData(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Assunto</Label>
            <Input
              id="subject"
              value={messageData.subject}
              onChange={(e) => setMessageData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Digite o assunto da mensagem"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              value={messageData.message}
              onChange={(e) => setMessageData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Digite sua mensagem aqui..."
              rows={4}
              required
            />
            <div className="text-xs text-muted-foreground">
              Você pode usar as tags: {client?.name && '{NOME}'}, {client?.expirationDate && '{DATA_VENCIMENTO}'}, {'{PLANO}'}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="scheduled"
              checked={isScheduled}
              onCheckedChange={(checked) => setIsScheduled(checked === true)}
            />
            <Label htmlFor="scheduled" className="text-sm">
              Agendar envio
            </Label>
          </div>

          {isScheduled && (
            <div className="space-y-2">
              <Label htmlFor="scheduledFor">Data e Hora do Envio</Label>
              <Input
                id="scheduledFor"
                type="datetime-local"
                value={messageData.scheduledFor || ''}
                onChange={(e) => setMessageData(prev => ({ ...prev, scheduledFor: e.target.value }))}
                min={new Date().toISOString().slice(0, 16)}
                required={isScheduled}
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              {getTypeIcon(messageData.type)}
              {getPriorityBadge(messageData.priority)}
              {isScheduled && (
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  Agendado
                </Badge>
              )}
            </div>
            
            <Button type="submit" disabled={loading}>
              {loading ? (
                'Enviando...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {isScheduled ? 'Agendar' : 'Enviar'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}