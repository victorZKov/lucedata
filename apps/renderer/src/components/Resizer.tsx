import { useState, useRef, useEffect } from "react";

interface ResizerProps {
  direction: "horizontal" | "vertical";
  onResize: (delta: number) => void;
  className?: string;
}

export default function Resizer({ direction, onResize, className = "" }: ResizerProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [startPosition, setStartPosition] = useState(0);
  const resizerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const currentPosition = direction === "horizontal" ? e.clientX : e.clientY;
      const delta = currentPosition - startPosition;
      onResize(delta);
      setStartPosition(currentPosition);
      // Nudge layout so virtualized/monaco areas reflow while dragging
      window.dispatchEvent(new Event('resize'));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.dispatchEvent(new Event('resize'));
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, startPosition, direction, onResize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setStartPosition(direction === "horizontal" ? e.clientX : e.clientY);
  };

  const baseClasses = direction === "horizontal" 
    ? "w-1 h-full cursor-col-resize hover:bg-blue-500 hover:bg-opacity-50 active:bg-blue-500 z-20"
    : "h-1 w-full cursor-row-resize hover:bg-blue-500 hover:bg-opacity-50 active:bg-blue-500 z-20";

  return (
    <div
      ref={resizerRef}
      className={`${baseClasses} ${className} transition-colors duration-150 flex-shrink-0`}
      onMouseDown={handleMouseDown}
      style={{
        backgroundColor: isResizing ? "rgb(59 130 246)" : "transparent",
      }}
    />
  );
}