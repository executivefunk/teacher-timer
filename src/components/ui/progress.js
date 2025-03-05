import React from "react";

export function Progress({ value }) {
  return (
    <div className="w-full bg-gray-200 rounded h-2">
      <div
        className="bg-blue-500 h-2 rounded"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
