// @/app/(app)/dashboard/page.tsx
import { getDashboardPageData } from "./actions";
import { DashboardContent } from "./dashboard-content";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { clients, tests, plans, servers } = await getDashboardPageData();

  return (
    <DashboardContent 
        clients={clients}
        tests={tests}
        plans={plans}
        servers={servers}
    />
  );
}
