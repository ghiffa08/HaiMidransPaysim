import { cn } from "@/lib/utils";

export function LayoutShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-screen bg-neutral-950 flex justify-center">
      <div
        className={cn(
          "w-full max-w-md bg-background h-[100dvh] shadow-2xl relative overflow-hidden flex flex-col",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
