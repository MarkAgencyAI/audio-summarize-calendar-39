
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { FolderSystem } from "@/components/FolderSystem";
import { useAuth } from "@/context/AuthContext";
import { useRecordings } from "@/context/RecordingsContext";
import { Button } from "@/components/ui/button";
import { Loader, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function FoldersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshData, isLoading, folders } = useRecordings();
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  
  // Redirigir al login si no está autenticado
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);
  
  // Cargar datos frescos cuando se monta el componente
  useEffect(() => {
    console.log("FoldersPage montado - actualizando datos");
    const loadData = async () => {
      try {
        await refreshData();
        console.log("Datos actualizados para página de materias");
      } catch (error) {
        console.error("Error al actualizar datos:", error);
        toast.error("Error al cargar los datos más recientes");
        // Si hay un error, incrementar contador de intentos
        setRefreshAttempts(prev => prev + 1);
      }
    };
    
    loadData();
  }, []);
  
  // Si después de varios intentos no hay carpetas, mostrar alerta
  const hasFolders = folders && folders.length > 0;
  const showEmptyAlert = !isLoading && !hasFolders && refreshAttempts >= 2;
  
  const handleManualRefresh = async () => {
    try {
      await refreshData();
      toast.success("Datos actualizados correctamente");
    } catch (error) {
      console.error("Error al actualizar datos:", error);
      toast.error("Error al actualizar los datos");
      setRefreshAttempts(prev => prev + 1);
    }
  };
  
  return (
    <Layout>
      <div className="space-y-4 md:space-y-8 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Materias</h1>
          
          <Button 
            variant="outline" 
            onClick={handleManualRefresh}
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>{isLoading ? 'Actualizando...' : 'Actualizar datos'}</span>
          </Button>
        </div>
        
        {showEmptyAlert && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error al cargar materias</AlertTitle>
            <AlertDescription>
              No se pudieron cargar las materias desde la base de datos. Intenta actualizar de nuevo o vuelve más tarde.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="glassmorphism rounded-xl p-3 md:p-6 shadow-lg w-full">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <FolderSystem />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
