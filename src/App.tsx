
import React, { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { RecordingsProvider, useRecordings } from "@/context/RecordingsContext";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CalendarPage from "./pages/CalendarPage";
import FoldersPage from "./pages/FoldersPage";
import FolderDetailsPage from "./pages/FolderDetailsPage";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";
import RecordingDetailsPage from "./pages/RecordingDetailsPage";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Componente para manejar la actualización de datos al cambiar de ruta
function AppRoutes() {
  const location = useLocation();
  const { refreshData } = useRecordings();
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Actualizar datos cuando cambie la ruta
  useEffect(() => {
    console.log(`Cambio de ruta detectado: ${location.pathname} - Actualizando datos`);
    
    // Solo actualizar si han pasado al menos 2 segundos desde la última actualización
    // para evitar múltiples actualizaciones durante navegaciones rápidas
    const now = Date.now();
    if (now - lastRefresh > 2000) {
      refreshData().catch(error => {
        console.error("Error al actualizar datos en cambio de ruta:", error);
      });
      setLastRefresh(now);
    }
  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/folders" element={<FoldersPage />} />
      <Route path="/folder/:folderId" element={<FolderDetailsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/recordings/:recordingId" element={<RecordingDetailsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  // Set the app name in the document title
  document.title = "CALI - Asistente de clases";

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RecordingsProvider>
          <TooltipProvider>
            <div className="relative min-h-screen max-w-full overflow-x-hidden">
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </div>
          </TooltipProvider>
        </RecordingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
