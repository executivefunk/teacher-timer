import React from "react";
import clsx from "clsx";

export function Input({
  type = "text",
  placeholder,
  value,
  onChange,
  className,
  ...rest
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={clsx(
        "w-full px-4 py-3 text-base bg-white border border-gray-300 rounded-lg",
        "placeholder:text-gray-400",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
        "disabled:bg-gray-100 disabled:cursor-not-allowed",
        className
      )}
      {...rest}
    />
  );
}
