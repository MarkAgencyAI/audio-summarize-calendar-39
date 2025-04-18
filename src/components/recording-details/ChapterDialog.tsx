
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Plus, Bookmark } from "lucide-react";
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
  const [customColor, setCustomColor] = useState("#60a5fa");
  
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

  const isEditMode = currentChapter && chapters.some(ch => ch.id === currentChapter.id);

  const handleSaveClick = () => {
    // Call the onSave function to save the chapter
    onSave();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-lg dark:bg-slate-900 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-blue-500" />
            {isEditMode ? "Editar capítulo" : "Crear capítulo"}
          </DialogTitle>
          <DialogDescription className="text-slate-500 dark:text-slate-400">
            Define título y color para este segmento de audio
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="chapter-title" className="text-slate-700 dark:text-slate-300">Título</Label>
            <Input 
              id="chapter-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nombre del capítulo"
              className="border-slate-200 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300">Tiempo</Label>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                <Clock className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                <span className="text-slate-700 dark:text-slate-300">
                  Inicio: {formatTimeNoMs(currentChapter?.startTime || currentTime)}
                </span>
              </div>
              
              {currentChapter?.endTime && (
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                  <Clock className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                  <span className="text-slate-700 dark:text-slate-300">
                    Fin: {formatTimeNoMs(currentChapter.endTime)}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300">Color</Label>
            <div className="grid grid-cols-6 gap-2">
              {chapterColors.map((colorOption, index) => (
                <button
                  key={index}
                  type="button"
                  className={`h-8 w-8 rounded-full transition-transform ${color === colorOption ? 'ring-2 ring-blue-500 dark:ring-blue-400 scale-110' : 'ring-1 ring-slate-200 dark:ring-slate-700'}`}
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
                  className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center ring-1 ring-slate-200 dark:ring-slate-700"
                  onClick={() => applyCustomColor()}
                >
                  <Plus className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="mt-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-slate-200 dark:border-slate-700 dark:text-slate-300"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveClick}
            className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            {isEditMode ? "Actualizar" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
