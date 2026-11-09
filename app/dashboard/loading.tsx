import { Skeleton } from "@/components/ui/skeleton";

/** Shown instantly while a dashboard route (and its server session check) loads. */
export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-background" aria-busy aria-label="Loading">
      <div className="h-14 border-b border-border bg-card/80" />
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <Skeleton className="h-9 w-80 max-w-full" />
        <Skeleton className="mt-3 h-5 w-64 max-w-full" />
        <Skeleton className="mt-8 h-[3.75rem] w-full rounded-xl" />
        <div className="mt-12 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
