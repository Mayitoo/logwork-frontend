import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import OperatorDashboard from './pages/OperatorDashboard';

function App() {
  // Función para proteger rutas corregida y tolerante a strings
  const ProtectedRoute = ({ children, roleRequired }) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return <Navigate to="/login" />;

    // Forzamos minúsculas para evitar que 'Operator' u 'operator' rompan el sistema
    const userRole = user.role ? user.role.toLowerCase() : '';
    const required = roleRequired.toLowerCase();

    if (roleRequired && userRole !== required) return <Navigate to="/login" />;
    return children;
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* Ruta Admin: requiere 'admin' */}
        <Route path="/admin" element={
          <ProtectedRoute roleRequired="admin">
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* Ruta Operator: ¡CORREGIDA AQUÍ! Ahora requiere 'operator' para coincidir con tu DB */}
        <Route path="/operator" element={
          <ProtectedRoute roleRequired="operator"> 
            <OperatorDashboard />
          </ProtectedRoute>
        } />

        {/* Si entra a la raíz, redirigir al login */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;