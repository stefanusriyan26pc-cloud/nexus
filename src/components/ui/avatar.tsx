import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import Image from "next/image";

export function Avatar({
  src,
  name,
  size = "md",
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-12 w-12 text-base",
  };

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  if (src) {
    return (
      <Image
        src={src}
        alt={name ?? "Profile"}
        width={48}
        height={48}
        className={cn("rounded-full object-cover", sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-blue-100 font-medium text-blue-700",
        sizes[size],
        className
      )}
    >
      {initials || <User className="h-4 w-4" />}
    </div>
  );
}
