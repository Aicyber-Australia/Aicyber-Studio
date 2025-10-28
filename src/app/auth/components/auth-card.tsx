import { cn } from "@/lib/utils";

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-8 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
