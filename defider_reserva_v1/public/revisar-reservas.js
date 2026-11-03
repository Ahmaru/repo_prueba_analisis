let sesionActual = null;

const NOMBRES_DIAS = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
  7: 'Dom'
};

document.addEventListener('DOMContentLoaded', async () => {
  if (!requerirSesion()) return;

  sesionActual = obtenerSesion();
  actualizarNavbarUsuario();

  const enlaceAgregar = document.getElementById('accionAdmin');
  if (enlaceAgregar) {
    enlaceAgregar.classList.toggle('d-none', sesionActual.rol !== 'administrador');
  }

  const titulo = document.getElementById('tituloReservas');
  if (titulo) {
    titulo.textContent = sesionActual.rol === 'administrador' ? 'Reservas registradas' : 'Mis reservas';
  }

  await cargarReservas();

  if (sesionActual.rol === 'administrador') {
    const seccion = document.getElementById('seccionCalendarizadas');
    if (seccion) seccion.classList.remove('d-none');
    await cargarInscripciones();
  }
});

async function cargarReservas() {
  const cuerpo = document.getElementById('tabla-body');
  if (!cuerpo) return;

  cuerpo.innerHTML = `
    <tr>
      <td colspan="7" class="text-center text-muted py-4">Cargando reservas...</td>
    </tr>
  `;

  try {
    const reservas = await apiFetch('/reservas');
    renderizarReservas(reservas);
  } catch (error) {
    cuerpo.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-danger py-4">${error.message}</td>
      </tr>
    `;
  }
}

function renderizarReservas(reservas) {
  const cuerpo = document.getElementById('tabla-body');
  if (!cuerpo) return;

  if (!Array.isArray(reservas) || reservas.length === 0) {
    cuerpo.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">No hay reservas registradas.</td>
      </tr>
    `;
    return;
  }

  cuerpo.innerHTML = reservas.map((reserva) => {
    const estadoClase = reserva.estado === 'confirmada'
      ? 'bg-success'
      : reserva.estado === 'cancelada'
        ? 'bg-secondary'
        : 'bg-primary';

    const accion = reserva.estado === 'confirmada'
      ? `<button type="button" class="btn-cancelar" onclick="cancelarReserva(${reserva.id})">Cancelar</button>`
      : '<span class="text-muted">Sin acciones</span>';

    return `
      <tr>
        <td>${escaparHtml(reserva.recurso)}</td>
        <td>${reserva.fecha}</td>
        <td>${reserva.bloque}</td>
        <td>${escaparHtml(reserva.uso || '-')}</td>
        <td>${escaparHtml(reserva.sede)}</td>
        <td><span class="badge ${estadoClase}">${reserva.estado}</span></td>
        <td>${accion}</td>
      </tr>
    `;
  }).join('');
}

async function cancelarReserva(id) {
  const confirmar = window.confirm('¿Confirmas la cancelación de esta reserva?');
  if (!confirmar) return;

  try {
    await apiFetch(`/reservas/${id}/cancelar`, { method: 'PUT' });
    await cargarReservas();
  } catch (error) {
    alert(error.message);
  }
}

async function cargarInscripciones() {
  const cuerpo = document.getElementById('tabla-calendarizadas-body');
  if (!cuerpo) return;

  cuerpo.innerHTML = `
    <tr>
      <td colspan="7" class="text-center text-muted py-4">Cargando inscripciones...</td>
    </tr>
  `;

  try {
    const inscripciones = await apiFetch('/inscripciones-calendarizadas');
    renderizarInscripciones(inscripciones);
  } catch (error) {
    cuerpo.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-danger py-4">${error.message}</td>
      </tr>
    `;
  }
}

function renderizarInscripciones(inscripciones) {
  const cuerpo = document.getElementById('tabla-calendarizadas-body');
  if (!cuerpo) return;

  if (!Array.isArray(inscripciones) || inscripciones.length === 0) {
    cuerpo.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">No hay inscripciones calendarizadas registradas.</td>
      </tr>
    `;
    return;
  }

  cuerpo.innerHTML = inscripciones.map((inscripcion) => {
    const dias = Array.isArray(inscripcion.diasSemana)
      ? inscripcion.diasSemana.map((dia) => NOMBRES_DIAS[dia] || dia).join(', ')
      : '-';

    const bloques = Array.isArray(inscripcion.bloques)
      ? inscripcion.bloques.map((bloque) => bloque.codigo || bloque.id).join(', ')
      : '-';

    return `
      <tr>
        <td>${escaparHtml(inscripcion.recurso)}</td>
        <td>${escaparHtml(inscripcion.uso)}</td>
        <td>${inscripcion.fechaInicio} al ${inscripcion.fechaFin}</td>
        <td>${escaparHtml(dias)}</td>
        <td>${escaparHtml(bloques)}</td>
        <td>${inscripcion.totalReservas}</td>
        <td>
          <button type="button" class="btn-editar" onclick="editarInscripcion(${inscripcion.id})">Editar</button>
          <button type="button" class="btn-cancelar" onclick="eliminarInscripcion(${inscripcion.id})">Eliminar</button>
        </td>
      </tr>
    `;
  }).join('');
}

function editarInscripcion(id) {
  window.location.href = `/inscripcion-calendarizada?id=${id}`;
}

async function eliminarInscripcion(id) {
  const confirmar = window.confirm('¿Confirmas la eliminación de esta inscripción? Se liberarán sus bloques y materiales.');
  if (!confirmar) return;

  try {
    await apiFetch(`/inscripciones-calendarizadas/${id}`, { method: 'DELETE' });
    await cargarInscripciones();
    await cargarReservas();
  } catch (error) {
    alert(error.message);
  }
}

function escaparHtml(texto) {
  return String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
