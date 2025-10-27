"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Download, Trash2, Settings } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Privacidade e Dados</h1>
        <p className="text-muted-foreground">
          Gerencie seus dados pessoais e configurações de privacidade
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exportar Dados
            </CardTitle>
            <CardDescription>
              Baixe uma cópia de todos os seus dados pessoais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Exportar Dados
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Exclusão de Dados
            </CardTitle>
            <CardDescription>
              Solicite a exclusão permanente de seus dados pessoais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Solicitar Exclusão
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Consentimentos
            </CardTitle>
            <CardDescription>
              Gerencie suas preferências de consentimento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Gerenciar Consentimentos
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
