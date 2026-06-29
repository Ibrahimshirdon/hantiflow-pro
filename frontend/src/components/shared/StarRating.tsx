import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  size = "default",
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: "default" | "lg";
}) {
  const interactive = !!onChange;
  const starSize = size === "lg" ? "size-7" : "size-4";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            starSize,
            n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
            interactive && "cursor-pointer",
          )}
          onClick={interactive ? () => onChange(n) : undefined}
        />
      ))}
    </div>
  );
}
