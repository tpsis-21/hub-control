// @/components/app/editable-note.tsx
"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { updateCustomerNotesAction } from "@/app/(app)/clientes/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StickyNote, Pencil, Loader2 } from "lucide-react";

type EditableNoteProps = {
    customerId: string;
    initialNotes?: string;
};

export function EditableNote({ customerId, initialNotes = "" }: EditableNoteProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [notes, setNotes] = useState(initialNotes);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setNotes(initialNotes);
    }, [initialNotes]);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isEditing]);

    const handleSave = () => {
        startTransition(async () => {
            const result = await updateCustomerNotesAction(customerId, notes);
            if (result.success) {
                toast({
                    title: "Sucesso!",
                    description: "Notas internas atualizadas.",
                });
                setIsEditing(false);
            } else {
                toast({
                    title: "Erro",
                    description: result.error || "Não foi possível salvar as notas.",
                    variant: "destructive",
                });
            }
        });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <StickyNote className="w-5 h-5" /> Notas Internas
                </CardTitle>
                {!isEditing && (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {isEditing ? (
                    <div className="space-y-4">
                        <Textarea
                            ref={textareaRef}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Adicione observações sobre o cliente aqui..."
                            className="resize-y h-24"
                            disabled={isPending}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => { setIsEditing(false); setNotes(initialNotes); }} disabled={isPending}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={isPending}>
                                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Salvar
                            </Button>
                        </div>
                    </div>
                ) : (
                    <p className="text-muted-foreground whitespace-pre-wrap min-h-[40px]">
                        {notes || "Nenhuma nota interna para este cliente."}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

