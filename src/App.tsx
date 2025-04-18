
import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { RecordingsProvider } from "./context/RecordingsContext";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CalendarPage from "./pages/CalendarPage";
import WeeklySchedulePage from "./pages/WeeklySchedulePage";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";
import RecordingDetailsPage from "./pages/RecordingDetailsPage";
import FoldersPage from "./pages/FoldersPage";
import FolderDetailsPage from "./pages/FolderDetailsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />
  },
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/register",
    element: <Register />
  },
  {
    path: "/dashboard",
    element: <Dashboard />
  },
  {
    path: "/calendar",
    element: <CalendarPage />
  },
  {
    path: "/weekly-schedule",
    element: <WeeklySchedulePage />
  },
  {
    path: "/profile",
    element: <ProfilePage />
  },
  {
    path: "/folders",
    element: <FoldersPage />
  },
  {
    path: "/folder/:folderId",
    element: <FolderDetailsPage />
  },
  {
    path: "/recordings/:recordingId",
    element: <RecordingDetailsPage />
  },
  {
    path: "*",
    element: <NotFound />
  }
]);

function App() {
  return (
    <AuthProvider>
      <RecordingsProvider>
        <RouterProvider router={router} />
      </RecordingsProvider>
    </AuthProvider>
  );
}

export default App;
