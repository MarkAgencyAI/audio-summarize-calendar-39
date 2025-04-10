import React, { useState, useEffect, useRef } from "react";
import { useRecordings } from "@/context/RecordingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, Plus, MoreVertical, Edit, Trash2, Save, X, ChevronRight, ChevronDown, File } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export function FolderSystem() {
  const { folders, recordings, addFolder, updateFolder, deleteFolder } = useRecordings();
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("#4f46e5");
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when adding a new folder
  useEffect(() => {
    if (isAddingFolder && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingFolder]);

  // Focus input when editing a folder
  useEffect(() => {
    if (editingFolder && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingFolder]);

  const handleAddFolder = () => {
    if (newFolderName.trim() === "") {
      toast.error("El nombre de la carpeta no puede estar vacío");
      return;
    }

    addFolder({
      id: crypto.randomUUID(),
      name: newFolderName,
      color: newFolderColor,
      createdAt: new Date().toISOString()
    });

    setNewFolderName("");
    setIsAddingFolder(false);
    toast.success("Carpeta creada correctamente");
  };

  const handleEditFolder = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      setEditingFolder(folderId);
      setEditName(folder.name);
      setEditColor(folder.color);
    }
  };

  const handleSaveEdit = (folderId: string) => {
    if (editName.trim() === "") {
      toast.error("El nombre de la carpeta no puede estar vacío");
      return;
    }

    updateFolder(folderId, {
      name: editName,
      color: editColor
    });

    setEditingFolder(null);
    toast.success("Carpeta actualizada correctamente");
  };

  const handleDeleteFolder = (folderId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta carpeta? Las grabaciones se moverán a la carpeta predeterminada.")) {
      deleteFolder(folderId);
      toast.success("Carpeta eliminada correctamente");
    }
  };

  const toggleFolderExpand = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const getFolderRecordings = (folderId: string) => {
    return recordings.filter(recording => recording.folderId === folderId);
  };

  const formatCreationDate = (date: string) => {
    return formatDate(date);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Carpetas</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsAddingFolder(true)}
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          <span>Nueva carpeta</span>
        </Button>
      </div>

      <Dialog open={isAddingFolder} onOpenChange={setIsAddingFolder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear nueva carpeta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="folder-name" className="text-sm font-medium">
                Nombre de la carpeta
              </label>
              <Input
                id="folder-name"
                ref={inputRef}
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="Nombre de la carpeta"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="folder-color" className="text-sm font-medium">
                Color
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="folder-color"
                  type="color"
                  value={newFolderColor}
                  onChange={e => setNewFolderColor(e.target.value)}
                  className="w-12 h-8 p-1"
                />
                <span className="text-sm text-muted-foreground">
                  {newFolderColor}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingFolder(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddFolder}>
              Crear carpeta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="space-y-1">
          {folders.map(folder => (
            <div key={folder.id} className="rounded-md overflow-hidden">
              <div 
                className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                onClick={() => toggleFolderExpand(folder.id)}
              >
                <div className="flex items-center gap-2">
                  {expandedFolders[folder.id] ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  
                  {editingFolder === folder.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        ref={inputRef}
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="h-7 w-40"
                        onClick={e => e.stopPropagation()}
                      />
                      <Input
                        type="color"
                        value={editColor}
                        onChange={e => setEditColor(e.target.value)}
                        className="w-7 h-7 p-1"
                        onClick={e => e.stopPropagation()}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={e => {
                          e.stopPropagation();
                          handleSaveEdit(folder.id);
                        }}
                        className="h-7 w-7 p-0"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={e => {
                          e.stopPropagation();
                          setEditingFolder(null);
                        }}
                        className="h-7 w-7 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div 
                        className="h-5 w-5 rounded-md flex items-center justify-center" 
                        style={{ backgroundColor: folder.color }}
                      >
                        <Folder className="h-3 w-3 text-white" />
                      </div>
                      <span className="font-medium">{folder.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({getFolderRecordings(folder.id).length})
                      </span>
                    </>
                  )}
                </div>
                
                {editingFolder !== folder.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Opciones</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditFolder(folder.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDeleteFolder(folder.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              {expandedFolders[folder.id] && (
                <div className="pl-9 pr-2 pb-2 space-y-1">
                  {getFolderRecordings(folder.id).length > 0 ? (
                    getFolderRecordings(folder.id).map(recording => (
                      <div 
                        key={recording.id}
                        className="flex items-center justify-between p-2 hover:bg-muted/30 rounded-md text-sm"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <File className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{recording.name || "Sin nombre"}</span>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatCreationDate(recording.createdAt)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground p-2">
                      No hay grabaciones en esta carpeta
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
