import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosObj from 'axios'; 

import { 
  LogOut, Users, Activity, ShieldAlert, PlusCircle, 
  Trash2, UserPlus, Edit, Camera, LayoutDashboard
} from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [openUser, setOpenUser] = useState(null); 
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // --- ESTADOS DE MODALES ---
  const [showUserModal, setShowUserModal] = useState(false);
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditMachineModal, setShowEditMachineModal] = useState(false);

  // --- ESTADOS DE DATOS ---
  const [usuarios, setUsuarios] = useState([]);
  const [issues, setIssues] = useState([]);
  const [resumenAgrupado, setResumenAgraviado] = useState({});
  const [metricas, setMetricas] = useState({ totalMaquinas: 0, enCritico: 0, operadoresActivos: 0 });

  // --- ESTADOS DE FORMULARIOS CORREGIDOS A 'operator' ---
  const [newUser, setNewUser] = useState({ username: '', password: '', name: '', role: 'operator' });
  const [newMachine, setNewMachine] = useState({ name: '', operator_id: '', serial_number: '', total_hours: 0 });
  const [editingUser, setEditingUser] = useState({ id: '', name: '', username: '', password: '', role: '' });
  const [editingMachine, setEditingMachine] = useState({ id: '', name: '', operator_id: '', serial_number: '', total_hours: 0 });

  // --- CARGA DE DATOS DESDE EL BACKEND ---
  const fetchData = async () => {
    try {
      // 1. Obtener Operadores / Usuarios
      const resUsers = await axiosObj.get("https://logwork-backend.onrender.com/api/admin/users");
      setUsuarios(resUsers.data || []);

      // 2. Obtener Flota
      const resFlota = await axiosObj.get("https://logwork-backend.onrender.com/api/admin/clients-summary");
      const datosFlota = resFlota.data || [];
      
      // Agrupar máquinas por operador responsable
      const agrupado = datosFlota.reduce((acc, item) => {
        const nombre = item.client_name || "Sin Asignar";
        if (!acc[nombre]) acc[nombre] = [];
        acc[nombre].push(item);
        return acc;
      }, {});
      setResumenAgraviado(agrupado);

      // Calcular Métricas
      const criticas = datosFlota.filter(m => (parseFloat(m.hours_since_maint) || 0) >= 250).length;
      setMetricas({
        totalMaquinas: datosFlota.length,
        enCritico: criticas,
        operadoresActivos: Object.keys(agrupado).filter(name => name !== "Sin Asignar").length
      });

    } catch (err) {
      console.error("Error al sincronizar el panel:", err);
    }
  };

  const fetchIssues = async () => {
    try {
      const res = await axiosObj.get('https://logwork-backend.onrender.com/api/admin/mechanical-issues');
      setIssues(res.data || []);
    } catch (err) {
      console.error("Error al cargar fallas técnicas:", err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchIssues();
  }, [activeTab]);

  // --- CONTROL DE OPERADORES ---
  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      await axiosObj.post("https://logwork-backend.onrender.com/api/admin/users", newUser);
      setShowUserModal(false);
      setNewUser({ username: '', password: '', name: '', role: 'operator' }); // Limpieza con 'operator'
      fetchData();
      alert("Usuario registrado con éxito.");
    } catch (err) { alert("Error al registrar operador"); }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      // Preparamos los datos base obligatorios
      const dataPack = {
        id: editingUser.id,
        name: editingUser.name,
        username: editingUser.username,
        role: editingUser.role // Envía 'operator' o 'admin'
      };

      // SOLO envía la contraseña si escribiste algo en el campo, evitando borrar la existente
      if (editingUser.password && editingUser.password.trim() !== "") {
        dataPack.password = editingUser.password;
      }

      await axiosObj.post("https://logwork-backend.onrender.com/api/admin/users/update", dataPack);
      setShowEditModal(false);
      fetchData();
      alert("Datos de usuario actualizados correctamente.");
    } catch (err) { alert("Error al actualizar datos del usuario"); }
  };

  const deleteUser = async (id) => {
    if (window.confirm("¿Seguro que deseas dar de baja a este usuario?")) {
      try {
        await axiosObj.delete(`https://logwork-backend.onrender.com/api/admin/users/${id}`);
        fetchData();
      } catch (err) { alert("Error al eliminar"); }
    }
  };

  // --- CONTROL DE MAQUINARIA ---
  const handleSaveMachine = async (e) => {
    e.preventDefault();
    try {
      const dataPack = {
        name: newMachine.name,
        client_id: newMachine.operator_id,
        serial_number: newMachine.serial_number
      };
      await axiosObj.post("https://logwork-backend.onrender.com/api/admin/machines", dataPack);
      setShowMachineModal(false);
      setNewMachine({ name: '', operator_id: '', serial_number: '', total_hours: 0 });
      fetchData();
    } catch (err) { 
      alert("Error al registrar máquina en el servidor. Revisa los campos."); 
    }
  };

  const handleUpdateMachine = async (e) => {
    e.preventDefault();
    try {
      const dataPack = {
        id: editingMachine.id,
        name: editingMachine.name,
        client_id: editingMachine.operator_id,
        serial_number: editingMachine.serial_number,
        total_hours: editingMachine.total_hours
      };
      await axiosObj.put(`https://logwork-backend.onrender.com/api/admin/machines/${editingMachine.id}`, dataPack);
      setShowEditMachineModal(false);
      fetchData();
    } catch (err) { alert("Error al reasignar unidad"); }
  };

  const deleteMachine = async (id) => {
    if (window.confirm("¿Deseas eliminar permanentemente esta unidad de la flota?")) {
      try {
        await axiosObj.delete(`https://logwork-backend.onrender.com/api/admin/machines/${id}`);
        fetchData();
      } catch (err) { alert("Error al borrar unidad"); }
    }
  };

  const resetMaintenance = async (id) => {
    if (window.confirm("¿Confirmas que se realizó el mantenimiento físico? El contador volverá a 0 horas.")) {
      try {
        await axiosObj.put(`https://logwork-backend.onrender.com/api/admin/reset-maint/${id}`);
        fetchData();
      } catch (err) { alert("Error al resetear mantenimiento"); }
    }
  };

  const handleResolveIssue = async (id) => {
    if (window.confirm("¿Marcar reporte técnico como Solucionado?")) {
      try {
        await axiosObj.put(`https://logwork-backend.onrender.com/api/admin/resolve-issue/${id}`);
        fetchIssues();
      } catch (err) { alert("Error al resolver falla"); }
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', fontFamily: 'sans-serif' }}>
      
      {/* 🧭 SIDEBAR IZQUIERDO */}
      <aside style={{ width: '260px', backgroundColor: '#1e293b', borderRight: '2px solid #334155', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px' }}>
        <div>
          <div style={{ marginBottom: '40px', paddingBottom: '15px', borderBottom: '2px solid #eab308' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontStyle: 'italic', letterSpacing: '1px' }}>LOGWORK <span style={{ color: '#eab308' }}>ADMIN</span></h1>
            <small style={{ color: '#64748b', fontSize: '9px', fontWeight: 'bold', display: 'block', marginTop: '4px' }}>SISTEMA DE CONTROL CENTRAL</small>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              onClick={() => setActiveTab('dashboard')} 
              style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 15px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', textAlign: 'left', transition: 'all 0.2s',
                backgroundColor: activeTab === 'dashboard' ? '#eab308' : 'transparent', color: activeTab === 'dashboard' ? '#000' : '#94a3b8' }}
            >
              <LayoutDashboard size={18} /> PANEL GENERAL
            </button>
            <button 
              onClick={() => setActiveTab('flota')} 
              style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 15px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', textAlign: 'left', transition: 'all 0.2s',
                backgroundColor: activeTab === 'flota' ? '#eab308' : 'transparent', color: activeTab === 'flota' ? '#000' : '#94a3b8' }}
            >
              <Activity size={18} /> ESTADO DE FLOTA
            </button>
            <button 
              onClick={() => setActiveTab('usuarios')} 
              style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 15px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', textAlign: 'left', transition: 'all 0.2s',
                backgroundColor: activeTab === 'usuarios' ? '#eab308' : 'transparent', color: activeTab === 'usuarios' ? '#000' : '#94a3b8' }}
            >
              <Users size={18} /> OPERADORES / ROLES
            </button>
          </nav>
        </div>

        <button 
          onClick={() => { localStorage.clear(); navigate('/login'); }} 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', height: '45px', backgroundColor: '#7f1d1d', color: '#fca5a5', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
        >
          <LogOut size={16} /> CERRAR SESIÓN
        </button>
      </aside>

      {/* ⚙️ ÁREA PRINCIPAL */}
      <main style={{ flex: 1, padding: '30px', overflowY: 'auto', maxHeight: '100vh' }}>
        
        {/* PESTAÑA: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={{ fontSize: '24px', margin: '0 0 25px 0' }}>PANEL GENERAL MÉTRICAS</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #3b82f6' }}>
                <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Maquinaria</span>
                <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '5px' }}>{metricas.totalMaquinas}</div>
              </div>
              <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #ef4444' }}>
                <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Unidades Alerta (+250h)</span>
                <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '5px', color: metricas.enCritico > 0 ? '#ef4444' : '#fff' }}>{metricas.enCritico}</div>
              </div>
              <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #eab308' }}>
                <span style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Operadores Activos</span>
                <div style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '5px' }}>{metricas.operadoresActivos}</div>
              </div>
            </div>

            {issues.length > 0 ? (
              <div style={{ border: '2px solid #ef4444', borderRadius: '12px', padding: '20px', background: 'rgba(239, 68, 68, 0.08)' }}>
                <h3 style={{ color: '#ef4444', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px' }}>
                  ⚠️ INCIDENCIAS TÉCNICAS ACTIVAS ({issues.length})
                </h3>
                <div style={{ display: 'grid', gap: '15px' }}>
                  {issues.map(issue => (
                    <div key={issue.id} style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `5px solid ${issue.severity === 'critica' ? '#ef4444' : '#eab308'}` }}>
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#eab308', display: 'block' }}>{issue.machine_name.toUpperCase()}</span>
                        <p style={{ margin: '5px 0', color: '#cbd5e1', fontSize: '14px' }}>"{issue.description}"</p>
                        <small style={{ color: '#64748b' }}>Reportado por: {issue.operator_name} | Prioridad: <b>{issue.severity.toUpperCase()}</b></small>
                      </div>
                      <button 
                        onClick={() => handleResolveIssue(issue.id)}
                        style={{ backgroundColor: '#22c55e', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                      >
                        MARCAR SOLUCIONADO
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', textAlign: 'center', border: '1px dashed #334155' }}>
                <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>✅ No se registran fallas mecánicas pendientes.</p>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA: FLOTA */}
        {activeTab === 'flota' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h2 style={{ fontSize: '24px', margin: 0 }}>UNIDADES E INFRAESTRUCTURA</h2>
              <button onClick={() => setShowMachineModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#eab308', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                <PlusCircle size={16} /> REGISTRAR MÁQUINA
              </button>
            </div>

            {Object.keys(resumenAgrupado).length > 0 ? (
              Object.entries(resumenAgrupado).map(([operador, maquinas]) => {
                const opId = maquinas[0]?.client_id || 'unassigned';
                const isOpen = openUser === opId;

                return (
                  <div key={operador} style={{ marginBottom: '15px', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
                    <div 
                      onClick={() => setOpenUser(isOpen ? null : opId)}
                      style={{ background: isOpen ? '#eab308' : '#1e293b', padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ background: isOpen ? '#000' : '#eab308', color: isOpen ? '#fff' : '#000', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                          {operador.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, color: isOpen ? '#000' : '#fff', fontSize: '16px' }}>{operador.toUpperCase()}</h4>
                          <span style={{ fontSize: '11px', color: isOpen ? 'rgba(0,0,0,0.6)' : '#64748b' }}>{maquinas.length} activo(s) asignados</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: isOpen ? '#000' : '#eab308' }}>{isOpen ? '▲ OCULTAR' : '▼ VER MÁQUINAS'}</span>
                    </div>

                    {isOpen && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', padding: '20px', backgroundColor: '#0f172a' }}>
                        {maquinas.map(m => {
                          const isCritical = (parseFloat(m.hours_since_maint) || 0) >= 250;
                          return (
                            <div key={m.machine_id} style={{ backgroundColor: isCritical ? '#450a0a' : '#1e293b', border: isCritical ? '2px solid #ef4444' : '1px solid #334155', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '15px' }}>
                              
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                  <div>
                                    <h4 style={{ margin: 0, color: isCritical ? '#fca5a5' : '#eab308', fontSize: '16px' }}>{m.machine_name}</h4>
                                    <small style={{ color: '#64748b', fontSize: '10px', display: 'block', marginTop: '2px' }}>S/N: {m.serial_number || 'N/A'}</small>
                                  </div>
                                  {isCritical && <ShieldAlert size={18} color="#ef4444" />}
                                </div>
                                
                                <div style={{ background: '#000', padding: '10px', borderRadius: '8px', margin: '12px 0', textAlign: 'center' }}>
                                  <span style={{ color: '#64748b', fontSize: '10px', display: 'block', textTransform: 'uppercase' }}>Horas Totales</span>
                                  <b style={{ fontSize: '22px', color: '#fff' }}>{m.total_hours} hrs</b>
                                </div>

                                {/* 📸 EVICENCIAS FOTOGRÁFICAS */}
                                {(m.photo1 || m.photo2 || m.photo3) ? (
                                  <div style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px solid #334155' }}>
                                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                                      <Camera size={12} color="#eab308" /> CAPTURAS RECIENTES DE CAMPO
                                    </span>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                                      {[m.photo1, m.photo2, m.photo3].map((imgUrl, idx) => imgUrl && (
                                        <div 
                                          key={idx} 
                                          onClick={() => setSelectedPhoto(imgUrl)}
                                          style={{ height: '55px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #475569', cursor: 'pointer', background: '#000' }}
                                        >
                                          <img src={imgUrl} alt="Evidencia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ border: '1px dashed #334155', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                                    <small style={{ color: '#475569', fontSize: '10px' }}>Sin evidencia fotográfica cargada</small>
                                  </div>
                                )}
                              </div>

                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>
                                  <span>Uso ciclo: <b style={{ color: isCritical ? '#ef4444' : '#fff' }}>{m.hours_since_maint}h</b></span>
                                  <span>Límite: 250h</span>
                                </div>

                                <button 
                                  onClick={() => resetMaintenance(m.machine_id)}
                                  style={{ width: '100%', height: '36px', backgroundColor: isCritical ? '#22c55e' : '#334155', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px', marginBottom: '8px' }}
                                >
                                  RESETEAR CICLO (MANTENIMIENTO)
                                </button>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button 
                                    onClick={() => { 
                                      setEditingMachine({ 
                                        id: m.machine_id, 
                                        name: m.machine_name, 
                                        operator_id: m.client_id || '', 
                                        serial_number: m.serial_number || '', 
                                        total_hours: m.total_hours 
                                      }); 
                                      setShowEditMachineModal(true); 
                                    }}
                                    style={{ flex: 1, height: '32px', backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}
                                  >
                                    ⚙️ REASIGNAR
                                  </button>
                                  <button 
                                    onClick={() => deleteMachine(m.machine_id)}
                                    style={{ width: '35px', height: '32px', backgroundColor: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                  >
                                    🗑
                                  </button>
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p style={{ color: '#64748b' }}>No hay maquinaria distribuida en el sistema.</p>
            )}
          </div>
        )}

        {/* PESTAÑA: OPERADORES */}
        {activeTab === 'usuarios' && (
          <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', margin: 0 }}>DIRECTORIO DE OPERADORES Y ADMINISTRADORES</h3>
              <button onClick={() => setShowUserModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#eab308', color: '#000', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                <UserPlus size={16} /> ALTA DE USUARIO / ROL
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ color: '#64748b', borderBottom: '2px solid #334155', fontSize: '13px' }}>
                  <th style={{ padding: '12px' }}>NOMBRE COMPLETO</th>
                  <th>USUARIO (DNI)</th>
                  <th>ROL ASIGNADO</th>
                  <th style={{ textAlign: 'right', paddingRight: '15px' }}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #334155', fontSize: '14px' }}>
                    <td style={{ padding: '14px 12px', fontWeight: 'bold' }}>{u.name}</td>
                    <td style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{u.username}</td>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                        backgroundColor: u.role === 'admin' ? '#7f1d1d' : '#1e293b', 
                        color: u.role === 'admin' ? '#fca5a5' : '#eab308',
                        border: u.role === 'admin' ? '1px solid #ef4444' : '1px solid #eab308'
                      }}>
                        {u.role === 'admin' ? 'ADMIN' : 'OPERATOR'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '15px' }}>
                      <button 
                        onClick={() => { 
                          setEditingUser({ id: u.id, name: u.name, username: u.username, role: u.role || 'operator', password: '' }); 
                          setShowEditModal(true); 
                        }} 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '15px' }}
                      >
                        <Edit size={16} color="#eab308" />
                      </button>
                      <button onClick={() => deleteUser(u.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Trash2 size={16} color="#ef4444" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>

      {/* 🖼️ LIGHTBOX DE EVEDENCIA */}
      {selectedPhoto && (
        <div onClick={() => setSelectedPhoto(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, cursor: 'zoom-out', padding: '20px' }}>
          <img src={selectedPhoto} alt="Evidencia Ampliada" style={{ maxWidth: '90%', maxHeight: '85vh', borderRadius: '8px', border: '2px solid #eab308', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }} />
          <button style={{ position: 'absolute', top: '20px', right: '20px', backgroundColor: '#ef4444', color: '#fff', border: 'none', width: '40px', height: '40px', borderRadius: '50%', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Modal: Alta de Usuario */}
      {showUserModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', width: '360px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#fff' }}>REGISTRAR NUEVO USUARIO</h3>
            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} placeholder="Nombre Completo" onChange={e => setNewUser({...newUser, name: e.target.value})} required />
              <input style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} placeholder="DNI / Nombre de Usuario" onChange={e => setNewUser({...newUser, username: e.target.value})} required />
              <input type="password" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} placeholder="Contraseña de Acceso" onChange={e => setNewUser({...newUser, password: e.target.value})} required />
              
              <label style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '-10px' }}>ROL EN BASE DE DATOS</label>
              <select style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} required>
                <option value="operator">Operador de campo (operator)</option>
                <option value="admin">Administrador Central (admin)</option>
              </select>

              <button type="submit" style={{ padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#eab308', fontWeight: 'bold', cursor: 'pointer', color: '#000' }}>CREAR CUENTA</button>
              <button type="button" onClick={() => setShowUserModal(false)} style={{ padding: '10px', borderRadius: '6px', border: 'none', backgroundColor: '#475569', color: '#fff', cursor: 'pointer' }}>CANCELAR</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Perfil / Contraseña y Rol */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', width: '360px', border: '2px solid #eab308' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#fff' }}>MODIFICAR PERFIL & CREDENCIALES</h3>
            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <label style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '-10px' }}>NOMBRE</label>
              <input style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} required />
              
              <label style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '-10px' }}>USUARIO (DNI)</label>
              <input style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} value={editingUser.username} onChange={e => setEditingUser({...editingUser, username: e.target.value})} required />
              
              <label style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '-10px' }}>NUEVA CONTRASEÑA (DEJAR EN BLANCO PARA NO CAMBIAR)</label>
              <input type="password" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} placeholder="Escribe aquí para cambiarla..." value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})} />
              
              <label style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '-10px' }}>ROL EN BASE DE DATOS</label>
              <select style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})} required>
                <option value="operator">Operador de campo (operator)</option>
                <option value="admin">Administrador Central (admin)</option>
              </select>

              <button type="submit" style={{ padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#eab308', fontWeight: 'bold', cursor: 'pointer', color: '#000' }}>GUARDAR CAMBIOS</button>
              <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '10px', borderRadius: '6px', border: 'none', backgroundColor: '#475569', color: '#fff', cursor: 'pointer' }}>CANCELAR</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nueva Máquina */}
      {showMachineModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', width: '360px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#fff' }}>NUEVO ACTIVO DE FLOTA</h3>
            <form onSubmit={handleSaveMachine} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <label style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '-10px' }}>NOMBRE DE MÁQUINA</label>
              <input style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} placeholder="Ej: Excavadora CAT 320D" onChange={e => setNewMachine({...newMachine, name: e.target.value})} required />
              
              <label style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '-10px' }}>NÚMERO DE SERIE (ÚNICO)</label>
              <input style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} placeholder="Ej: SN-CAT98321X" onChange={e => setNewMachine({...newMachine, serial_number: e.target.value})} required />
              
              <label style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '-10px' }}>ASIGNAR RESPONSABLE</label>
              <select style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} value={newMachine.operator_id} onChange={e => setNewMachine({...newMachine, operator_id: e.target.value})} required>
                <option value="">Asignar Operador Responsable...</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <button type="submit" style={{ padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#eab308', fontWeight: 'bold', cursor: 'pointer', color: '#000' }}>DAR DE ALTA</button>
              <button type="button" onClick={() => setShowMachineModal(false)} style={{ padding: '10px', borderRadius: '6px', border: 'none', backgroundColor: '#475569', color: '#fff', cursor: 'pointer' }}>CANCELAR</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar/Reasignar Máquina */}
      {showEditMachineModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', width: '360px', border: '2px solid #eab308' }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#fff' }}>REASIGNACIÓN DE ACTIVO</h3>
            <form onSubmit={handleUpdateMachine} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <label style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '-10px' }}>NOMBRE</label>
              <input style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} value={editingMachine.name} onChange={e => setEditingMachine({...editingMachine, name: e.target.value})} required />
              
              <label style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '-10px' }}>NÚMERO DE SERIE</label>
              <input style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} value={editingMachine.serial_number} onChange={e => setEditingMachine({...editingMachine, serial_number: e.target.value})} required />
              
              <label style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '-10px' }}>HORAS TOTALES</label>
              <input type="number" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} value={editingMachine.total_hours} onChange={e => setEditingMachine({...editingMachine, total_hours: e.target.value})} required />

              <label style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '-10px' }}>NUEVO ENCARGADO</label>
              <select style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }} value={editingMachine.operator_id} onChange={e => setEditingMachine({...editingMachine, operator_id: e.target.value})} required>
                <option value="">Seleccionar Operador...</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <button type="submit" style={{ padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#eab308', fontWeight: 'bold', cursor: 'pointer', color: '#000' }}>ACTUALIZAR ACTIVO</button>
              <button type="button" onClick={() => setShowEditMachineModal(false)} style={{ padding: '10px', borderRadius: '6px', border: 'none', backgroundColor: '#475569', color: '#fff', cursor: 'pointer' }}>CANCELAR</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;