import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import DashboardContent from "@/components/dashboard/DashboardContent";
import DashboardEmpty from "@/components/dashboard/DashboardEmpty";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (session?.user.role === "admin" && !session?.session.activeOrganizationId) {
    redirect("/super-admin");
  }
  
  const hasOrg = session?.session.activeOrganizationId;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {hasOrg ? <DashboardContent /> : <DashboardEmpty />}
      </main>
    </div>
  );
}
