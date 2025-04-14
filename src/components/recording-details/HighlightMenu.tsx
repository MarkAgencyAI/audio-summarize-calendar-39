
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HexColorPicker } from "react-colorful";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Paleta de colores predefinidos
const predefinedColors = [
  "#FEF7CD", // Amarillo claro (default)
  "#D3E4FD", // Azul claro
  "#F2FCE2", // Verde claro
  "#FDE1D3", // Naranja claro
  "#E5DEFF", // Morado claro
  "#FFDEE2", // Rosa claro
  "#FFEB3B", // Amarillo
  "#4CAF50", // Verde
  "#2196F3", // Azul
  "#F44336", // Rojo
  "#9C27B0", // Morado
  "#FF9800", // Naranja
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
  initialColor = "#FEF7CD",
  selectedText
}: HighlightMenuProps) {
  const [color, setColor] = useState(initialColor);
  const [activeTab, setActiveTab] = useState<string>("predefined");

  // Posicionar el menú cerca del texto seleccionado
  const menuStyle: React.CSSProperties = {
    position: "fixed",
    top: `${Math.max(position.y - 10, 10)}px`,
    left: `${position.x}px`,
    transform: "translateX(-50%)",
    zIndex: 50,
    display: isOpen ? "block" : "none",
  };

  const handleApply = () => {
    onApply(color);
  };

  return (
    <div style={menuStyle} className="animate-in fade-in zoom-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-3 w-64">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Resaltar texto</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
          </Button>
        </div>

        {selectedText && (
          <div className="mb-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
            <p className="truncate">{selectedText}</p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-3">
          <TabsList className="grid grid-cols-2 h-8">
            <TabsTrigger value="predefined" className="text-xs">Colores</TabsTrigger>
            <TabsTrigger value="custom" className="text-xs">Personalizado</TabsTrigger>
          </TabsList>
          
          <TabsContent value="predefined" className="mt-2">
            <div className="grid grid-cols-4 gap-2">
              {predefinedColors.map((presetColor) => (
                <button
                  key={presetColor}
                  className={cn(
                    "w-full h-8 rounded border",
                    color === presetColor
                      ? "ring-2 ring-offset-1 ring-blue-500"
                      : "border-slate-200 dark:border-slate-700"
                  )}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => setColor(presetColor)}
                >
                  {color === presetColor && (
                    <Check className="h-3 w-3 text-slate-700 mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="custom" className="mt-2">
            <div>
              <HexColorPicker color={color} onChange={setColor} className="w-full mb-2" />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="mb-2 text-sm"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCopy}
            className="text-xs h-8"
          >
            <Copy className="h-3 w-3 mr-1" />
            Copiar
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onRemove}
            className="text-xs h-8 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
          >
            <X className="h-3 w-3 mr-1" />
            Eliminar
          </Button>
          
          <Button
            size="sm"
            onClick={handleApply}
            className="text-xs h-8"
          >
            <Check className="h-3 w-3 mr-1" />
            Aplicar
          </Button>
        </div>
      </div>
    </div>
  );
}
