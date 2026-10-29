const API_BASE = '/api';
const SESION_KEY = 'defiderSesion';

function obtenerSesion() {
  try {
    return JSON.parse(localStorage.getItem(SESION_KEY) || 'null');
  } catch (error) {
    return null;
  }
}

function guardarSesion(sesion) {
  localStorage.setItem(SESION_KEY, JSON.stringify(sesion));
}

function cerrarSesion() {
  localStorage.removeItem(SESION_KEY);
  localStorage.removeItem('seleccionDisponibilidad');
}

function requerirSesion() {
  if (!obtenerSesion()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

async function apiFetch(ruta, opciones = {}) {
  const sesion = obtenerSesion();
  const headers = {
    'Content-Type': 'application/json',
    ...(opciones.headers || {})
  };

  if (sesion && sesion.usuarioId) {
    headers['X-Usuario-Id'] = sesion.usuarioId;
  }

  const respuesta = await fetch(`${API_BASE}${ruta}`, {
    ...opciones,
    headers
  });

  let datos = null;

  try {
    datos = await respuesta.json();
  } catch (error) {
    datos = null;
  }

  if (!respuesta.ok) {
    const mensaje = datos && datos.mensaje ? datos.mensaje : 'No se pudo completar la operación.';
    throw new Error(mensaje);
  }

  return datos;
}

function fechaLocalISO() {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function actualizarNavbarUsuario() {
  const sesion = obtenerSesion();
  if (!sesion) return;

  const nombre = document.getElementById('nombreUsuarioNav');
  const rol = document.getElementById('rolUsuarioNav');

  if (nombre) nombre.textContent = sesion.nombre;
  if (rol) rol.textContent = sesion.rol.charAt(0).toUpperCase() + sesion.rol.slice(1);
}
