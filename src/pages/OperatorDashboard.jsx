import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosObj from 'axios'; 
import { Fuel, Wrench, FileText, CheckCircle, Clock, LogOut, Camera, Gauge } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3001'; 

const OperatorDashboard = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({});
  
  // 🔄 Modificado: Inicializa el estado cargando lo que ya esté guardado en LocalStorage
  const [savedPerformances, setSavedPerformances] = useState(() => {
    const saved = localStorage.getItem('operator_performances');
    return saved ? JSON.parse(saved) : {};
  });

  const user = JSON.parse(localStorage.getItem('user')) || { id: 1, name: 'Operador' };

  useEffect(() => {
    fetchMyMachines();
  }, []);

  const fetchMyMachines = async () => {
    try {
      setLoading(true);
      const response = await axiosObj.get(`${API_BASE_URL}/api/operator/machines/${user.id}`);
      if (Array.isArray(response.data)) {
        setMachines(response.data);
        
        // --- DETECTOR DE MANTENIMIENTO AL CARGAR LA PÁGINA ---
        response.data.forEach(machine => {
          const totalHours = parseFloat(machine.total_hours) || 0;
          const lastMaint = parseFloat(machine.last_maintenance) || 0;
          const hoursSinceLast = totalHours - lastMaint;

          if (hoursSinceLast >= 250) {
            const currentMaintType = calculateNextMaintenance(machine).type;
            alert(`🚨 ATENCIÓN OPERADOR:\nLa unidad "${machine.machine_name}" requiere que realices el servicio:\n👉 ${currentMaintType}\n\nPor favor, registra el turno y añade evidencias fotográficas.`);
          }
        });

      } else {
        setMachines([]);
        setError('No se recibió una lista de máquinas válida.');
      }
      setError('');
    } catch (err) {
      console.error(err);
      setError('Error al conectar con el servidor industrial');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('¿Desea cerrar sesión?')) {
      // ⚠️ Mantenemos el historial de rendimientos aunque cierre sesión si así lo deseas,
      // o puedes descomentar la siguiente línea si quieres borrarlos al salir:
      // localStorage.removeItem('operator_performances');
      localStorage.removeItem('user');
      window.location.href = '/'; 
    }
  };

  const calculateNextMaintenance = (machine) => {
    const totalHours = parseFloat(machine.total_hours) || 0;
    const lastMaint = parseFloat(machine.last_maintenance) || 0;
    const hoursSinceLast = totalHours - lastMaint;

    let nextTarget = 250;
    let type = '1. Básico Motor';

    if (hoursSinceLast < 250) { 
      nextTarget = 250; 
      type = '1. Básico Motor "250"'; 
    } else if (hoursSinceLast < 500) { 
      nextTarget = 500; 
      type = '2. Completo Motor "500"'; 
    } else if (hoursSinceLast < 750) { 
      nextTarget = 750; 
      type = '1. Básico Motor "250"'; 
    } else if (hoursSinceLast < 1000) { 
      nextTarget = 1000; 
      type = '3. Mantenimiento Intermedio "1000" '; 
    }else if (hoursSinceLast < 2000) { 

      nextTarget = 0; 
      type = '3. Mantenimiento General "2000" '; 
    }else {
      nextTarget = Math.ceil(hoursSinceLast / 250) * 250;
      type = 'Mantenimiento Preventivo Periódico';
       nextTarget = 0;
    }

    const remainingHours = nextTarget - hoursSinceLast;
    return { type, remainingHours, hoursSinceLast };
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = () => resolve(fileReader.result);
      fileReader.onerror = (error) => reject(error);
    });
  };

  const handleFormChange = (cardIndex, field, value) => {
    setFormData(prev => ({ ...prev, [`card-${cardIndex}-${field}`]: value }));
  };

  const handlePhotoChange = async (cardIndex, photoNumber, file) => {
    if (!file) return;
    try {
      const base64 = await convertToBase64(file);
      setFormData(prev => ({
        ...prev,
        [`card-${cardIndex}-photo${photoNumber}`]: base64,
        [`card-${cardIndex}-photoName${photoNumber}`]: file.name
      }));
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmitReport = async (e, cardIndex, machineId, currentHours) => {
    e.preventDefault();
    
    const newHoursInput = formData[`card-${cardIndex}-newHours`];
    const fuelInputVal = formData[`card-${cardIndex}-fuelInput`] || 0;
    const failureCommentVal = formData[`card-${cardIndex}-failureComment`] || '';
    
    const newHours = parseFloat(newHoursInput);
    const fuelCharged = parseFloat(fuelInputVal);

    if (!newHours || newHours <= currentHours) {
      alert(`⚠️ El nuevo horómetro debe ser mayor al actual (${currentHours} hrs).`);
      return;
    }

    const hoursWorked = newHours - currentHours;
    const rendimientoTurno = fuelCharged > 0 && hoursWorked > 0 ? (fuelCharged / hoursWorked) : 0;

    try {
      setLoading(true);

      await axiosObj.post(`${API_BASE_URL}/api/operator/report-issue`, {
        machine_id: machineId,
        new_hours: newHours,
        fuel_charged: fuelCharged,
        performance: rendimientoTurno,
        failure_comment: failureCommentVal,
        photo1: formData[`card-${cardIndex}-photo1`] || null,
        photo2: formData[`card-${cardIndex}-photo2`] || null,
        photo3: formData[`card-${cardIndex}-photo3`] || null
      });

      alert(`✅ Sincronización Exitosa con Historial Real.\n\n📊 Rendimiento Calculado: ${rendimientoTurno.toFixed(2)} L/h`);
      
      // 💾 PERSISTENCIA EN LOCALSTORAGE PARA QUE NO SE BORRE AL REFRESCAR
      setSavedPerformances(prev => {
        const nuevosRendimientos = { ...prev, [machineId]: rendimientoTurno };
        localStorage.setItem('operator_performances', JSON.stringify(nuevosRendimientos));
        return nuevosRendimientos;
      });
      
      setFormData(prev => {
        const updated = { ...prev };
        delete updated[`card-${cardIndex}-newHours`];
        delete updated[`card-${cardIndex}-fuelInput`];
        delete updated[`card-${cardIndex}-failureComment`];
        for(let i = 1; i <= 3; i++) {
          delete updated[`card-${cardIndex}-photo${i}`];
          delete updated[`card-${cardIndex}-photoName${i}`];
        }
        return updated;
      });
      
      fetchMyMachines();

    } catch (err) {
      console.error(err);
      alert('❌ Error de sincronización. Revisa los logs de tu consola Node.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '25px', backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc', fontFamily: 'sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #eab308', paddingBottom: '15px', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '900', fontStyle: 'italic' }}>LOGWORK <span style={{ color: '#eab308' }}>PRO</span></h1>
          <p style={{ margin: '5px 0 0 0', color: '#94a3b8', fontSize: '14px', fontWeight: 'bold' }}> OPERADOR: <span style={{ color: '#eab308' }}>{user.name}</span></p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ color: '#22c55e', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}><CheckCircle size={14} /> ONLINE</span>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}><LogOut size={16} /> Salir</button>
        </div>
      </div>

      {error && <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '15px', borderRadius: '8px', marginBottom: '25px' }}>⚠️ {error}</div>}

      {/* ESTADO DE CARGA */}
      {loading && machines.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Cargando asignaciones de flota...</div>
      ) : (
        /* TARJETAS */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
          {machines.map((machine, index) => {
            const maintenance = calculateNextMaintenance(machine);
            const currentHours = machine.total_hours || 0;
            const isCritical = maintenance.hoursSinceLast >= 250;

            const activePanelColor = isCritical ? '#ef4444' : '#bbf7d0'; 
            const boxBgColor = isCritical ? '#450a0a' : '#0f172a';      
            const boxBorderColor = isCritical ? '#ef4444' : '#334155';  

            return (
              <div key={index} style={{ background: '#1e293b', border: `2px solid ${boxBorderColor}`, borderRadius: '12px', overflow: 'hidden' }}>
                
                {/* HEADER DE LA TARJETA */}
                <div style={{ background: '#0f172a', padding: '18px 25px', borderBottom: '2px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '24px', color: '#fff' }}>{machine.machine_name}</h2>
                    <span style={{ fontSize: '12px', color: '#eab308', background: '#334155', padding: '3px 8px', borderRadius: '4px', marginTop: '5px', display: 'inline-block' }}>ID UNIDAD: {machine.machine_id}</span>
                  </div>
                  <div style={{ color: activePanelColor, fontWeight: 'bold', animation: isCritical ? 'pulse 1.5s infinite' : 'none' }}>
                    {isCritical ? '⚠️ MANTENIMIENTO REQUERIDO' : '🟢 PANEL ACTIVO'}
                  </div>
                </div>

                <div style={{ padding: '25px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                  
                  {/* INDICADORES IZQUIERDOS */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    
                    <div style={{ background: boxBgColor, padding: '15px', borderRadius: '8px', border: `1px solid ${boxBorderColor}` }}>
                      <div style={{ color: isCritical ? '#fca5a5' : '#94a3b8', fontSize: '12px', marginBottom: '5px' }}><Clock size={14} style={{display:'inline', marginRight:'4px'}}/> HORÓMETRO ACUMULADO</div>
                      <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{machine.total_hours || 0} <span style={{fontSize:'14px', color: isCritical ? '#f87171' : '#64748b'}}>hrs</span></span>
                    </div>

                    <div style={{ background: boxBgColor, padding: '15px', borderRadius: '8px', border: `1px solid ${boxBorderColor}` }}>
                      <div style={{ color: isCritical ? '#fca5a5' : '#94a3b8', fontSize: '12px', marginBottom: '5px' }}><Fuel size={14} style={{display:'inline', marginRight:'4px'}}/> DIÉSEL TOTAL CONSUMIDO</div>
                      <span style={{ fontSize: '24px', fontWeight: 'bold', color: isCritical ? '#f87171' : '#38bdf8' }}>{machine.total_fuel_consumed || 0} <span style={{fontSize:'14px', color: isCritical ? '#f87171' : '#64748b'}}>Lts</span></span>
                    </div>

                    {/* RENDIMIENTO DEL TURNO (ACTUALIZÁNDOSE EN TIEMPO REAL) */}
                    <div style={{ background: boxBgColor, padding: '15px', borderRadius: '8px', border: isCritical ? '2px solid #ef4444' : '2px solid #eab308', gridColumn: 'span 2' }}>
                      <div style={{ color: isCritical ? '#ef4444' : '#eab308', fontSize: '12px', marginBottom: '5px', fontWeight:'bold' }}><Gauge size={14} style={{display:'inline', marginRight:'4px'}}/> RENDIMIENTO DE COMBUSTIBLE EN EL TURNO ACTUAL</div>
                      <span style={{ fontSize: '26px', fontWeight: 'bold' }}>
                        {
                          formData[`card-${index}-fuelInput`] && formData[`card-${index}-newHours`] && (parseFloat(formData[`card-${index}-newHours`]) - (machine.total_hours || 0)) > 0 ? 
                            (parseFloat(formData[`card-${index}-fuelInput`]) / (parseFloat(formData[`card-${index}-newHours`]) - (machine.total_hours || 0))).toFixed(2)
                          : savedPerformances[machine.machine_id] ? 
                            parseFloat(savedPerformances[machine.machine_id]).toFixed(2)
                          : "0.00"
                        } 
                        <span style={{fontSize:'16px', color: isCritical ? '#fca5a5' : '#94a3b8'}}> Lts / hr</span>
                      </span>
                    </div>

                    {/* RECUADRO DE MANTENIMIENTO */}
                    <div style={{ background: boxBgColor, padding: '15px', borderRadius: '8px', border: isCritical ? '2px solid #ef4444' : '1px solid #334155', gridColumn: 'span 2' }}>
                      <div style={{ color: isCritical ? '#fca5a5' : '#94a3b8', fontSize: '12px' }}><Wrench size={14} style={{display:'inline', marginRight:'4px'}}/> CICLO PREVENTIVO SIGUIENTE</div>
                      <div style={{ color: isCritical ? '#ef4444' : '#eab308', fontWeight: 'bold', marginTop: '4px', fontSize: '16px' }}>
                        {maintenance.type} 
                        {isCritical ? (
                          <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: 'bold' }}> (¡ALERTA: Realizar mantenimiento ya!)</span>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 'normal' }}> (Faltan {maintenance.remainingHours.toFixed(2)} hrs)</span>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* FORMULARIO DERECHO */}
                  <form onSubmit={(e) => handleSubmitReport(e, index, machine.machine_id, currentHours)} style={{ background: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div>
                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', marginBottom: '5px' }}>NUEVO HORÓMETRO</label>
                        <input type="number" step="0.01" required value={formData[`card-${index}-newHours`] || ''} onChange={(e) => handleFormChange(index, 'newHours', e.target.value)} style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#fff' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', color: '#38bdf8', fontSize: '11px', marginBottom: '5px' }}>DIÉSEL REPOSTADO (LTS)</label>
                        <input type="number" step="0.1" value={formData[`card-${index}-fuelInput`] || ''} onChange={(e) => handleFormChange(index, 'fuelInput', e.target.value)} style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #38bdf8', borderRadius: '6px', color: '#fff' }} />
                      </div>
                    </div>

                    <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px' }}>
                      <label style={{ display: 'block', color: '#fca5a5', fontSize: '12px', marginBottom: '5px' }}><FileText size={12} style={{display:'inline', marginRight:'4px'}}/> COMENTARIOS / OBSERVACIONES</label>
                      <textarea rows="2" placeholder="Describa ruidos, fallas, fugas si las hay..." value={formData[`card-${index}-failureComment`] || ''} onChange={(e) => handleFormChange(index, 'failureComment', e.target.value)} style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #475569', borderRadius: '6px', color: '#fff', fontSize: '13px' }} />
                      
                      {/* SECCIÓN DE FOTOS */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '10px' }}>
                        {[1, 2, 3].map(num => {
                          const hasImg = formData[`card-${index}-photo${num}`];
                          return (
                            <label key={num} style={{ 
                              display: 'block', 
                              border: isCritical ? '1px dashed #ef4444' : '1px dashed #475569', 
                              background: hasImg ? '#14532d' : (isCritical ? '#450a0a' : '#0f172a'), 
                              padding: '8px', 
                              borderRadius: '6px', 
                              textAlign: 'center', 
                              cursor: 'pointer' 
                            }}>
                              <Camera size={16} color={hasImg ? '#22c55e' : (isCritical ? '#ef4444' : '#64748b')} style={{ margin: '0 auto' }} />
                              <span style={{ display: 'block', fontSize: '9px', color: isCritical ? '#fca5a5' : '#64748b', marginTop: '2px' }}>Foto {num}</span>
                              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handlePhotoChange(index, num, e.target.files[0])} />
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <button type="submit" style={{ width: '100%', padding: '12px', background: isCritical ? '#ef4444' : '#eab308', border: 'none', borderRadius: '6px', color: isCritical ? '#fff' : '#000', fontWeight: 'bold', cursor: 'pointer' }}>⚡ GUARDAR TURNO Y CALCULAR RENDIMIENTO</button>
                  </form>

                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default OperatorDashboard;