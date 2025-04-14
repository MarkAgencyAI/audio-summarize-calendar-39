
import React from "react";
import { Button } from "@/components/ui/button";
import { Copy, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Simplified palette based on the image
const predefinedColors = [
  "#FDF59B", // Yellow (first circle)
  "#B6D9FF", // Blue (second circle)
  "#FFB6C1", // Pink (third circle)
  "#FFD1A1", // Orange (fourth circle)
];

interface HighlightMenuProps {
  position: { x: number; y: number };
  isOpen: boolean;
  onClose: () => void;
  onApply: (color: string) => void;
  onRemove: () => void;
  onCopy: () => void;
  initialColor?: string;
  selectedText: string;
}

export function HighlightMenu({
  position,
  isOpen,
  onClose,
  onApply,
  onRemove,
  onCopy,
  initialColor = "#FDF59B",
  selectedText
}: HighlightMenuProps) {
  // Position the menu near the selected text
  const menuStyle: React.CSSProperties = {
    position: "fixed",
    top: `${Math.max(position.y - 10, 10)}px`,
    left: `${position.x}px`,
    transform: "translateX(-50%)",
    zIndex: 50,
    display: isOpen ? "flex" : "none",
  };

  return (
    <div 
      style={menuStyle} 
      className="animate-in fade-in zoom-in duration-200 bg-slate-800/90 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-slate-700 flex items-center gap-2"
    >
      {/* Color circles */}
      {predefinedColors.map((color) => (
        <button
          key={color}
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/20"
          )}
          style={{ backgroundColor: color }}
          onClick={() => onApply(color)}
          title="Resaltar con este color"
        />
      ))}

      {/* Divider */}
      <div className="h-6 w-px bg-slate-600 mx-1"></div>

      {/* Action buttons */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onCopy}
        className="h-7 w-7 rounded-full text-slate-300 hover:text-white hover:bg-slate-700"
        title="Copiar texto"
      >
        <Copy className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-7 w-7 rounded-full text-slate-300 hover:text-white hover:bg-slate-700"
        title="Eliminar resaltado"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
