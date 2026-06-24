import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import VendedorPage from "./pages/VendedorPage";
import InspectorPage from "./pages/InspectorPage";
import ClientePage from "./pages/ClientePage";
import Navbar from "./components/Navbar";

function AppContent() {
  const { usuario } = useAuth();

  if (!usuario) return <LoginPage />;

  const page = {
    vendedor: <VendedorPage />,
    inspector: <InspectorPage />,
    cliente: <ClientePage />,
  }[usuario.rol] ?? <p>Rol desconocido: {usuario.rol}</p>;

  return (
    <>
      <Navbar />
      {page}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
