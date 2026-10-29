let recursoActual = null;
let seleccionActual = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!requerirSesion()) return;

  actualizarNavbarUsuario();

  const seleccionGuardada = localStorage.getItem('seleccionDisponibilidad');
  if (!seleccionGuardada) {
    mostrarErrorRecurso('No se seleccionó ningún recurso. Vuelve a la vista de disponibilidad.');
    return;
  }

  try {
    seleccionActual = JSON.parse(seleccionGuardada);
  } catch (error) {
    mostrarErrorRecurso('La selección guardada no es válida. Vuelve a la vista de disponibilidad.');
    return;
  }

  cargarDetalleRecurso(seleccionActual.id);
});

async function cargarDetalleRecurso(id) {
  const contenedor = document.getElementById('contenedorDetalle');
  if (!contenedor) return;

  try {
    const recurso = await apiFetch(`/recursos/${id}`);
    recursoActual = recurso;
    renderizarDetalle(recurso);
  } catch (error) {
    mostrarErrorRecurso(error.message);
  }
}

function renderizarDetalle(recurso) {
  const contenedor = document.getElementById('contenedorDetalle');
  if (!contenedor) return;

  const esCancha = recurso.categoria === 'cancha';

  const ladoIzquierdoHTML = `
    <div class="col-md-6 border-end pe-md-4">
      <h2 class="fw-bold text-dark mb-3">${recurso.nombre}</h2>

      <div class="mb-3 text-center">
        <img src="${recurso.imagen}" alt="${recurso.nombre}" class="img-fluid rounded-3 shadow-sm w-100" style="max-height: 280px; object-fit: cover;">
      </div>

      <div class="bg-light p-3 rounded-3 mb-4 border">
        <p class="mb-1 text-muted"><strong>Sede:</strong> ${recurso.sede}</p>
        <p class="mb-1 text-primary"><strong>Bloque Horario:</strong> ${seleccionActual.bloque} (${seleccionActual.horario})</p>
        <p class="mb-0 text-muted"><strong>Fecha:</strong> ${seleccionActual.fecha}</p>
        <p class="mb-0 text-muted"><strong>Disponible:</strong> ${esCancha ? '1 cancha' : `${seleccionActual.stockDisponible} unidades`}</p>
      </div>

      <div>
        ${
          esCancha
            ? `<button class="btn btn-success btn-lg w-100 fw-bold shadow-sm" onclick="reservarCanchaDirecta()">
                 <i class="bi bi-check-circle-fill me-2"></i> Reservar Cancha
               </button>`
            : `<button class="btn btn-primary btn-lg w-100 fw-bold shadow-sm" data-bs-toggle="modal" data-bs-target="#modalReservaMaterial" onclick="prepararModalMaterial()">
                 <i class="bi bi-arrow-right-circle-fill me-2"></i> Solicitar Reserva de Material
               </button>`
        }
      </div>
    </div>
  `;

  let listaMaterialesHTML = '';
  const materiales = Array.isArray(recurso.materialesAsociados) ? recurso.materialesAsociados : [];

  if (esCancha && materiales.length > 0) {
    const itemsLista = materiales
      .map((material) => `<li class="list-group-item d-flex justify-content-between align-items-center">
                   <span><i class="bi bi-box-seam me-2 text-primary"></i>${material.nombre}</span>
                   <span class="badge bg-primary rounded-pill">Cantidad: ${material.cantidad}</span>
                 </li>`)
      .join('');

    listaMaterialesHTML = `
      <div class="mt-4 pt-3 border-top">
        <h4 class="fw-bold text-dark mb-3">
          <i class="bi bi-tools me-2 text-primary"></i>Materiales asociados
        </h4>
        <ul class="list-group shadow-sm">
          ${itemsLista}
        </ul>
      </div>
    `;
  }

  const ladoDerechoHTML = `
    <div class="col-md-6 ps-md-4 d-flex flex-column justify-content-between">
      <div>
        <h4 class="fw-bold text-dark mb-3">
          <i class="bi bi-exclamation-triangle-fill me-2 text-warning"></i>Indicaciones de Uso
        </h4>
        <div class="alert alert-warning border-0 shadow-sm text-dark fs-6">
          ${recurso.indicaciones || 'Sin indicaciones registradas.'}
        </div>
        ${listaMaterialesHTML}
      </div>
    </div>
  `;

  contenedor.innerHTML = ladoIzquierdoHTML + ladoDerechoHTML;
}

function prepararModalMaterial() {
  if (!recursoActual || !seleccionActual) return;

  document.getElementById('nombreMaterialModal').textContent = recursoActual.nombre;
  document.getElementById('stockDisponibleModal').textContent = `Stock disponible: ${seleccionActual.stockDisponible} unidades`;
  document.getElementById('inputCantidadDeseada').value = 1;
  document.getElementById('errorStock').classList.add('d-none');
}

async function confirmarReservaMaterial() {
  const cantidadInput = document.getElementById('inputCantidadDeseada');
  const alertaError = document.getElementById('errorStock');
  const cantidadDeseada = parseInt(cantidadInput.value, 10);

  if (!Number.isInteger(cantidadDeseada) || cantidadDeseada < 1) {
    alertaError.textContent = 'La cantidad debe ser un entero mayor que cero.';
    alertaError.classList.remove('d-none');
    return;
  }

  if (cantidadDeseada > seleccionActual.stockDisponible) {
    alertaError.textContent = 'Excede el límite disponible, seleccione otra cantidad.';
    alertaError.classList.remove('d-none');
    return;
  }

  alertaError.classList.add('d-none');

  try {
    await apiFetch('/reservas', {
      method: 'POST',
      body: JSON.stringify({
        recursoId: recursoActual.id,
        fecha: seleccionActual.fecha,
        bloqueId: seleccionActual.bloqueId,
        cantidad: cantidadDeseada,
        uso: 'Reserva de material',
        tipo: 'individual'
      })
    });

    const modalEl = document.getElementById('modalReservaMaterial');
    const modalObj = bootstrap.Modal.getInstance(modalEl);
    if (modalObj) modalObj.hide();

    localStorage.removeItem('seleccionDisponibilidad');
    alert(`Reserva de ${cantidadDeseada} unidad(es) de "${recursoActual.nombre}" registrada con éxito.`);
    window.location.href = 'revisar-reservas.html';
  } catch (error) {
    alertaError.textContent = error.message;
    alertaError.classList.remove('d-none');
  }
}

async function reservarCanchaDirecta() {
  if (!recursoActual || !seleccionActual) return;

  try {
    await apiFetch('/reservas', {
      method: 'POST',
      body: JSON.stringify({
        recursoId: recursoActual.id,
        fecha: seleccionActual.fecha,
        bloqueId: seleccionActual.bloqueId,
        cantidad: 1,
        uso: 'Reserva individual de cancha',
        tipo: 'individual'
      })
    });

    localStorage.removeItem('seleccionDisponibilidad');
    alert(`Reserva de ${recursoActual.nombre} realizada con éxito.`);
    window.location.href = 'revisar-reservas.html';
  } catch (error) {
    alert(error.message);
  }
}

function mostrarErrorRecurso(mensaje) {
  const contenedor = document.getElementById('contenedorDetalle');
  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="col-12 text-center py-5">
      <h3 class="text-danger fw-bold"><i class="bi bi-exclamation-octagon me-2"></i>Recurso no disponible</h3>
      <p class="text-muted">${mensaje}</p>
      <a href="hu01-disponibilidad.html" class="btn btn-primary mt-3">
        <i class="bi bi-arrow-left me-1"></i> Volver a Disponibilidad
      </a>
    </div>
  `;
}
