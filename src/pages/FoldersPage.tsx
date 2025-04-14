
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { FolderSystem } from "@/components/FolderSystem";
import { useAuth } from "@/context/AuthContext";
import { useRecordings } from "@/context/RecordingsContext";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";

export default function FoldersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshData, isLoading } = useRecordings();
  
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
      }
    };
    
    loadData();
  }, []);
  
  return (
    <Layout>
      <div className="space-y-4 md:space-y-8 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Materias</h1>
          
          <Button 
            variant="outline" 
            onClick={() => refreshData()}
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <Loader className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Actualizando...' : 'Actualizar datos'}</span>
          </Button>
        </div>
        
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
