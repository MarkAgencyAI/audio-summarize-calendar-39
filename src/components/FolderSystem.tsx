
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecordings } from "@/context/RecordingsContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Folder, Plus, MoreHorizontal, Edit, Trash2,
  Book, Calculator, FileText, Flask, Microscope,
  Languages, ArrowUp, Music, Palette, Code,
  GraduationCap, Globe, Dumbbell, Building
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import { HexColorPicker } from "react-colorful";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Subject icons mapping - updated with correct lucide-react icons
const subjectIcons = [
  { name: "Book", icon: Book, label: "Literatura" },
  { name: "Calculator", icon: Calculator, label: "Matemáticas" },
  { name: "FileText", icon: FileText, label: "Historia" },
  { name: "Flask", icon: Flask, label: "Química" },
  { name: "Microscope", icon: Microscope, label: "Biología" },
  { name: "Languages", icon: Languages, label: "Idiomas" },
  { name: "ArrowUp", icon: ArrowUp, label: "Física" },
  { name: "Music", icon: Music, label: "Música" },
  { name: "Palette", icon: Palette, label: "Arte" },
  { name: "Code", icon: Code, label: "Informática" },
  { name: "GraduationCap", icon: GraduationCap, label: "Educación" },
  { name: "Globe", icon: Globe, label: "Geografía" },
  { name: "Dumbbell", icon: Dumbbell, label: "Educación Física" },
  { name: "Building", icon: Building, label: "Arquitectura" }
];

export function FolderSystem() {
  const navigate = useNavigate();
  const {
    folders,
    recordings,
    addFolder,
    deleteFolder
  } = useRecordings();
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderColor, setFolderColor] = useState("#4f46e5");
  const [selectedIcon, setSelectedIcon] = useState("Book");

  // Array of folder color options as presets
  const colorOptions = [
    "#4f46e5", // Indigo
    "#06b6d4", // Cyan
    "#ec4899", // Pink
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#8b5cf6", // Violet
    "#84cc16"  // Lime
  ];

  const handleCreateFolder = (name: string, color: string) => {
    addFolder({
      name,
      color,
      icon: selectedIcon,
      createdAt: new Date().toISOString()
    });
    setShowNewFolderDialog(false);
    setNewFolderName('');
  };

  const handleDeleteFolder = (folderId: string) => {
    deleteFolder(folderId);
  };

  // Get the icon component based on name
  const getFolderIcon = (iconName: string) => {
    const iconItem = subjectIcons.find(item => item.name === iconName);
    const IconComponent = iconItem ? iconItem.icon : Book; // Default to Book if not found
    return IconComponent;
  };

  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Mis materias</h2>
        <Button onClick={() => setShowNewFolderDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nueva materia
        </Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {folders.map(folder => {
        const folderRecordings = recordings.filter(recording => recording.folderId === folder.id);
        const folderDate = folder.createdAt ? format(parseISO(folder.createdAt), "d MMM yyyy", {
          locale: es
        }) : "";
        const FolderIcon = folder.icon ? getFolderIcon(folder.icon) : Folder;
        
        return <div key={folder.id} onClick={() => navigate(`/folder/${folder.id}`)} className="group bg-card hover:bg-accent rounded-lg p-4 transition-colors cursor-pointer flex flex-col justify-between h-32 border-2">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{
              backgroundColor: folder.color
            }}>
                  <FolderIcon className="h-5 w-5 text-white" />
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="cursor-pointer" onClick={e => {
                  e.stopPropagation();
                  navigate(`/folder/${folder.id}`);
                }}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Editar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={e => {
                  e.stopPropagation();
                  handleDeleteFolder(folder.id);
                }}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Eliminar</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div>
                <h3 className="font-medium truncate">{folder.name}</h3>
                <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                  <span>{folderRecordings.length} archivos</span>
                  <span>{folderDate}</span>
                </div>
              </div>
            </div>;
      })}
      </div>
      
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva materia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Nombre</Label>
              <Input id="folder-name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Nombre de la materia" />
            </div>
            
            <Tabs defaultValue="presets" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="presets">Colores predefinidos</TabsTrigger>
                <TabsTrigger value="custom">Color personalizado</TabsTrigger>
              </TabsList>
              <TabsContent value="presets" className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map(color => (
                    <button 
                      key={color} 
                      className={`w-8 h-8 rounded-full transition-all ${folderColor === color ? "ring-2 ring-offset-2 ring-primary" : "hover:scale-110"}`} 
                      style={{ backgroundColor: color }} 
                      onClick={() => setFolderColor(color)} 
                      type="button"
                    />
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="custom" className="space-y-2">
                <Label>Color personalizado</Label>
                <HexColorPicker color={folderColor} onChange={setFolderColor} />
                <div className="flex items-center gap-2 mt-2">
                  <div 
                    className="w-8 h-8 rounded-full" 
                    style={{ backgroundColor: folderColor }}
                  ></div>
                  <Input 
                    value={folderColor} 
                    onChange={(e) => setFolderColor(e.target.value)}
                    className="w-28"
                  />
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="space-y-2">
              <Label>Ícono</Label>
              <ScrollArea className="h-[200px] rounded-md border p-2">
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {subjectIcons.map(({ name, icon: IconComponent, label }) => (
                    <div 
                      key={name}
                      onClick={() => setSelectedIcon(name)}
                      className={`p-2 flex flex-col items-center justify-center rounded-md cursor-pointer hover:bg-muted transition-colors text-center ${selectedIcon === name ? 'bg-primary/10 ring-1 ring-primary' : ''}`}
                    >
                      <IconComponent size={24} className={selectedIcon === name ? 'text-primary' : ''} />
                      <span className="text-xs mt-1 truncate w-full">{label}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => handleCreateFolder(newFolderName, folderColor)} disabled={!newFolderName.trim()}>
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}
