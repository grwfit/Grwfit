import { cn } from "@grwfit/ui";

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center min-h-[400px]">
      <LoadingSpinner />
    </div>
  );
}
