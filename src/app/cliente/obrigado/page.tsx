import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

export default function ClienteObrigadoPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
          <CardTitle>Pagamento recebido</CardTitle>
          <CardDescription>
            Sua renovação foi processada. Se o acesso não atualizar em alguns minutos, fale com o suporte.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link href="/">Concluir</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
