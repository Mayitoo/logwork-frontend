import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const useAdminData = (apiUrl) => {
  const [resumenClientes, setResumenClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarResumen = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${apiUrl}/api/admin/clients-summary`);
      // Sanitización básica: Asegurar que los datos numéricos sean tratados como tales
      const datosSeguros = res.data.map(item => ({
        ...item,
        total_hours: Number(item.total_hours) || 0,
        hours_since_maint: Number(item.hours_since_maint) || 0
      }));
      setResumenClientes(datosSeguros);
    } catch (err) {
      console.error("Error de seguridad/conexión al obtener flotas");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    cargarResumen();
  }, [cargarResumen]);

  return { resumenClientes, loading, refrescar: cargarResumen };
};