let sesionActual = null;

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
    await apiFetch(`/reservas/${id}/cancelar`, { method: 'PATCH' });
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
