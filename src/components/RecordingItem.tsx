
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Headphones, 
  Clock, 
  ChevronRight, 
  Pencil, 
  Trash2, 
  CalendarIcon, 
  Check, 
  X, 
  Folder 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { RecordingService } from '@/lib/services/recording-service';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useRecordings } from '@/context/RecordingsContext';

interface RecordingItemProps {
  recording: any;
  onAddToCalendar?: (recording: any) => void;
}

export function RecordingItem({ recording, onAddToCalendar }: RecordingItemProps) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [nameInput, setNameInput] = useState(recording.name);
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

  const handleUnderstoodToggle = async (understood: boolean) => {
    try {
      await RecordingService.updateRecording(recording.id, { understood });
      toast.success(understood ? 'Marcado como entendido' : 'Marcado como no entendido');
      refreshData();
    } catch (error) {
      console.error('Error updating understood status:', error);
      toast.error('Error al actualizar el estado');
    }
  };

  // Format duration in minutes:seconds
  const formatDuration = (seconds: number) => {
    if (!seconds) return null;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Card 
        className="p-4 cursor-pointer hover:bg-accent/50 transition-all" 
        onClick={handleViewDetails}
      >
        {/* Status badge - Understood or Not understood */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <Headphones className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Grabación</span>
          </div>
          
          <Badge 
            className={`${recording.understood 
              ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400'} 
              flex items-center gap-1 px-2 py-1`}
            onClick={(e) => {
              e.stopPropagation();
              handleUnderstoodToggle(!recording.understood);
            }}
          >
            {recording.understood ? (
              <>
                <Check className="h-3 w-3" />
                <span>Entendida</span>
              </>
            ) : (
              <>
                <X className="h-3 w-3" />
                <span>No entendida</span>
              </>
            )}
          </Badge>
        </div>
        
        {/* Recording title */}
        <div className="mb-3">
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
            <h3 className="font-medium text-base line-clamp-2">
              {recording.name}
            </h3>
          )}
        </div>
        
        {/* Metadata section */}
        <div className="space-y-2 mb-3">
          {/* Date and duration */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{getRelativeTime(recording.createdAt || recording.date)}</span>
            
            {recording.duration && (
              <div className="flex items-center gap-1">
                <span>·</span>
                <span>{formatDuration(recording.duration)}</span>
              </div>
            )}
          </div>
          
          {/* Folder information */}
          {recording.folderId && (
            <div 
              className="flex items-center gap-1.5 text-xs rounded-full py-1"
              style={{ color: getFolderColor() }}
            >
              <Folder className="h-3.5 w-3.5" />
              <span className="max-w-[200px] truncate">{getFolderName()}</span>
            </div>
          )}
        </div>
        
        {/* Actions section */}
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                <span>Editar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditClick(e as any); }}>
                <Pencil className="h-4 w-4 mr-2" />
                Renombrar
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
          
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <span>Ver</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
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
    </>
  );
}
