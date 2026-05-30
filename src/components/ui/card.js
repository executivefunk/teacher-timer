import React from "react";
import clsx from "clsx";

export function Card({ children, className, ...rest }) {
  return (
    <div
      className={clsx(
        "bg-white border border-gray-200 rounded-xl shadow-sm",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardContent({ children, className, ...rest }) {
  return (
    <div className={clsx("p-4", className)} {...rest}>
      {children}
    </div>
  );
}
