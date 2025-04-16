import React, { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { RecordingItem } from "@/components/RecordingItem";
import { useRecordings } from "@/context/RecordingsContext";
import { FolderItem } from "@/components/FolderItem";
import { Button } from "@/components/ui/button";
import { Plus, UploadCloud } from "lucide-react";
import { CreateFolderDialog } from "@/components/CreateFolderDialog";
import { NotesSection } from "@/components/NotesSection";
import { GradesSection } from "@/components/GradesSection";
import { UpcomingEvents } from "@/components/UpcomingEvents";

export default function Dashboard() {
  const { recordings, folders, refreshData, isLoading } = useRecordings();
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await refreshData();
      } catch (error) {
        console.error("Error refreshing data:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="md:flex gap-4">
          <div className="md:w-1/3">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                  Carpetas
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateFolderDialog(true)}
                  className="flex items-center gap-2 border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800/70"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nueva</span>
                </Button>
              </div>
              <div>
                {isLoading ? (
                  <p className="text-center text-slate-500 dark:text-slate-400">
                    Cargando carpetas...
                  </p>
                ) : folders.length === 0 ? (
                  <p className="text-center text-slate-500 dark:text-slate-400">
                    No hay carpetas creadas
                  </p>
                ) : (
                  <div className="space-y-2">
                    {folders.map((folder) => (
                      <FolderItem key={folder.id} folder={folder} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-4">
              <UpcomingEvents showHeader={true} limit={5} />
            </div>

            <NotesSection sectionTitle="Apuntes rápidos" />

            <GradesSection sectionTitle="Calificaciones recientes" />
          </div>

          <div className="md:w-2/3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                Grabaciones recientes
              </h2>
              <Button
                variant="default"
                className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
              >
                <UploadCloud className="h-4 w-4" />
                Subir
              </Button>
            </div>
            <div>
              {isLoading ? (
                <p className="text-center text-slate-500 dark:text-slate-400">
                  Cargando grabaciones...
                </p>
              ) : recordings.length === 0 ? (
                <p className="text-center text-slate-500 dark:text-slate-400">
                  No hay grabaciones
                </p>
              ) : (
                <div className="space-y-3">
                  {recordings.map((recording) => (
                    <RecordingItem key={recording.id} recording={recording} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <CreateFolderDialog
        open={showCreateFolderDialog}
        onOpenChange={setShowCreateFolderDialog}
      />
    </Layout>
  );
}
