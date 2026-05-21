'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { CardPriceDisplay } from '@/components/ui/price-display'
import { ScreenShare } from 'lucide-react'
import { RenewalCheckoutButton } from '@/components/cliente/renewal-checkout-button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { CheckoutGateway } from '@/lib/checkout/types'

type Props = {
  uniqueLink: string
  plan: {
    id: string
    name: string
    price: number
    price_before_discount?: number | null
    validity: number
    screens: number
    restrictions?: string | null
    cakto_url?: string | null
  }
  checkoutOptions: {
    caktoEnabled: boolean
    activeGatewayPix: CheckoutGateway
    activeGatewayCard: CheckoutGateway
  }
}

export function RenewalPlanCard({ uniqueLink, plan, checkoutOptions }: Props) {
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix')
  const hasCakto = checkoutOptions.caktoEnabled && Boolean(plan.cakto_url?.trim())
  const [gateway, setGateway] = useState<CheckoutGateway | 'auto'>('auto')

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        {plan.restrictions && <CardDescription>{plan.restrictions}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <CardPriceDisplay
          price={plan.price}
          priceBeforeDiscount={plan.price_before_discount}
        />
        <p className="text-sm text-muted-foreground">{plan.validity} dias de acesso</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ScreenShare className="w-4 h-4" />
          <span>{plan.screens} Conexão(ões)</span>
        </div>

        <div className="space-y-2 rounded-lg border p-3">
          <Label className="text-sm font-medium">Forma de pagamento</Label>
          <RadioGroup
            value={paymentMethod}
            onValueChange={(v) => setPaymentMethod(v as 'pix' | 'card')}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pix" id={`pix-${plan.id}`} />
              <Label htmlFor={`pix-${plan.id}`} className="font-normal cursor-pointer">
                PIX (Gates2b)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="card" id={`card-${plan.id}`} />
              <Label htmlFor={`card-${plan.id}`} className="font-normal cursor-pointer">
                Cartão (checkout seguro)
              </Label>
            </div>
          </RadioGroup>
        </div>

        {hasCakto && (
          <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
            <Label className="text-sm font-medium">Processador</Label>
            <RadioGroup
              value={gateway}
              onValueChange={(v) => setGateway(v as CheckoutGateway | 'auto')}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto" id={`auto-${plan.id}`} />
                <Label htmlFor={`auto-${plan.id}`} className="font-normal cursor-pointer">
                  Padrão (
                  {paymentMethod === 'pix'
                    ? checkoutOptions.activeGatewayPix
                    : checkoutOptions.activeGatewayCard}
                  )
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="gates2b" id={`g2b-${plan.id}`} />
                <Label htmlFor={`g2b-${plan.id}`} className="font-normal cursor-pointer">
                  Gates2b
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cakto" id={`cakto-${plan.id}`} />
                <Label htmlFor={`cakto-${plan.id}`} className="font-normal cursor-pointer">
                  Cakto
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <RenewalCheckoutButton
          uniqueLink={uniqueLink}
          planId={plan.id}
          planName={plan.name}
          paymentMethod={paymentMethod}
          gateway={gateway}
          caktoAvailable={hasCakto}
        />
      </CardFooter>
    </Card>
  )
}
