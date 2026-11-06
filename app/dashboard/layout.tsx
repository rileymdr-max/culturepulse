import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Dashboard layout — server-side session guard (supplements middleware).
 * All /dashboard/* pages inherit this layout.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <>
      {children}
      <footer className="border-t border-border/40 py-4 px-6 text-center">
        <p className="text-[11px] text-muted-foreground/50">
          Intelligence profiles and content briefs are generated with the assistance of Claude by Anthropic.
        </p>
      </footer>
    </>
  );
}
