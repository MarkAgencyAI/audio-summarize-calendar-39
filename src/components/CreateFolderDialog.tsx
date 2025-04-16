
import React, { useState } from 'react';
import { useRecordings } from '@/context/RecordingsContext';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { HexColorPicker } from 'react-colorful';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFolderDialog({ open, onOpenChange }: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('#4f46e5');
  const { addFolder } = useRecordings();

  const handleCreate = async () => {
    if (!folderName.trim()) {
      toast.error('El nombre de la carpeta no puede estar vacío');
      return;
    }

    try {
      await addFolder({
        name: folderName.trim(),
        color: folderColor,
        createdAt: new Date().toISOString()
      });
      
      setFolderName('');
      setFolderColor('#4f46e5');
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Error al crear la carpeta');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva carpeta</DialogTitle>
          <DialogDescription>
            Crea una nueva carpeta para organizar tus grabaciones.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre
            </Label>
            <Input
              id="name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="col-span-3"
              placeholder="Ej. Matemáticas"
              autoFocus
            />
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">
              Color
            </Label>
            <div className="col-span-3">
              <HexColorPicker color={folderColor} onChange={setFolderColor} />
              <div className="flex items-center gap-3 mt-2">
                <div 
                  className="h-8 w-8 rounded-full"
                  style={{ backgroundColor: folderColor }}
                />
                <Input 
                  value={folderColor} 
                  onChange={(e) => setFolderColor(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleCreate}>Crear carpeta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
