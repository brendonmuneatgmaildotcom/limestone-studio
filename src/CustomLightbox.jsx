import React from "react";

export default function CustomLightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
    >
      <img
        src={src}
        alt=""
        className="max-h-screen max-w-screen p-4 object-contain"
      />
    </div>
  );
}