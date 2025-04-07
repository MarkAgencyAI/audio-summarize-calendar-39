
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRecordings } from "@/context/RecordingsContext";
import { Layout } from "@/components/Layout";
import { RecordingItem } from "@/components/RecordingItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotesSection } from "@/components/NotesSection";
import { ArrowLeft, Pencil, Check, X, Folder, FileText, BookOpen, GraduationCap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function FolderDetailsPage() {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const { 
    folders, 
    recordings, 
    updateFolder, 
    getFolderGrades, 
    calculateFolderAverage, 
    addGrade, 
    deleteGrade 
  } = useRecordings();
  const folder = folders.find(f => f.id === folderId);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [activeTab, setActiveTab] = useState("transcriptions");
  const [showAddGradeDialog, setShowAddGradeDialog] = useState(false);
  const [newGradeName, setNewGradeName] = useState("");
  const [newGradeScore, setNewGradeScore] = useState<number>(0);
  
  useEffect(() => {
    if (!folder) {
      navigate("/folders");
      return;
    }
    
    setFolderName(folder.name);
  }, [folder, navigate]);
  
  if (!folder) {
    return null;
  }
  
  const folderRecordings = recordings.filter(r => r.folderId === folderId);
  const folderGrades = getFolderGrades(folderId || "");
  const averageGrade = calculateFolderAverage(folderId || "");
  
  const handleSaveTitle = () => {
    if (folderName.trim() === "") {
      toast.error("El nombre no puede estar vacío");
      return;
    }
    
    updateFolder(folder.id, { name: folderName });
    setIsEditingTitle(false);
    toast.success("Nombre actualizado");
  };
  
  const handleCancelEdit = () => {
    setFolderName(folder.name);
    setIsEditingTitle(false);
  };
  
  const handleAddToCalendar = (recording: any) => {
    console.log("Add to calendar:", recording);
    toast.info("Funcionalidad en desarrollo");
  };

  const handleAddGrade = () => {
    if (newGradeName.trim() === "") {
      toast.error("El nombre de la evaluación no puede estar vacío");
      return;
    }
    
    if (newGradeScore < 0 || newGradeScore > 10) {
      toast.error("La calificación debe estar entre 0 y 10");
      return;
    }
    
    addGrade(folder.id, newGradeName, newGradeScore);
    setNewGradeName("");
    setNewGradeScore(0);
    setShowAddGradeDialog(false);
    toast.success("Evaluación añadida");
  };
  
  const handleDeleteGrade = (gradeId: string) => {
    deleteGrade(gradeId);
    toast.success("Evaluación eliminada");
  };
  
  return (
    <Layout>
      <div className="space-y-6 max-w-full">
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/folders")}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div 
            className="h-8 w-8 rounded flex items-center justify-center" 
            style={{ backgroundColor: folder.color }}
          >
            <Folder className="h-4 w-4 text-white" />
          </div>
          
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input 
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="h-9 max-w-[300px]"
                autoFocus
              />
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleSaveTitle}
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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{folder.name}</h1>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsEditingTitle(true)}
                className="h-8 w-8 p-0"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="transcriptions" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>Transcripciones</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>Apuntes</span>
            </TabsTrigger>
            <TabsTrigger value="grades" className="flex items-center gap-1">
              <GraduationCap className="h-4 w-4" />
              <span>Evaluaciones</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="transcriptions">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-500" />
                  Transcripciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                {folderRecordings.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    <p>No hay transcripciones en esta carpeta</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {folderRecordings.map(recording => (
                      <div key={recording.id} className="mb-2">
                        <RecordingItem
                          recording={recording}
                          onAddToCalendar={handleAddToCalendar}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notes">
            <NotesSection folderId={folderId} sectionTitle={`Apuntes de ${folder.name}`} />
          </TabsContent>
          
          <TabsContent value="grades">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-purple-500" />
                  Evaluaciones
                  {averageGrade > 0 && (
                    <span className={`ml-2 text-sm font-medium px-2 py-1 rounded-md ${
                      averageGrade >= 6 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      Promedio: {averageGrade.toFixed(1)}
                    </span>
                  )}
                </CardTitle>
                <Button 
                  size="sm" 
                  onClick={() => setShowAddGradeDialog(true)}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Nueva evaluación
                </Button>
              </CardHeader>
              <CardContent>
                {folderGrades.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    <p>No hay evaluaciones en esta materia</p>
                    <p className="text-xs mt-1">
                      Agrega evaluaciones para llevar un seguimiento de tu desempeño
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {folderGrades.map(grade => (
                      <div 
                        key={grade.id} 
                        className="flex items-center justify-between p-3 rounded-lg border border-border"
                      >
                        <div>
                          <p className="font-medium">{grade.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(grade.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-bold ${
                            grade.score >= 6 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {grade.score.toFixed(1)}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-red-500 h-8 w-8 p-0"
                            onClick={() => handleDeleteGrade(grade.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Add Grade Dialog */}
      <Dialog open={showAddGradeDialog} onOpenChange={setShowAddGradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva evaluación</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 my-2">
            <div className="space-y-2">
              <Label htmlFor="grade-name">Nombre de la evaluación</Label>
              <Input
                id="grade-name"
                value={newGradeName}
                onChange={(e) => setNewGradeName(e.target.value)}
                placeholder="Ej: Examen parcial, Trabajo práctico, etc."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="grade-score">Calificación (0-10)</Label>
              <Input
                id="grade-score"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={newGradeScore}
                onChange={(e) => setNewGradeScore(parseFloat(e.target.value))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddGradeDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddGrade}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
