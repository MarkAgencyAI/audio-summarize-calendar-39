
import React, { useState } from 'react';
import { useRecordings } from '@/context/RecordingsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

interface GradesSectionProps {
  sectionTitle: string;
  folderId?: string;
}

export function GradesSection({ sectionTitle, folderId }: GradesSectionProps) {
  const { getFolderGrades, calculateFolderAverage, folders, addGrade, deleteGrade } = useRecordings();
  const [showAddGradeDialog, setShowAddGradeDialog] = useState(false);
  const [gradeName, setGradeName] = useState('');
  const [gradeScore, setGradeScore] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState(folderId || (folders.length > 0 ? folders[0].id : ''));

  const grades = folderId 
    ? getFolderGrades(folderId)
    : selectedFolderId 
      ? getFolderGrades(selectedFolderId)
      : [];
  
  const average = folderId 
    ? calculateFolderAverage(folderId)
    : selectedFolderId 
      ? calculateFolderAverage(selectedFolderId)
      : 0;

  const handleAddGrade = () => {
    if (!gradeName.trim()) {
      toast.error('El nombre no puede estar vacío');
      return;
    }

    const score = parseFloat(gradeScore);
    if (isNaN(score) || score < 0 || score > 10) {
      toast.error('La calificación debe ser un número entre 0 y 10');
      return;
    }

    const targetFolderId = folderId || selectedFolderId;
    if (!targetFolderId) {
      toast.error('Selecciona una carpeta');
      return;
    }

    addGrade(targetFolderId, gradeName.trim(), score);
    setGradeName('');
    setGradeScore('');
    setShowAddGradeDialog(false);
  };

  const handleDeleteGrade = (id: string) => {
    deleteGrade(id);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <BookOpen className="mr-2 h-5 w-5" />
              {sectionTitle}
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAddGradeDialog(true)}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Añadir</span>
            </Button>
          </div>
          <CardDescription>
            {average > 0 ? `Promedio: ${average.toFixed(1)}` : 'Sin calificaciones'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {grades.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">No hay calificaciones</p>
          ) : (
            <div className="space-y-2">
              {grades.map(grade => (
                <div key={grade.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                  <div>
                    <p className="font-medium">{grade.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(grade.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold">
                      {grade.score.toFixed(1)}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteGrade(grade.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddGradeDialog} onOpenChange={setShowAddGradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Añadir calificación</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="grade-name" className="text-right">
                Nombre
              </Label>
              <Input
                id="grade-name"
                value={gradeName}
                onChange={(e) => setGradeName(e.target.value)}
                className="col-span-3"
                placeholder="Ej. Examen parcial"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="grade-score" className="text-right">
                Nota
              </Label>
              <Input
                id="grade-score"
                value={gradeScore}
                onChange={(e) => setGradeScore(e.target.value)}
                className="col-span-3"
                placeholder="0-10"
                type="number"
                min="0"
                max="10"
                step="0.1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddGradeDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddGrade}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
