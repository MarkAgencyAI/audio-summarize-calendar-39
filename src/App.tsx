
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { RecordingsProvider } from "@/context/RecordingsContext";

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
              </BrowserRouter>
            </div>
          </TooltipProvider>
        </RecordingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
