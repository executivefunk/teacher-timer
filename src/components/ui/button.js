import React from "react";
import clsx from "clsx";

const variants = {
  primary:
    "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-transparent",
  secondary:
    "bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 border-gray-300",
  ghost:
    "bg-transparent hover:bg-black/10 active:bg-black/20 text-current border-transparent",
  danger:
    "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-transparent",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-base",
  lg: "px-5 py-3 text-lg",
};

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className,
  disabled = false,
  type = "button",
  ...rest
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex items-center justify-center gap-2 font-semibold rounded-lg border transition",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
