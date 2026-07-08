import { NexumMark } from "@/components/brand/nexum-logo";
import { cn } from "@/lib/utils";

export function LoadingScreen({
  label = "Loading",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-slate-950",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-cyan-600/25 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-2xl bg-blue-500/20" />
          <NexumMark size={72} className="relative rounded-2xl shadow-2xl shadow-blue-500/30" />
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-purple-400" />
          </div>
          <p className="text-sm font-medium tracking-wide text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
