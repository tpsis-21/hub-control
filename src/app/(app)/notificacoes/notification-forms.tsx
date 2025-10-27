// @/app/(app)/notificacoes/notification-forms.tsx
"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PlusCircle, Trash2, AlertTriangle, Copy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  saveExpirationReminders,
  saveUsageInstructions,
  saveEventTemplates,
} from "./actions";
import type { Reminder, Instruction, OtherTemplate } from './types';


const weekDays = [
    { id: 'sun', label: 'D' },
    { id: 'mon', label: 'S' },
    { id: 'tue', label: 'T' },
    { id: 'wed', label: 'Q' },
    { id: 'thu', label: 'Q' },
    { id: 'fri', label: 'S' },
    { id: 'sat', label: 'S' },
];

const initialWeekDaysState = {
    sun: true, mon: true, tue: true, wed: true, thu: true, fri: true, sat: true
};

const availableTags: Record<string, string[]> = {
  default: ["{{NOME}}", "{{EMAIL}}", "{{WHATSAPP}}", "{{VENCIMENTO}}", "{{PLANO}}", "{{ID_IPTV}}", "{{ID_GESTOR}}", "{{LINK_CLIENTE}}"],
  access: ["{{NOME}}", "{{USUARIO_IPTV}}", "{{SENHA_IPTV}}", "{{VENCIMENTO}}", "{{PLANO}}", "{{LINK_CLIENTE}}"],
};

function TemplateTags({ tags }: { tags: string[] }) {
  const { toast } = useToast();

  const handleCopy = (tag: string) => {
    navigator.clipboard.writeText(tag);
    toast({
      title: "Copiado!",
      description: `A tag ${tag} foi copiada para a área de transferência.`,
    });
  };

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <p className="text-xs text-muted-foreground mr-2 self-center">Tags disponíveis:</p>
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="cursor-pointer font-mono"
          onClick={() => handleCopy(tag)}
          title="Clique para copiar"
        >
          {tag} <Copy className="w-3 h-3 ml-1.5" />
        </Badge>
      ))}
    </div>
  );
}

type NotificationFormsProps = {
    initialReminders: Reminder[];
    initialInstructions: Instruction[];
    initialEventTemplates: OtherTemplate[];
}

export function NotificationForms({ initialReminders, initialInstructions, initialEventTemplates }: NotificationFormsProps) {
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [instructions, setInstructions] = useState<Instruction[]>(initialInstructions);
  const [eventTemplates, setEventTemplates] = useState<OtherTemplate[]>(initialEventTemplates);

  const [isRemindersPending, startRemindersTransition] = useTransition();
  const [isInstructionsPending, startInstructionsTransition] = useTransition();
  const [isEventsPending, startEventsTransition] = useTransition();

  const { toast } = useToast();

  // --- Handlers for Reminders ---
  const handleReminderChange = (id: string, field: keyof Reminder, value: any) => {
    setReminders(current => current.map(r => r.id === id ? { ...r, [field]: value } : r));
  };
  const handleSendDayChange = (id: string, dayId: string, checked: boolean) => {
    const reminder = reminders.find(r => r.id === id);
    if (reminder) {
        const newSendDays = { ...reminder.sendDays, [dayId]: checked };
        handleReminderChange(id, 'sendDays', newSendDays);
    }
  };
  const addReminder = () => {
    const newId = `reminder-${Date.now()}`;
    setReminders(current => [...current, {
        id: newId,
        daysBefore: 1,
        sendTime: "09:00",
        whatsappTemplate: "Olá {{NOME}}, sua assinatura está prestes a expirar. Renove para continuar assistindo!",
        emailTemplate: "<h1>Lembrete de Vencimento</h1><p>Sua assinatura está expirando em breve.</p>",
        active: true,
        sendDays: { ...initialWeekDaysState },
        sendInterval: 'normal',
        customIntervalMin: 120,
        customIntervalMax: 240,
    }]);
  };
  const removeReminder = (id: string) => {
    setReminders(current => current.filter(r => r.id !== id));
  };
  const handleSaveReminders = () => {
    startRemindersTransition(async () => {
        const result = await saveExpirationReminders(reminders);
        if(result.success) {
            toast({ title: "Sucesso!", description: "Lembretes de vencimento salvos." });
        } else {
            toast({ title: "Erro", description: result.error, variant: "destructive" });
        }
    });
  };

  // --- Handlers for Instructions ---
  const handleInstructionChange = (id: string, field: keyof Instruction, value: any) => {
    setInstructions(current => current.map(i => i.id === id ? { ...i, [field]: value } : i));
  };
  const addInstruction = () => {
    const newId = `instr-${Date.now()}`;
    setInstructions(current => [...current, {
        id: newId,
        daysAfter: 5,
        sendTime: "14:00",
        whatsappTemplate: "Nova dica para você, {{NOME}}!",
        emailTemplate: "<h1>Nova Dica!</h1>",
        active: true,
    }]);
  };
  const removeInstruction = (id: string) => {
    setInstructions(current => current.filter(i => i.id !== id));
  };
   const handleSaveInstructions = () => {
    startInstructionsTransition(async () => {
        const result = await saveUsageInstructions(instructions);
        if(result.success) {
            toast({ title: "Sucesso!", description: "Sequência de instruções salva." });
        } else {
            toast({ title: "Erro", description: result.error, variant: "destructive" });
        }
    });
  };

  // --- Handlers for Event Templates ---
  const handleEventTemplateChange = (id: string, field: 'whatsappTemplate' | 'emailTemplate', value: string) => {
    setEventTemplates(current => current.map(t => t.id === id ? { ...t, [field]: value } : t));
  };
  const handleSaveEvents = () => {
    startEventsTransition(async () => {
        const result = await saveEventTemplates(eventTemplates);
        if(result.success) {
            toast({ title: "Sucesso!", description: "Notificações de eventos salvas." });
        } else {
            toast({ title: "Erro", description: result.error, variant: "destructive" });
        }
    });
  };


  return (
    <>
        <Card>
            <CardHeader>
                <CardTitle>Lembretes de Vencimento</CardTitle>
                <CardDescription>
                Crie e personalize múltiplos lembretes automáticos. Cada lembrete tem sua própria configuração de agendamento e envio.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Accordion type="multiple" className="w-full">
                    {reminders.map((reminder) => (
                        <AccordionItem value={reminder.id} key={reminder.id}>
                            <div className="flex justify-between items-center w-full hover:bg-muted/50 rounded-md pr-2">
                                <div className="flex items-center gap-4 pl-4 py-2 flex-1">
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Switch
                                            id={`active-${reminder.id}`}
                                            checked={reminder.active}
                                            onCheckedChange={(checked) => handleReminderChange(reminder.id, 'active', checked)}
                                        />
                                    </div>
                                    <AccordionTrigger className="hover:no-underline p-0 flex-1 justify-start font-normal">
                                        <span className={!reminder.active ? 'text-muted-foreground' : ''}>
                                            Lembrete: {reminder.daysBefore} dia(s) antes, às {reminder.sendTime}
                                        </span>
                                    </AccordionTrigger>
                                </div>
                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0" onClick={() => removeReminder(reminder.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <AccordionContent className="space-y-8 pt-4 px-4 border-t">
                                
                                <div className="space-y-4">
                                    <h4 className="font-medium">Agendamento</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="grid w-full gap-2">
                                            <Label htmlFor={`days-${reminder.id}`}>Enviar com</Label>
                                            <Input id={`days-${reminder.id}`} type="number" value={reminder.daysBefore} onChange={(e) => handleReminderChange(reminder.id, 'daysBefore', parseInt(e.target.value) || 0)} />
                                            <p className="text-xs text-muted-foreground">dias de antecedência.</p>
                                        </div>
                                        <div className="grid w-full gap-2">
                                            <Label htmlFor={`time-${reminder.id}`}>Às</Label>
                                            <Input id={`time-${reminder.id}`} type="time" value={reminder.sendTime} onChange={(e) => handleReminderChange(reminder.id, 'sendTime', e.target.value)} />
                                            <p className="text-xs text-muted-foreground">horário de envio.</p>
                                        </div>
                                    </div>
                                        <div>
                                        <Label>Enviar nos dias da semana</Label>
                                        <div className="flex items-center gap-2 mt-2">
                                            {weekDays.map(day => (
                                                <div key={day.id} className="flex items-center">
                                                    <Button
                                                        size="icon"
                                                        variant={reminder.sendDays[day.id] ? "default" : "outline"}
                                                        onClick={() => handleSendDayChange(reminder.id, day.id, !reminder.sendDays[day.id])}
                                                        className={`w-8 h-8 rounded-full transition-all duration-200 ${
                                                            reminder.sendDays[day.id] 
                                                                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md' 
                                                                : 'border-2 border-muted-foreground/30 hover:border-primary hover:bg-primary/10'
                                                        }`}
                                                    >
                                                        {day.label}
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-medium">Conteúdo da Mensagem</h4>
                                    <div className="grid w-full gap-2">
                                        <Label htmlFor={`whatsapp-${reminder.id}`}>Modelo para WhatsApp</Label>
                                        <Textarea id={`whatsapp-${reminder.id}`} rows={4} value={reminder.whatsappTemplate} onChange={(e) => handleReminderChange(reminder.id, 'whatsappTemplate', e.target.value)} />
                                        <TemplateTags tags={availableTags.default} />
                                    </div>
                                    <div className="grid w-full gap-2">
                                        <Label htmlFor={`email-${reminder.id}`}>Modelo para E-mail</Label>
                                        <Textarea id={`email-${reminder.id}`} rows={6} value={reminder.emailTemplate} onChange={(e) => handleReminderChange(reminder.id, 'emailTemplate', e.target.value)} />
                                        <TemplateTags tags={availableTags.default} />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-medium">Configuração de Envio</h4>
                                    <div className="grid w-full max-w-sm items-center gap-2">
                                        <Label htmlFor={`send-interval-${reminder.id}`}>Intervalo de Envio</Label>
                                        <Select value={reminder.sendInterval} onValueChange={(value) => handleReminderChange(reminder.id, 'sendInterval', value)}>
                                            <SelectTrigger id={`send-interval-${reminder.id}`}>
                                                <SelectValue placeholder="Selecione o intervalo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="fast">Envio Rápido (10 a 30 segundos)</SelectItem>
                                                <SelectItem value="normal">Intervalo Normal (30 a 60 segundos)</SelectItem>
                                                <SelectItem value="slow">Intervalo Lento (60 a 120 segundos)</SelectItem>
                                                <SelectItem value="custom">Personalizado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {reminder.sendInterval === 'custom' && (
                                        <div className="space-y-4">
                                            <Alert variant="destructive">
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertTitle>Atenção: Risco de Bloqueio</AlertTitle>
                                                <AlertDescription>
                                                    Intervalos muito curtos podem ser interpretados como atividade suspeita pelo WhatsApp. Use com cautela e prefira intervalos maiores.
                                                </AlertDescription>
                                            </Alert>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor={`custom-interval-min-${reminder.id}`}>De (segundos)</Label>
                                                    <Input id={`custom-interval-min-${reminder.id}`} type="number" value={reminder.customIntervalMin} onChange={(e) => handleReminderChange(reminder.id, 'customIntervalMin', parseInt(e.target.value) || 0)} placeholder="Ex: 120"/>
                                                </div>
                                                <div>
                                                    <Label htmlFor={`custom-interval-max-${reminder.id}`}>Até (segundos)</Label>
                                                    <Input id={`custom-interval-max-${reminder.id}`} type="number" value={reminder.customIntervalMax} onChange={(e) => handleReminderChange(reminder.id, 'customIntervalMax', parseInt(e.target.value) || 0)} placeholder="Ex: 240"/>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
                <div className="flex justify-between items-center pt-4 border-t mt-4">
                    <Button variant="outline" onClick={addReminder}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Lembrete
                    </Button>
                    <Button onClick={handleSaveReminders} disabled={isRemindersPending}>
                        {isRemindersPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Lembretes
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Sequência de Instruções de Uso</CardTitle>
                <CardDescription>
                Envie dicas e instruções automaticamente após a ativação de um novo cliente para melhorar a experiência inicial.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Accordion type="multiple" className="w-full">
                    {instructions.map((instruction) => (
                        <AccordionItem value={instruction.id} key={instruction.id}>
                            <div className="flex justify-between items-center w-full hover:bg-muted/50 rounded-md pr-2">
                                <div className="flex items-center gap-4 pl-4 py-2 flex-1">
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Switch
                                            id={`active-instr-${instruction.id}`}
                                            checked={instruction.active}
                                            onCheckedChange={(checked) => handleInstructionChange(instruction.id, 'active', checked)}
                                        />
                                    </div>
                                    <AccordionTrigger className="hover:no-underline p-0 flex-1 justify-start font-normal">
                                        <span className={!instruction.active ? 'text-muted-foreground' : ''}>
                                          Enviar {instruction.daysAfter} dia(s) após a ativação, às {instruction.sendTime}
                                        </span>
                                    </AccordionTrigger>
                                </div>
                                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0" onClick={() => removeInstruction(instruction.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <AccordionContent className="space-y-8 pt-4 px-4 border-t">
                                <div className="space-y-4">
                                    <h4 className="font-medium">Agendamento</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="grid w-full gap-2">
                                            <Label htmlFor={`days-instr-${instruction.id}`}>Enviar após</Label>
                                            <Input id={`days-instr-${instruction.id}`} type="number" value={instruction.daysAfter} onChange={(e) => handleInstructionChange(instruction.id, 'daysAfter', parseInt(e.target.value) || 0)} />
                                            <p className="text-xs text-muted-foreground">dias da ativação do cliente.</p>
                                        </div>
                                        <div className="grid w-full gap-2">
                                            <Label htmlFor={`time-instr-${instruction.id}`}>Às</Label>
                                            <Input id={`time-instr-${instruction.id}`} type="time" value={instruction.sendTime} onChange={(e) => handleInstructionChange(instruction.id, 'sendTime', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <h4 className="font-medium">Conteúdo da Mensagem</h4>
                                    <div className="grid w-full gap-2">
                                        <Label htmlFor={`whatsapp-instr-${instruction.id}`}>Modelo para WhatsApp</Label>
                                        <Textarea id={`whatsapp-instr-${instruction.id}`} rows={4} value={instruction.whatsappTemplate} onChange={(e) => handleInstructionChange(instruction.id, 'whatsappTemplate', e.target.value)} />
                                        <TemplateTags tags={availableTags.default} />
                                    </div>
                                    <div className="grid w-full gap-2">
                                        <Label htmlFor={`email-instr-${instruction.id}`}>Modelo para E-mail</Label>
                                        <Textarea id={`email-instr-${instruction.id}`} rows={6} value={instruction.emailTemplate} onChange={(e) => handleInstructionChange(instruction.id, 'emailTemplate', e.target.value)} />
                                        <TemplateTags tags={availableTags.default} />
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
                <div className="flex justify-between items-center pt-4 border-t mt-4">
                    <Button variant="outline" onClick={addInstruction}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Instrução
                    </Button>
                    <Button onClick={handleSaveInstructions} disabled={isInstructionsPending}>
                        {isInstructionsPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Instruções
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Notificações de Eventos</CardTitle>
                <CardDescription>
                    Personalize mensagens para eventos específicos, como criação de testes e confirmações de pagamento.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" className="w-full">
                    {eventTemplates.map((template) => (
                        <AccordionItem value={template.id} key={template.id}>
                            <AccordionTrigger className="px-4 py-3">{template.label}</AccordionTrigger>
                            <AccordionContent className="space-y-6 pt-4 px-4">
                                <div className="grid w-full gap-2">
                                    <Label htmlFor={`whatsapp-${template.id}`}>Modelo para WhatsApp</Label>
                                    <Textarea id={`whatsapp-${template.id}`} rows={4} value={template.whatsappTemplate} onChange={(e) => handleEventTemplateChange(template.id, 'whatsappTemplate', e.target.value)} />
                                    <TemplateTags tags={template.id.includes('test') || template.id.includes('welcome') ? availableTags.access : availableTags.default} />
                                </div>
                                <div className="grid w-full gap-2">
                                    <Label htmlFor={`email-${template.id}`}>Modelo para E-mail</Label>
                                    <Textarea id={`email-${template.id}`} rows={6} value={template.emailTemplate} onChange={(e) => handleEventTemplateChange(template.id, 'emailTemplate', e.target.value)} />
                                    <TemplateTags tags={template.id.includes('test') || template.id.includes('welcome') ? availableTags.access : availableTags.default} />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
                 <div className="flex justify-end pt-4 border-t mt-4">
                    <Button onClick={handleSaveEvents} disabled={isEventsPending}>
                         {isEventsPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Notificações de Eventos
                    </Button>
                </div>
            </CardContent>
        </Card>
    </>
  );
}

