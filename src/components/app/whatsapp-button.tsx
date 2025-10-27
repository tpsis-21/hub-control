// @/components/app/whatsapp-button.tsx
"use client";

import { Button } from "@/components/ui/button";

function WhatsAppIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle">
            <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
        </svg>
    )
}

export function WhatsAppButton({ phoneNumber }: { phoneNumber?: string }) {
    if (!phoneNumber) {
        return null;
    }
    const whatsappLink = `https://wa.me/${phoneNumber.replace(/\D/g, '')}`;

    return (
        <Button asChild variant="outline">
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon />
                <span>WhatsApp</span>
            </a>
        </Button>
    )
}

