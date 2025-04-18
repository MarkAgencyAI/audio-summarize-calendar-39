
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
