let inscripcionActual = null;
let catalogoActual = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!requerirSesion()) return;

  const sesion = obtenerSesion();
  if (sesion.rol !== 'administrador') {
    alert('Solo el administrador puede registrar inscripciones calendarizadas.');
    window.location.href = 'hu01-disponibilidad.html';
    return;
  }

  actualizarNavbarUsuario();
  prepararFechasPorDefecto();

  try {
    catalogoActual = await apiFetch('/catalogo');
    poblarRecursos(catalogoActual.recursos);
    poblarBloques(catalogoActual.bloques);

    const id = new URLSearchParams(window.location.search).get('id');
    if (id) {
      await cargarInscripcion(id);
    }
  } catch (error) {
    mostrarError(error.message);
  }
});

document.getElementById('form-inscripcion')?.addEventListener('submit', async function (evento) {
  evento.preventDefault();

  const recursoId = Number(document.getElementById('recursoId').value);
  const fechaInicio = document.getElementById('fechaInicio').value;
  const fechaFin = document.getElementById('fechaFin').value;
  const cantidad = Number(document.getElementById('cantidad').value);
  const uso = document.getElementById('uso').value.trim();
  const solapar = document.getElementById('solapar').checked;
  const diasSemana = obtenerDiasSeleccionados();
  const bloqueIds = obtenerBloquesSeleccionados();

  if (!recursoId || !fechaInicio || !fechaFin || !uso) {
    mostrarError('Completa todos los campos obligatorios.');
    return;
  }

  if (fechaFin < fechaInicio) {
    mostrarError('La fecha de término no puede ser anterior a la fecha de inicio.');
    return;
  }

  if (diasSemana.length === 0) {
    mostrarError('Selecciona al menos un día de la semana.');
    return;
  }

  if (bloqueIds.length === 0) {
    mostrarError('Selecciona al menos un bloque horario.');
    return;
  }

  if (!Number.isInteger(cantidad) || cantidad < 1) {
    mostrarError('La cantidad debe ser un entero mayor que cero.');
    return;
  }

  const cuerpo = {
    recursoId,
    fechaInicio,
    fechaFin,
    diasSemana,
    bloqueIds,
    cantidad,
    uso,
    solapar
  };

  try {
    const id = new URLSearchParams(window.location.search).get('id');

    if (id) {
      await apiFetch(`/inscripciones-calendarizadas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(cuerpo)
      });
      alert('Inscripción calendarizada actualizada con éxito.');
    } else {
      await apiFetch('/inscripciones-calendarizadas', {
        method: 'POST',
        body: JSON.stringify(cuerpo)
      });
      alert('Inscripción calendarizada registrada con éxito.');
    }

    window.location.href = 'revisar-reservas.html';
  } catch (error) {
    mostrarError(error);
  }
});

function prepararFechasPorDefecto() {
  const hoy = fechaLocalISO();
  const fin = new Date();
  fin.setDate(fin.getDate() + 30);

  const fechaInicio = document.getElementById('fechaInicio');
  const fechaFin = document.getElementById('fechaFin');

  if (fechaInicio) fechaInicio.value = hoy;
  if (fechaFin) {
    const anio = fin.getFullYear();
    const mes = String(fin.getMonth() + 1).padStart(2, '0');
    const dia = String(fin.getDate()).padStart(2, '0');
    fechaFin.value = `${anio}-${mes}-${dia}`;
  }
}

async function cargarInscripcion(id) {
  const inscripcion = await apiFetch(`/inscripciones-calendarizadas/${id}`);
  inscripcionActual = inscripcion;

  const titulo = document.getElementById('tituloFormulario');
  const boton = document.getElementById('btnGuardar');

  if (titulo) titulo.textContent = 'Editar inscripción calendarizada';
  if (boton) boton.textContent = 'Guardar cambios';

  document.getElementById('recursoId').value = inscripcion.recursoId;
  document.getElementById('fechaInicio').value = inscripcion.fechaInicio;
  document.getElementById('fechaFin').value = inscripcion.fechaFin;
  document.getElementById('cantidad').value = inscripcion.cantidad;
  document.getElementById('uso').value = inscripcion.uso;

  marcarDias(inscripcion.diasSemana);
  marcarBloques(inscripcion.bloqueIds);
}

function poblarRecursos(recursos) {
  const select = document.getElementById('recursoId');
  if (!select) return;

  select.innerHTML = '<option value="">Selecciona un recurso</option>';
  recursos.forEach((recurso) => {
    const opcion = document.createElement('option');
    opcion.value = recurso.id;
    opcion.textContent = `${recurso.nombre} — ${recurso.sede}`;
    select.appendChild(opcion);
  });
}

function poblarBloques(bloques) {
  const contenedor = document.getElementById('bloquesHorarios');
  if (!contenedor) return;

  contenedor.innerHTML = '';
  bloques.forEach((bloque) => {
    const etiqueta = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = bloque.id;
    checkbox.name = 'bloqueIds';
    etiqueta.appendChild(checkbox);
    etiqueta.appendChild(document.createTextNode(` Bloque ${bloque.codigo} (${bloque.hora_inicio} - ${bloque.hora_fin})`));
    contenedor.appendChild(etiqueta);
  });
}

function obtenerDiasSeleccionados() {
  return [...document.querySelectorAll('#diasSemana input[type="checkbox"]:checked')]
    .map((checkbox) => Number(checkbox.value));
}

function obtenerBloquesSeleccionados() {
  return [...document.querySelectorAll('#bloquesHorarios input[type="checkbox"]:checked')]
    .map((checkbox) => Number(checkbox.value));
}

function marcarDias(dias) {
  const seleccionados = new Set((dias || []).map((dia) => Number(dia)));
  document.querySelectorAll('#diasSemana input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = seleccionados.has(Number(checkbox.value));
  });
}

function marcarBloques(bloqueIds) {
  const seleccionados = new Set((bloqueIds || []).map((id) => Number(id)));
  document.querySelectorAll('#bloquesHorarios input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = seleccionados.has(Number(checkbox.value));
  });
}

function mostrarError(error) {
  const contenedor = document.getElementById('mensajeError');
  const mensaje = typeof error === 'string' ? error : error.message;
  const detalles = typeof error === 'object' && error ? error.detalles : null;

  if (!contenedor) {
    alert(mensaje);
    return;
  }

  let contenido = escaparHtml(mensaje);

  if (detalles && Array.isArray(detalles.conflictos) && detalles.conflictos.length > 0) {
    const items = detalles.conflictos.slice(0, 8).map((conflicto) => {
      const bloque = conflicto.bloque ? `, bloque ${conflicto.bloque}` : '';
      return `<li>${escaparHtml(conflicto.fecha)}${escaparHtml(bloque)}: ${escaparHtml(conflicto.motivo)}</li>`;
    }).join('');
    contenido += `<ul class="mt-2">${items}</ul>`;

    if (detalles.conflictos.length > 8) {
      contenido += `<p class="mt-1">Se encontraron ${detalles.conflictos.length} conflictos en total.</p>`;
    }
  }

  contenedor.innerHTML = contenido;
  contenedor.classList.remove('d-none');
}

function escaparHtml(texto) {
  return String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
