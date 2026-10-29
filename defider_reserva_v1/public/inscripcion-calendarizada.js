document.addEventListener('DOMContentLoaded', async () => {
  if (!requerirSesion()) return;

  const sesion = obtenerSesion();
  if (sesion.rol !== 'administrador') {
    alert('Solo el administrador puede registrar inscripciones calendarizadas.');
    window.location.href = 'hu01-disponibilidad.html';
    return;
  }

  actualizarNavbarUsuario();

  const fechaInput = document.getElementById('fechaInscripcion');
  if (fechaInput) fechaInput.value = fechaLocalISO();

  try {
    const catalogo = await apiFetch('/catalogo');
    poblarRecursos(catalogo.recursos);
    poblarBloques(catalogo.bloques);
  } catch (error) {
    mostrarError(error.message);
  }
});

document.getElementById('form-inscripcion')?.addEventListener('submit', async function (evento) {
  evento.preventDefault();

  const recursoId = Number(document.getElementById('recursoId').value);
  const fecha = document.getElementById('fechaInscripcion').value;
  const bloqueId = Number(document.getElementById('bloqueId').value);
  const uso = document.getElementById('uso').value.trim();

  if (!recursoId || !fecha || !bloqueId || !uso) {
    mostrarError('Completa todos los campos obligatorios.');
    return;
  }

  try {
    await apiFetch('/inscripciones-calendarizadas', {
      method: 'POST',
      body: JSON.stringify({ recursoId, fecha, bloqueId, uso })
    });

    alert('Inscripción calendarizada registrada con éxito.');
    window.location.href = 'revisar-reservas.html';
  } catch (error) {
    mostrarError(error.message);
  }
});

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
  const select = document.getElementById('bloqueId');
  if (!select) return;

  select.innerHTML = '<option value="">Selecciona un bloque</option>';
  bloques.forEach((bloque) => {
    const opcion = document.createElement('option');
    opcion.value = bloque.id;
    opcion.textContent = `Bloque ${bloque.codigo} (${bloque.hora_inicio} - ${bloque.hora_fin})`;
    select.appendChild(opcion);
  });
}

function mostrarError(mensaje) {
  const contenedor = document.getElementById('mensajeError');
  if (!contenedor) {
    alert(mensaje);
    return;
  }

  contenedor.textContent = mensaje;
  contenedor.classList.remove('d-none');
}
