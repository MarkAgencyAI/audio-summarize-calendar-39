
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { ChapterDialogProps, chapterColors } from "./types";

export function ChapterDialog({
  isOpen,
  onOpenChange,
  currentChapter,
  chapters,
  title,
  setTitle,
  color,
  setColor,
  onSave,
  currentTime
}: ChapterDialogProps) {
  const [showCustomColorPicker, setShowCustomColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState("#ffffff");
  
  const formatTimeNoMs = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    return h > 0
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m}:${s.toString().padStart(2, '0')}`;
  };
  
  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColor(e.target.value);
  };

  const applyCustomColor = () => {
    setColor(customColor);
    setShowCustomColorPicker(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {currentChapter && chapters.some(ch => ch.id === currentChapter.id)
              ? "Editar capítulo"
              : "Crear capítulo"}
          </DialogTitle>
          <DialogDescription>
            Define título y color para este segmento de audio
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="chapter-title">Título</Label>
            <Input 
              id="chapter-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nombre del capítulo"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Tiempo</Label>
            <div className="flex items-center gap-2 text-sm">
              <span>Inicio: {formatTimeNoMs(currentChapter?.startTime || currentTime)}</span>
              {currentChapter?.endTime && (
                <span>Fin: {formatTimeNoMs(currentChapter.endTime)}</span>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-6 gap-2">
              {chapterColors.map(colorOption => (
                <button
                  key={colorOption}
                  type="button"
                  className={`h-6 w-6 rounded-full border-2 ${color === colorOption ? 'border-primary' : 'border-transparent'}`}
                  style={{ backgroundColor: colorOption }}
                  onClick={() => setColor(colorOption)}
                />
              ))}
              <div className="relative">
                <input 
                  type="color" 
                  value={customColor} 
                  onChange={handleCustomColorChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <button
                  type="button"
                  className={`h-6 w-6 rounded-full bg-white border-2 flex items-center justify-center ${color === customColor ? 'border-primary' : 'border-gray-300'}`}
                  onClick={() => applyCustomColor()}
                >
                  <Plus className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button onClick={onSave}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
