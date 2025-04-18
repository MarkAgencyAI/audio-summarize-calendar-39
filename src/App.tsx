import React, { Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { RecordingsProvider } from "./context/RecordingsContext";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CalendarPage from "./pages/CalendarPage";
import Estadisticas from "./pages/Estadisticas";
import Account from "./pages/Account";
import PrivateRoute from "./components/PrivateRoute";
import PublicRoute from "./components/PublicRoute";
import WebhookResponsePage from "./pages/WebhookResponsePage";
import WeeklySchedulePage from "./pages/WeeklySchedulePage";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: "/login",
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: "/register",
    element: (
      <PublicRoute>
        <Register />
      </PublicRoute>
    ),
  },
  {
    path: "/dashboard",
    element: (
      <PrivateRoute>
        <Dashboard />
      </PrivateRoute>
    ),
  },
  {
    path: "/calendar",
    element: (
      <PrivateRoute>
        <CalendarPage />
      </PrivateRoute>
    ),
  },
  {
    path: "/estadisticas",
    element: (
      <PrivateRoute>
        <Estadisticas />
      </PrivateRoute>
    ),
  },
  {
    path: "/account",
    element: (
      <PrivateRoute>
        <Account />
      </PrivateRoute>
    ),
  },
  {
    path: "/webhook-response",
    element: <WebhookResponsePage />,
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
