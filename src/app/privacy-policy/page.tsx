import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Eye, Database, Mail, Phone } from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-muted-foreground">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Compromisso com a Privacidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              O Hub Control está comprometido com a proteção da sua privacidade e dos seus dados pessoais, 
              em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018) e demais 
              regulamentações aplicáveis.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Dados Coletados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Dados de Identificação:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Nome completo</li>
                <li>E-mail</li>
                <li>Telefone</li>
                <li>Dados de autenticação</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Dados de Uso:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Logs de acesso e navegação</li>
                <li>Endereço IP</li>
                <li>Informações do dispositivo</li>
                <li>Cookies e tecnologias similares</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Finalidade do Tratamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Prestação dos serviços de gerenciamento de IPTV</li>
              <li>Autenticação e controle de acesso</li>
              <li>Comunicação com o usuário</li>
              <li>Melhoria da experiência do usuário</li>
              <li>Cumprimento de obrigações legais</li>
              <li>Prevenção de fraudes e segurança</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seus Direitos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Conforme a LGPD, você possui os seguintes direitos:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Confirmação da existência de tratamento</li>
              <li>Acesso aos dados</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados</li>
              <li>Anonimização, bloqueio ou eliminação de dados</li>
              <li>Portabilidade dos dados</li>
              <li>Eliminação dos dados tratados com consentimento</li>
              <li>Revogação do consentimento</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Segurança dos Dados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Implementamos medidas técnicas e organizacionais adequadas para proteger seus dados pessoais 
              contra acesso não autorizado, alteração, divulgação ou destruição, incluindo:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
              <li>Criptografia de dados em trânsito e em repouso</li>
              <li>Controles de acesso baseados em funções (RLS)</li>
              <li>Monitoramento e auditoria de segurança</li>
              <li>Backup e recuperação de dados</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contato - Encarregado de Dados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento de dados:
            </p>
            <div className="space-y-2">
              <p className="text-sm">
                <Mail className="h-4 w-4 inline mr-2" />
                E-mail: dpo@hubcontrol.app
              </p>
              <p className="text-sm">
                <Phone className="h-4 w-4 inline mr-2" />
                Telefone: (11) 9999-9999
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alterações na Política</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Esta política pode ser atualizada periodicamente. Notificaremos sobre mudanças significativas 
              através do e-mail cadastrado ou por meio de aviso em nossa plataforma.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
