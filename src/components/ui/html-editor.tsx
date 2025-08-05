"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Code,
  Quote,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HtmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function HtmlEditor({ value, onChange, placeholder, className }: HtmlEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Range | null>(null);

  useEffect(() => {
    if (editorRef.current && !isPreview) {
      editorRef.current.innerHTML = value;
    }
  }, [value, isPreview]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      setSelection(sel.getRangeAt(0));
    }
  };

  const restoreSelection = () => {
    if (selection) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(selection);
    }
  };

  const execCommand = (command: string, value?: string) => {
    restoreSelection();
    document.execCommand(command, false, value);
    updateContent();
    editorRef.current?.focus();
  };

  const updateContent = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const insertLink = () => {
    const url = prompt("Digite a URL do link:");
    if (url) {
      execCommand("createLink", url);
    }
  };

  const insertImage = () => {
    const url = prompt("Digite a URL da imagem:");
    if (url) {
      execCommand("insertImage", url);
    }
  };

  const toolbarButtons = [
    { icon: Bold, command: "bold", title: "Negrito" },
    { icon: Italic, command: "italic", title: "Itálico" },
    { icon: Underline, command: "underline", title: "Sublinhado" },
    { icon: List, command: "insertUnorderedList", title: "Lista com marcadores" },
    { icon: ListOrdered, command: "insertOrderedList", title: "Lista numerada" },
    { icon: AlignLeft, command: "justifyLeft", title: "Alinhar à esquerda" },
    { icon: AlignCenter, command: "justifyCenter", title: "Centralizar" },
    { icon: AlignRight, command: "justifyRight", title: "Alinhar à direita" },
    { icon: Quote, command: "formatBlock", value: "blockquote", title: "Citação" },
    { icon: Code, command: "formatBlock", value: "pre", title: "Código" },
  ];

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/50">
        {toolbarButtons.map(({ icon: Icon, command, value, title }) => (
          <Button
            key={command}
            type="button"
            variant="ghost"
            size="sm"
            title={title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCommand(command, value)}
            className="px-2"
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title="Inserir link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertLink}
          className="px-2"
        >
          <Link className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title="Inserir imagem"
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertImage}
          className="px-2"
        >
          <Image className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          type="button"
          variant={isPreview ? "default" : "ghost"}
          size="sm"
          onClick={() => setIsPreview(!isPreview)}
          className="h-8 px-3 text-xs"
        >
          {isPreview ? "Editar" : "Visualizar"}
        </Button>
      </div>

      {/* Editor/Preview */}
      <div className="min-h-[200px] max-h-[400px] overflow-y-auto">
        {isPreview ? (
          <div 
            className="p-4 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: value }}
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            className="p-4 min-h-[200px] outline-none focus:ring-0"
            onInput={updateContent}
            onBlur={saveSelection}
            onMouseUp={saveSelection}
            onKeyUp={saveSelection}
            data-placeholder={placeholder}
            style={{
              emptyContent: placeholder ? `"${placeholder}"` : undefined,
            }}
          />
        )}
      </div>
      
      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </Card>
  );
}