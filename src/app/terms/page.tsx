import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, AlertTriangle, Scale, Users } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-muted-foreground">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Aceitação dos Termos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ao acessar e utilizar o Hub Control, você concorda em cumprir e estar vinculado a estes 
              Termos de Uso. Se você não concordar com qualquer parte destes termos, não deve usar nossos serviços.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Descrição do Serviço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              O Hub Control é uma plataforma de gerenciamento de serviços IPTV que oferece:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Gerenciamento de servidores IPTV</li>
              <li>Controle de clientes e assinantes</li>
              <li>Monitoramento de performance</li>
              <li>Relatórios e análises</li>
              <li>Ferramentas de automação</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Responsabilidades do Usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Uso Adequado:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Utilizar o serviço apenas para fins legítimos</li>
                  <li>Não violar direitos autorais ou propriedade intelectual</li>
                  <li>Manter a confidencialidade das credenciais de acesso</li>
                  <li>Não compartilhar conta com terceiros não autorizados</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Conteúdo:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Responsabilizar-se pelo conteúdo transmitido</li>
                  <li>Garantir que possui direitos sobre o conteúdo</li>
                  <li>Não transmitir conteúdo ilegal ou ofensivo</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Limitações e Proibições
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              É expressamente proibido:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Usar o serviço para atividades ilegais</li>
              <li>Tentar acessar sistemas não autorizados</li>
              <li>Interferir no funcionamento da plataforma</li>
              <li>Realizar engenharia reversa do software</li>
              <li>Distribuir malware ou código malicioso</li>
              <li>Violar direitos de propriedade intelectual</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Disponibilidade do Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Embora nos esforcemos para manter o serviço disponível 24/7, não garantimos disponibilidade 
              ininterrupta. Manutenções programadas serão comunicadas com antecedência. Não nos responsabilizamos 
              por interrupções causadas por fatores externos ao nosso controle.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Limitação de Responsabilidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              O Hub Control não se responsabiliza por:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Danos diretos ou indiretos decorrentes do uso</li>
              <li>Perda de dados ou lucros cessantes</li>
              <li>Conteúdo transmitido pelos usuários</li>
              <li>Violações de direitos autorais por terceiros</li>
              <li>Falhas de conectividade de terceiros</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Propriedade Intelectual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Todos os direitos de propriedade intelectual relacionados ao Hub Control, incluindo software, 
              design, marcas e conteúdo, são de propriedade exclusiva da empresa ou de seus licenciadores. 
              O uso do serviço não confere ao usuário qualquer direito de propriedade.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modificações dos Termos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entrarão 
              em vigor imediatamente após a publicação. O uso continuado do serviço após as modificações 
              constitui aceitação dos novos termos.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lei Aplicável</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Estes termos são regidos pelas leis brasileiras. Qualquer disputa será resolvida no foro 
              da comarca de São Paulo, SP, com renúncia expressa a qualquer outro foro.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contato</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Para dúvidas sobre estes termos, entre em contato conosco através do e-mail: 
              legal@hubcontrol.app
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
