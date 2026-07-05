import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, Lock, User, AlertCircle } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Conexión al endpoint que acabamos de crear en el index.js
      const response = await axios.post('https://logwork-backend.onrender.com/api/login', loginData);

      if (response.data.success) {
        // Guardamos el objeto usuario en el storage para persistencia
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Redirección según el ROL
        if (response.data.success) {
  localStorage.setItem('user', JSON.stringify(response.data.user));
  
  // 🔄 Validación exacta con los roles de la Base de Datos
  if (response.data.user.role === 'admin') {
    navigate('/admin');
  } else if (response.data.user.role === 'operator') { // 👈 Usamos el término de la DB
    navigate('/operator'); // 👈 Te redirige a tu pantalla en español perfectamente
  } else {
    setError('El rol asignado no es válido para este sistema industrial');
  }
}
      }
    } catch (err) {
      // Manejo de errores (Credenciales incorrectas o servidor caído)
      if (err.response) {
        setError(err.response.data.message || 'Error en el inicio de sesión');
      } else {
        setError('No hay conexión con el servidor industrial');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="card-industrial">
        {/* LOGO / CABECERA */}
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <div style={{ 
            display: 'inline-flex', 
            padding: '12px', 
            backgroundColor: '#000', 
            borderRadius: '50%', 
            marginBottom: '15px',
            border: '2px solid #eab308' 
          }}>
            <ShieldCheck size={40} color="#eab308" />
          </div>
          <h1 style={{ margin: 0, fontSize: '28px', letterSpacing: '-1px', fontStyle: 'italic' }}>
            LOGWORK <span style={{ color: '#eab308' }}>PRO</span>
          </h1>
          <p style={{ color: '#64748b', fontSize: '10px', fontWeight: 'bold', marginTop: '5px', textTransform: 'uppercase' }}>
            Acceso Restringido - Personal Autorizado
          </p>
        </div>

        {/* MENSAJE DE ERROR */}
        {error && (
          <div style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid #ef4444', 
            color: '#ef4444', 
            padding: '12px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          {/* CAMPO USUARIO */}
          <div style={{ marginBottom: '20px' }}>
            <label className="label-industrial">
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <User size={12} /> ID OPERADOR / DNI
              </div>
            </label>
            <input 
              type="text" 
              required
              placeholder="Ej: 12345678"
              className="input-industrial"
              onChange={(e) => setLoginData({...loginData, username: e.target.value})} 
            />
          </div>

          {/* CAMPO CONTRASEÑA */}
          <div style={{ marginBottom: '30px' }}>
            <label className="label-industrial">
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Lock size={12} /> CLAVE DE SEGURIDAD
              </div>
            </label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              className="input-industrial"
              onChange={(e) => setLoginData({...loginData, password: e.target.value})} 
            />
          </div>

          {/* BOTÓN DE ACCESO */}
          <button 
            type="submit" 
            className="btn-industrial" 
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'AUTENTICANDO...' : 'INICIAR SISTEMA'}
          </button>
        </form>

        <p style={{ 
          textAlign: 'center', 
          color: '#334155', 
          fontSize: '11px', 
          marginTop: '30px',
          fontWeight: 'bold' 
        }}>
          SISTEMA DE GESTIÓN DE ACTIVOS v2.2
        </p>
      </div>
    </div>
  );
};

export default LoginPage;