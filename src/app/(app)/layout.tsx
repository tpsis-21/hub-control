import React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ModernSidebar } from "@/components/app/modern-sidebar";
import { ModernHeader } from "@/components/app/modern-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <ModernSidebar />
      <SidebarInset>
        <ModernHeader />
        <main className="flex-1 space-y-4 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
