import React from "react";
import clsx from "clsx";

export function Progress({
  value = 0,
  className,
  barClassName,
  trackClassName,
}) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={clsx(
        "w-full h-2 rounded-full overflow-hidden",
        trackClassName || "bg-gray-200",
        className
      )}
    >
      <div
        className={clsx(
          "h-full rounded-full transition-all duration-300",
          barClassName || "bg-blue-500"
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
