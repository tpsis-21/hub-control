"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "./user-nav";
import { InAppNotifications } from "./notifications/in-app-notifications";
import { getBrowserUser } from "@/lib/supabase/clients/browser";
import { useEffect, useState } from "react";

type HeaderProps = {
  title: string;
};

export function Header({ title }: HeaderProps) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getBrowserUser().then(user => {
      if (user) {
        setUserId(user.id);
      }
    });
  }, []);

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="w-full flex-1">
        <h1 className="font-semibold text-lg">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {userId && <InAppNotifications userId={userId} />}
        <UserNav />
      </div>
    </header>
  );
}
