import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { useRecordings } from "@/context/RecordingsContext";
import { Button } from "@/components/ui/button";
import { Folder, Plus, Edit, Trash2, ArrowLeft } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { RecordingItem } from "@/components/RecordingItem";
import { FolderService } from "@/lib/services/folder-service";
import { UpcomingEvents } from "@/components/UpcomingEvents";

export default function FolderDetailsPage() {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const { folders, recordings, updateFolder, deleteFolder, refreshData } = useRecordings();
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const folder = folders.find((f) => f.id === folderId);

  useEffect(() => {
    if (folder) {
      setNameInput(folder.name);
    }
  }, [folder]);

  if (!folder) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold mb-4">Carpeta no encontrada</h2>
          <p>La carpeta que estás buscando no existe.</p>
          <Button onClick={() => navigate("/dashboard")}>Volver al Dashboard</Button>
        </div>
      </Layout>
    );
  }

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveName = async () => {
    if (nameInput.trim() === "") {
      toast.error("El nombre no puede estar vacío");
      return;
    }

    try {
      await updateFolder(folderId, { name: nameInput });
      toast.success("Nombre actualizado");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating folder name:", error);
      toast.error("Error al actualizar el nombre");
    }
  };

  const handleCancelEdit = () => {
    setNameInput(folder.name);
    setIsEditing(false);
  };

  const handleDeleteFolder = async () => {
    try {
      await deleteFolder(folderId);
      toast.success("Carpeta eliminada");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error deleting folder:", error);
      toast.error("Error al eliminar la carpeta");
    }
  };

  const folderRecordings = recordings.filter((r) => r.folderId === folderId);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/70"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </Button>
          <div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
                <Button onClick={handleSaveName} size="sm">
                  Guardar
                </Button>
                <Button variant="ghost" onClick={handleCancelEdit} size="sm">
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Folder className="h-6 w-6" />
                  {folder.name}
                </h2>
                <Button variant="outline" size="icon" onClick={handleEditClick}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Transcripciones</CardTitle>
                <CardDescription>Todas las transcripciones en esta carpeta.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {folderRecordings.length === 0 ? (
                  <p className="text-muted-foreground">No hay transcripciones en esta carpeta.</p>
                ) : (
                  <div className="space-y-2">
                    {folderRecordings.map((recording) => (
                      <RecordingItem key={recording.id} recording={recording} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <UpcomingEvents folderId={folderId} showHeader={true} limit={5} />
          </div>
        </div>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar carpeta</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de que quieres eliminar esta carpeta? Todas las transcripciones dentro de esta carpeta se moverán a la carpeta general.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteFolder} className="bg-red-500 hover:bg-red-600">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
