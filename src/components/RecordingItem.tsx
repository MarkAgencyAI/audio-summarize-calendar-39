
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, GraduationCap, Pencil, Trash2, X, Folder, Clock, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { RecordingService } from '@/lib/services/recording-service';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useRecordings } from '@/context/RecordingsContext';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RecordingItemProps {
  recording: any;
  onAddToCalendar?: (recording: any) => void;
}

export function RecordingItem({ recording, onAddToCalendar }: RecordingItemProps) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [nameInput, setNameInput] = useState(recording.name);
  const [showAssignFolderDialog, setShowAssignFolderDialog] = useState(false);
  const { deleteRecording, folders, refreshData } = useRecordings();

  const handleViewDetails = () => {
    navigate(`/recordings/${recording.id}`);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameInput(e.target.value);
  };

  const handleSaveName = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nameInput.trim() === '') {
      toast.error('El nombre no puede estar vacío');
      return;
    }

    try {
      await RecordingService.updateRecording(recording.id, { name: nameInput.trim() });
      toast.success('Nombre actualizado');
      setIsEditing(false);
      refreshData();
    } catch (error) {
      console.error('Error updating recording name:', error);
      toast.error('Error al actualizar el nombre');
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNameInput(recording.name);
    setIsEditing(false);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteRecording(recording.id);
      toast.success('Grabación eliminada');
      setIsDeleting(false);
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast.error('Error al eliminar la grabación');
    }
  };

  const handleAddToCalendarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCalendar) {
      onAddToCalendar(recording);
    }
  };

  const getRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: es });
    } catch (e) {
      return 'hace algún tiempo';
    }
  };

  const handleAssignFolder = async (folderId: string | null) => {
    try {
      await RecordingService.updateRecording(recording.id, { folderId });
      await refreshData();
      const folderName = folderId 
        ? folders.find(f => f.id === folderId)?.name || 'la carpeta' 
        : 'Sin carpeta';
      toast.success(`Transcripción asignada a ${folderName}`);
      setShowAssignFolderDialog(false);
    } catch (error) {
      console.error('Error asignando carpeta:', error);
      toast.error('Error al asignar la carpeta');
    }
  };

  const getFolderName = () => {
    if (!recording.folderId) return null;
    const folder = folders.find(f => f.id === recording.folderId);
    return folder ? folder.name : null;
  };

  const getFolderColor = () => {
    if (!recording.folderId) return null;
    const folder = folders.find(f => f.id === recording.folderId);
    return folder ? folder.color : null;
  };

  return (
    <>
      <Card 
        className="p-3 cursor-pointer hover:bg-accent/50" 
        onClick={handleViewDetails}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1 w-full">
            <div className="flex items-center justify-between">
              {isEditing ? (
                <div className="flex items-center gap-2 w-full">
                  <Input 
                    value={nameInput} 
                    onChange={handleNameChange} 
                    autoFocus 
                    onClick={(e) => e.stopPropagation()}
                    className="h-8"
                  />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSaveName}
                    className="h-8 w-8 p-0"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleCancelEdit}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <div className="font-medium text-sm sm:text-base line-clamp-1 mr-2">
                    {recording.name}
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {recording.folderId && (
                      <div 
                        className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full"
                        style={{ 
                          backgroundColor: `${getFolderColor()}20`,
                          color: getFolderColor()
                        }}
                      >
                        <Folder className="h-3 w-3" />
                        <span className="max-w-[100px] truncate">{getFolderName()}</span>
                      </div>
                    )}
                    
                    {recording.understood !== undefined && (
                      <Badge variant={recording.understood ? 'success' : 'warning'} className="text-xs">
                        {recording.understood ? 'Entendida' : 'No entendida'}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{getRelativeTime(recording.createdAt || recording.date)}</span>
              </div>
              
              {recording.duration && (
                <div>
                  <span>·</span>
                  <span className="ml-1">
                    {Math.floor(recording.duration / 60)}:{(recording.duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-1 ml-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Editar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditClick(e as any); }}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Renombrar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowAssignFolderDialog(true); }}>
                  <Folder className="h-4 w-4 mr-2" />
                  Asignar a carpeta
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAddToCalendarClick(e as any); }}>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Añadir al calendario
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); handleDeleteClick(e as any); }}
                  className="text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Ver detalles</span>
            </Button>
          </div>
        </div>
      </Card>
      
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar grabación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta grabación? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleting(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showAssignFolderDialog} onOpenChange={setShowAssignFolderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar a carpeta</DialogTitle>
            <DialogDescription>
              Selecciona la carpeta donde deseas guardar esta transcripción
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-select">Carpeta</Label>
              <Select 
                defaultValue={recording.folderId || ""}
                onValueChange={(value) => handleAssignFolder(value === "" ? null : value)}
              >
                <SelectTrigger id="folder-select">
                  <SelectValue placeholder="Seleccionar carpeta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin carpeta</SelectItem>
                  {folders.map(folder => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: folder.color }}
                        ></div>
                        {folder.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignFolderDialog(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
