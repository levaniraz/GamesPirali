import { useRef } from "react";

export default function Joystick({ onMove }) {
  const baseRef = useRef(null);

  const handleMove = (e) => {
    const rect = baseRef.current.getBoundingClientRect();

    const x = (e.touches[0].clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.touches[0].clientY - rect.top - rect.height / 2) / (rect.height / 2);

    const length = Math.sqrt(x * x + y * y);

    if (length > 1) {
      onMove(x / length, y / length);
    } else {
      onMove(x, y);
    }
  };

  return (
    <div
      ref={baseRef}
      onTouchMove={handleMove}
      style={{
        position: "absolute",
        bottom: 40,
        left: 40,
        width: 120,
        height: 120,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.1)",
        border: "2px solid #00fff7"
      }}
    />
  );
}