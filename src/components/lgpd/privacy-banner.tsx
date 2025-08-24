"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Shield, FileText } from "lucide-react";
import Link from "next/link";

export function PrivacyBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('lgpd-consent');
      if (!consent) {
        setShowBanner(true);
      }
    } catch (err) {
      // Em ambientes sem localStorage (SSR/tests), não quebra a renderização
      setShowBanner(true);
    }
  }, []);

  const acceptConsent = () => {
    try {
      localStorage.setItem('lgpd-consent', 'accepted');
      localStorage.setItem('lgpd-consent-date', new Date().toISOString());
    } catch {}
    setShowBanner(false);
  };

  const rejectConsent = () => {
    try {
      localStorage.setItem('lgpd-consent', 'rejected');
      localStorage.setItem('lgpd-consent-date', new Date().toISOString());
    } catch {}
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md">
      <Card className="p-4 shadow-lg border-l-4 border-l-blue-500">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Proteção de Dados</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Utilizamos cookies e coletamos dados pessoais para melhorar sua experiência e 
              fornecer nossos serviços. Seus dados são protegidos conforme a LGPD.
            </p>
            <div className="flex flex-col gap-2 mt-3">
              <div className="flex gap-2">
                <Button size="sm" onClick={acceptConsent} className="flex-1">
                  Aceitar
                </Button>
                <Button variant="outline" size="sm" onClick={rejectConsent} className="flex-1">
                  Rejeitar
                </Button>
              </div>
              <div className="flex gap-2">
                <Link href="/privacy-policy" className="flex-1">
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    Política de Privacidade
                  </Button>
                </Link>
                <Link href="/terms" className="flex-1">
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    Termos de Uso
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBanner(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}