let usuarioActual = null;
let resultadosActuales = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!requerirSesion()) return;

  usuarioActual = obtenerSesion();
  actualizarNavbarUsuario();

  const hoy = fechaLocalISO();
  const inputFecha = document.getElementById('filtroFecha');
  if (inputFecha) inputFecha.value = hoy;

  verificarSancionUsuario();
  await aplicarFiltros();
});

function verificarSancionUsuario() {
  const alerta = document.getElementById('alertaSancion');
  const textoMensaje = document.getElementById('textoMensajeSancion');

  if (usuarioActual && usuarioActual.sancionado) {
    if (alerta) alerta.classList.remove('d-none');
    if (textoMensaje) {
      textoMensaje.innerHTML = `<strong>Acción restringida:</strong> ${usuarioActual.motivoSancion || 'Tienes una sanción activa.'}`;
    }
  }
}

async function aplicarFiltros() {
  const sedeSelect = document.getElementById('filtroSede');
  const recursoSelect = document.getElementById('filtroRecurso');
  const bloqueSelect = document.getElementById('filtroBloque');
  const fechaInput = document.getElementById('filtroFecha');

  const parametros = new URLSearchParams();
  if (fechaInput && fechaInput.value) parametros.set('fecha', fechaInput.value);
  if (sedeSelect && sedeSelect.value) parametros.set('sede', sedeSelect.value);
  if (bloqueSelect && bloqueSelect.value) parametros.set('bloque', bloqueSelect.value);

  if (recursoSelect && recursoSelect.value) {
    if (recursoSelect.value === 'Cancha') {
      parametros.set('categoria', 'cancha');
    } else if (recursoSelect.value === 'Material') {
      parametros.set('categoria', 'material');
    } else {
      parametros.set('tipo', recursoSelect.value);
    }
  }

  try {
    const resultados = await apiFetch(`/disponibilidad?${parametros.toString()}`);
    renderizarResultados(resultados);
  } catch (error) {
    renderizarResultados([]);
    const contenedor = document.getElementById('mensajeNoDisponible');
    if (contenedor) {
      contenedor.innerHTML = `
        <div class="card p-5 shadow-sm border-0 bg-white">
          <i class="bi bi-exclamation-triangle text-danger display-1 mb-3"></i>
          <h3 class="fw-bold text-dark">No se pudo cargar la disponibilidad</h3>
          <p class="text-muted fs-5">${error.message}</p>
        </div>
      `;
    }
  }
}

function renderizarResultados(lista) {
  const contenedor = document.getElementById('contenedorRecursos');
  const mensajeNoDisponible = document.getElementById('mensajeNoDisponible');
  const contador = document.getElementById('contadorResultados');

  if (!contenedor) return;

  resultadosActuales = lista;
  contenedor.innerHTML = '';
  if (contador) contador.textContent = `${lista.length} disponibles`;

  if (lista.length === 0) {
    contenedor.classList.add('d-none');
    if (mensajeNoDisponible) {
      mensajeNoDisponible.innerHTML = `
        <div class="card p-5 shadow-sm border-0 bg-white">
          <i class="bi bi-calendar-x text-warning display-1 mb-3"></i>
          <h3 class="fw-bold text-dark">No hay recursos ni horarios disponibles</h3>
          <p class="text-muted fs-5">No se encontraron canchas o materiales disponibles para la combinación de filtros seleccionada.</p>
          <div>
            <button class="btn btn-outline-primary mt-2" onclick="limpiarFiltros()">
              <i class="bi bi-arrow-counterclockwise me-1"></i> Limpiar Filtros
            </button>
          </div>
        </div>
      `;
      mensajeNoDisponible.classList.remove('d-none');
    }
    return;
  }

  if (mensajeNoDisponible) mensajeNoDisponible.classList.add('d-none');
  contenedor.classList.remove('d-none');

  lista.forEach((item, indice) => {
    const col = document.createElement('div');
    col.className = 'col';

    const botonAccion = usuarioActual && usuarioActual.sancionado
      ? `<button onclick="notificarSancion()" class="btn btn-outline-danger btn-sm fw-semibold">
           <i class="bi bi-slash-circle me-1"></i> Sancionado
         </button>`
      : `<button onclick="verDetalle(${indice})" class="btn btn-outline-primary btn-sm fw-semibold">
           <i class="bi bi-eye me-1"></i> Seleccionar
         </button>`;

    const esMaterial = item.categoria === 'material';
    const etiquetaCategoria = esMaterial ? 'Material' : 'Cancha';
    const stock = esMaterial
      ? `Stock: ${item.stockDisponible}`
      : 'Cancha individual';

    col.innerHTML = `
      <div class="card h-100 shadow-sm border-0">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Disponible</span>
            <span class="badge bg-light text-dark border">${etiquetaCategoria}</span>
          </div>
          <h5 class="card-title fw-bold text-dark">${item.nombre}</h5>
          <p class="card-text text-muted mb-1"><i class="bi bi-geo-alt-fill me-1 text-danger"></i>${item.sede}</p>
          <p class="card-text text-muted mb-3"><i class="bi bi-clock-fill me-1 text-primary"></i>Bloque ${item.bloque} (${item.horario})</p>

          <div class="mt-auto d-flex justify-content-between align-items-center pt-2 border-top">
            <small class="text-muted">${stock}</small>
            ${botonAccion}
          </div>
        </div>
      </div>
    `;
    contenedor.appendChild(col);
  });
}

function verDetalle(indice) {
  const seleccion = resultadosActuales[indice];
  if (!seleccion) return;

  localStorage.setItem('seleccionDisponibilidad', JSON.stringify(seleccion));
  window.location.href = 'detalle-recurso.html';
}

function notificarSancion() {
  alert('No puedes avanzar: tienes una sanción activa en el sistema DEFIDER que te restringe realizar reservas.');
}

function limpiarFiltros() {
  const fechaInput = document.getElementById('filtroFecha');
  const sedeSelect = document.getElementById('filtroSede');
  const recursoSelect = document.getElementById('filtroRecurso');
  const bloqueSelect = document.getElementById('filtroBloque');

  if (fechaInput) fechaInput.value = fechaLocalISO();
  if (sedeSelect) sedeSelect.value = '';
  if (recursoSelect) recursoSelect.value = '';
  if (bloqueSelect) bloqueSelect.value = '';
  aplicarFiltros();
}

function salir() {
  cerrarSesion();
  window.location.href = 'index.html';
}
