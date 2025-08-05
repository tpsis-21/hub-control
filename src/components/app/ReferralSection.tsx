import { CopyableField } from "@/components/app/copyable-field";
import { Button } from "@/components/ui/button";
import { Link } from "lucide-react";

export function ReferralSection({ referralLink }: { referralLink: string }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-lg">Indique e Ganhe!</h3>
      <CopyableField icon={Link} label="Seu link de indicação" value={referralLink} />
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <a href={`https://wa.me/?text=Veja%20essa%20novidade!%20${encodeURIComponent(referralLink)}`} target="_blank">Compartilhar no WhatsApp</a>
        </Button>
        {/* Adicione outros canais conforme necessário */}
      </div>
    </div>
  );
}