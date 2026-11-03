const pool = require('../../db');
const ApiError = require('../utils/ApiError');
const { esEnteroPositivo, esFechaValida, fechaHoy } = require('../utils/validators');

const DIAS_SEMANA_VALIDOS = [1, 2, 3, 4, 5, 6, 7];
const MOTIVO_CANCELACION_SOLAPE = 'Solapada por una inscripción calendarizada';

function fechaAObjeto(fecha) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

function fechaISO(fecha) {
  return fecha.toISOString().slice(0, 10);
}

function diaSemanaDeFecha(fecha) {
  const dia = fechaAObjeto(fecha).getUTCDay();
  return dia === 0 ? 7 : dia;
}

function normalizarDiasSemana(valor) {
  if (!Array.isArray(valor) || valor.length === 0) {
    throw new ApiError(400, 'Debes indicar al menos un día de la semana.');
  }

  const dias = [...new Set(valor.map((dia) => Number(dia)))];

  if (dias.some((dia) => !DIAS_SEMANA_VALIDOS.includes(dia))) {
    throw new ApiError(400, 'Los días de la semana deben estar entre 1 (lunes) y 7 (domingo).');
  }

  return dias.sort((a, b) => a - b);
}

function normalizarBloqueIds(valor) {
  if (!Array.isArray(valor) || valor.length === 0) {
    throw new ApiError(400, 'Debes indicar al menos un bloque horario.');
  }

  const bloques = [...new Set(valor.map((bloqueId) => Number(bloqueId)))];

  if (bloques.some((bloqueId) => !esEnteroPositivo(bloqueId))) {
    throw new ApiError(400, 'Los bloques horarios deben ser identificadores válidos.');
  }

  return bloques;
}

function normalizarCantidad(valor) {
  const cantidad = Number(valor);
  if (!esEnteroPositivo(cantidad)) {
    throw new ApiError(400, 'La cantidad debe ser un entero mayor que cero.');
  }
  return cantidad;
}

function normalizarUso(valor) {
  const uso = typeof valor === 'string' ? valor.trim() : '';
  if (!uso) {
    throw new ApiError(400, 'El uso o nombre de la actividad es obligatorio.');
  }
  return uso.slice(0, 500);
}

function normalizarEntrada(datos = {}, actual = null) {
  const recursoId = Number(datos.recursoId ?? (actual ? actual.recurso_id : NaN));
  const fechaInicio = datos.fechaInicio || datos.fecha || (actual ? actual.fecha_inicio : null);
  const fechaFin = datos.fechaFin || datos.fecha || (actual ? actual.fecha_fin : null) || fechaInicio;

  if (!esEnteroPositivo(recursoId)) {
    throw new ApiError(400, 'El recurso debe ser un identificador válido.');
  }

  if (!esFechaValida(fechaInicio)) {
    throw new ApiError(400, 'La fecha de inicio debe tener formato AAAA-MM-DD y ser válida.');
  }

  if (!esFechaValida(fechaFin)) {
    throw new ApiError(400, 'La fecha de término debe tener formato AAAA-MM-DD y ser válida.');
  }

  if (fechaFin < fechaInicio) {
    throw new ApiError(400, 'La fecha de término no puede ser anterior a la fecha de inicio.');
  }

  if (fechaFin < fechaHoy()) {
    throw new ApiError(400, 'La inscripción no puede terminar en una fecha pasada.');
  }

  let diasSemana;
  const diasRecibidos = datos.diasSemana ?? (actual ? actual.dias_semana : null);

  if (Array.isArray(diasRecibidos) && diasRecibidos.length > 0) {
    diasSemana = normalizarDiasSemana(diasRecibidos);
  } else if (fechaInicio === fechaFin) {
    diasSemana = [diaSemanaDeFecha(fechaInicio)];
  } else {
    throw new ApiError(400, 'Debes indicar al menos un día de la semana para el rango de fechas.');
  }

  const bloqueIdsRaw = datos.bloqueIds
    ?? (datos.bloqueId != null ? [datos.bloqueId] : (actual ? actual.bloque_ids : null));
  const bloqueIds = normalizarBloqueIds(bloqueIdsRaw);
  const cantidad = normalizarCantidad(datos.cantidad ?? (actual ? actual.cantidad : 1));
  const uso = normalizarUso(datos.uso ?? (actual ? actual.uso : ''));
  const solapar = datos.solapar === true || datos.solapar === 'true' || datos.solapar === 1 || datos.solapar === '1';

  return { recursoId, fechaInicio, fechaFin, diasSemana, bloqueIds, cantidad, uso, solapar };
}

function generarFechas(fechaInicio, fechaFin, diasSemana) {
  const inicio = fechaAObjeto(fechaInicio);
  const fin = fechaAObjeto(fechaFin);
  const dias = new Set(diasSemana);
  const fechas = [];

  for (const cursor = new Date(inicio); cursor <= fin; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const dia = cursor.getUTCDay() === 0 ? 7 : cursor.getUTCDay();
    if (dias.has(dia)) {
      fechas.push(fechaISO(cursor));
    }

    if (fechas.length > 400) {
      throw new ApiError(400, 'El rango de fechas genera demasiadas reservas. Acorta el período.');
    }
  }

  if (fechas.length === 0) {
    throw new ApiError(400, 'La inscripción no genera ninguna fecha según los días seleccionados.');
  }

  return fechas;
}

function validarCantidadPorRecurso(recurso, cantidad) {
  if (recurso.categoria === 'cancha' && cantidad !== 1) {
    throw new ApiError(400, 'Una cancha solo puede inscribirse una vez por bloque.');
  }

  if (recurso.categoria === 'material' && cantidad > recurso.stock_total) {
    throw new ApiError(400, 'La cantidad solicitada supera el stock total del material.');
  }
}

async function obtenerRecurso(client, recursoId) {
  const { rows } = await client.query(
    `SELECT id, nombre, categoria, stock_total
     FROM recursos
     WHERE id = $1
     FOR UPDATE`,
    [recursoId]
  );

  if (rows.length === 0) {
    throw new ApiError(404, 'El recurso solicitado no existe.');
  }

  return rows[0];
}

async function obtenerBloques(client, bloqueIds) {
  const { rows } = await client.query(
    `SELECT id, codigo,
            TO_CHAR(hora_inicio, 'HH24:MI') AS hora_inicio,
            TO_CHAR(hora_fin, 'HH24:MI') AS hora_fin
     FROM bloques
     WHERE id = ANY($1::int[])
     ORDER BY hora_inicio`,
    [bloqueIds]
  );

  if (rows.length !== bloqueIds.length) {
    throw new ApiError(404, 'Uno o más bloques horarios no existen.');
  }

  return rows;
}

async function detectarConflictos(client, { recurso, fechas, bloques, cantidad }) {
  const bloqueIds = bloques.map((bloque) => bloque.id);

  const { rows } = await client.query(
    `SELECT res.id,
            TO_CHAR(res.fecha, 'YYYY-MM-DD') AS fecha,
            res.bloque_id,
            res.cantidad,
            res.tipo,
            res.inscripcion_id,
            res.usuario_id,
            u.nombre AS usuario,
            b.codigo AS bloque
     FROM reservas res
     JOIN usuarios u ON u.id = res.usuario_id
     JOIN bloques b ON b.id = res.bloque_id
     WHERE res.recurso_id = $1
       AND res.fecha = ANY($2::date[])
       AND res.bloque_id = ANY($3::int[])
       AND res.estado = 'confirmada'
     FOR UPDATE OF res`,
    [recurso.id, fechas, bloqueIds]
  );

  const agrupadas = new Map();

  for (const reserva of rows) {
    const llave = `${reserva.fecha}|${reserva.bloque_id}`;
    if (!agrupadas.has(llave)) {
      agrupadas.set(llave, []);
    }
    agrupadas.get(llave).push(reserva);
  }

  const conflictos = [];

  for (const fecha of fechas) {
    for (const bloque of bloques) {
      const ocupadas = agrupadas.get(`${fecha}|${bloque.id}`) || [];

      if (recurso.categoria === 'cancha' && ocupadas.length > 0) {
        conflictos.push({
          fecha,
          bloqueId: bloque.id,
          bloque: bloque.codigo,
          motivo: 'La cancha ya está reservada en ese bloque.',
          reservas: ocupadas.map((reserva) => ({
            id: reserva.id,
            usuario: reserva.usuario,
            tipo: reserva.tipo,
            inscripcionId: reserva.inscripcion_id
          }))
        });
      }

      if (recurso.categoria === 'material') {
        const cantidadOcupada = ocupadas.reduce((total, reserva) => total + reserva.cantidad, 0);

        if (cantidadOcupada + cantidad > recurso.stock_total) {
          conflictos.push({
            fecha,
            bloqueId: bloque.id,
            bloque: bloque.codigo,
            motivo: 'No hay stock suficiente para esa fecha y bloque.',
            cantidadSolicitada: cantidad,
            cantidadOcupada,
            stockTotal: recurso.stock_total,
            reservas: ocupadas.map((reserva) => ({
              id: reserva.id,
              usuario: reserva.usuario,
              cantidad: reserva.cantidad,
              tipo: reserva.tipo,
              inscripcionId: reserva.inscripcion_id
            }))
          });
        }
      }
    }
  }

  return conflictos;
}

async function cancelarConflictos(client, conflictos) {
  const reservas = conflictos.flatMap((conflicto) => conflicto.reservas);
  const inscripcionIds = [...new Set(
    reservas.map((reserva) => reserva.inscripcionId).filter(Boolean)
  )];
  const reservaIds = [...new Set(
    reservas.filter((reserva) => !reserva.inscripcionId).map((reserva) => reserva.id)
  )];

  if (inscripcionIds.length > 0) {
    await client.query('DELETE FROM reservas WHERE inscripcion_id = ANY($1::int[])', [inscripcionIds]);
    await client.query('DELETE FROM inscripciones_calendarizadas WHERE id = ANY($1::int[])', [inscripcionIds]);
  }

  if (reservaIds.length === 0) {
    return;
  }

  await client.query(
    `UPDATE reservas
     SET estado = 'cancelada',
         cancelada_en = NOW(),
         motivo_cancelacion = $2
     WHERE id = ANY($1::int[])
       AND estado = 'confirmada'`,
    [reservaIds, MOTIVO_CANCELACION_SOLAPE]
  );
}

async function insertarReservas(client, { inscripcionId, usuarioId, recursoId, fechas, bloques, cantidad, uso }) {
  const valores = [];
  const parametros = [];
  let indice = 1;

  for (const fecha of fechas) {
    for (const bloque of bloques) {
      valores.push(
        `($${indice++}, $${indice++}, $${indice++}, $${indice++}, $${indice++}, $${indice++}, 'calendarizada', 'confirmada', $${indice++})`
      );
      parametros.push(usuarioId, recursoId, fecha, bloque.id, cantidad, uso, inscripcionId);
    }
  }

  const { rowCount } = await client.query(
    `INSERT INTO reservas (usuario_id, recurso_id, fecha, bloque_id, cantidad, uso, tipo, estado, inscripcion_id)
     VALUES ${valores.join(', ')}`,
    parametros
  );

  return rowCount;
}

const CONSULTA_INSCRIPCIONES = `
  SELECT ic.id,
         ic.recurso_id,
         r.nombre AS recurso,
         r.categoria,
         s.nombre AS sede,
         TO_CHAR(ic.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
         TO_CHAR(ic.fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
         ic.dias_semana,
         ic.bloque_ids,
         ic.cantidad,
         ic.uso,
         ic.creada_en,
         ic.actualizada_en,
         u.nombre AS creada_por,
         (SELECT COUNT(*)::int
          FROM reservas res
          WHERE res.inscripcion_id = ic.id
            AND res.estado = 'confirmada') AS total_reservas
  FROM inscripciones_calendarizadas ic
  JOIN recursos r ON r.id = ic.recurso_id
  JOIN sedes s ON s.id = r.sede_id
  JOIN usuarios u ON u.id = ic.creada_por
`;

async function obtenerMapaBloques() {
  const { rows } = await pool.query(
    `SELECT id, codigo,
            TO_CHAR(hora_inicio, 'HH24:MI') AS hora_inicio,
            TO_CHAR(hora_fin, 'HH24:MI') AS hora_fin
     FROM bloques`
  );

  return new Map(rows.map((bloque) => [bloque.id, bloque]));
}

function mapearInscripcion(fila, mapaBloques) {
  return {
    id: fila.id,
    recursoId: fila.recurso_id,
    recurso: fila.recurso,
    categoria: fila.categoria,
    sede: fila.sede,
    fechaInicio: fila.fecha_inicio,
    fechaFin: fila.fecha_fin,
    diasSemana: fila.dias_semana,
    bloqueIds: fila.bloque_ids,
    bloques: fila.bloque_ids.map((bloqueId) => {
      const bloque = mapaBloques.get(bloqueId);
      return bloque
        ? {
            id: bloque.id,
            codigo: bloque.codigo,
            horario: `${bloque.hora_inicio} - ${bloque.hora_fin}`
          }
        : { id: bloqueId };
    }),
    cantidad: fila.cantidad,
    uso: fila.uso,
    creadaPor: fila.creada_por,
    creadaEn: fila.creada_en,
    actualizadaEn: fila.actualizada_en,
    totalReservas: fila.total_reservas
  };
}

async function listarInscripcionesCalendarizadas(usuario) {
  if (usuario.rol !== 'administrador') {
    throw new ApiError(403, 'Solo el administrador puede consultar las inscripciones calendarizadas.');
  }

  const [{ rows }, mapaBloques] = await Promise.all([
    pool.query(`${CONSULTA_INSCRIPCIONES} ORDER BY ic.fecha_inicio DESC, ic.id DESC`),
    obtenerMapaBloques()
  ]);

  return rows.map((fila) => mapearInscripcion(fila, mapaBloques));
}

async function obtenerInscripcionCalendarizada(id) {
  if (!esEnteroPositivo(id)) {
    throw new ApiError(400, 'El identificador de la inscripción no es válido.');
  }

  const { rows } = await pool.query(`${CONSULTA_INSCRIPCIONES} WHERE ic.id = $1`, [id]);

  if (rows.length === 0) {
    throw new ApiError(404, 'La inscripción calendarizada no existe.');
  }

  const mapaBloques = await obtenerMapaBloques();
  return mapearInscripcion(rows[0], mapaBloques);
}

async function crearInscripcionCalendarizada(usuario, datos) {
  if (usuario.rol !== 'administrador') {
    throw new ApiError(403, 'Solo el administrador puede registrar inscripciones calendarizadas.');
  }

  const entrada = normalizarEntrada(datos);

  if (entrada.fechaInicio < fechaHoy()) {
    throw new ApiError(400, 'La fecha de inicio no puede ser pasada.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const recurso = await obtenerRecurso(client, entrada.recursoId);
    validarCantidadPorRecurso(recurso, entrada.cantidad);
    const bloques = await obtenerBloques(client, entrada.bloqueIds);
    const fechas = generarFechas(entrada.fechaInicio, entrada.fechaFin, entrada.diasSemana);
    const conflictos = await detectarConflictos(client, {
      recurso,
      fechas,
      bloques,
      cantidad: entrada.cantidad
    });

    if (conflictos.length > 0 && !entrada.solapar) {
      throw new ApiError(
        409,
        'La actividad se topa con reservas existentes. Revisa los conflictos o confirma que deseas solaparla.',
        { conflictos }
      );
    }

    if (conflictos.length > 0) {
      await cancelarConflictos(client, conflictos);
    }

    const { rows } = await client.query(
      `INSERT INTO inscripciones_calendarizadas
         (recurso_id, fecha_inicio, fecha_fin, dias_semana, bloque_ids, cantidad, uso, creada_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        entrada.recursoId,
        entrada.fechaInicio,
        entrada.fechaFin,
        entrada.diasSemana,
        entrada.bloqueIds,
        entrada.cantidad,
        entrada.uso,
        usuario.id
      ]
    );

    const inscripcionId = rows[0].id;

    await insertarReservas(client, {
      inscripcionId,
      usuarioId: usuario.id,
      recursoId: entrada.recursoId,
      fechas,
      bloques,
      cantidad: entrada.cantidad,
      uso: entrada.uso
    });

    await client.query('COMMIT');
    return await obtenerInscripcionCalendarizada(inscripcionId);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
    }
    throw error;
  } finally {
    client.release();
  }
}

async function actualizarInscripcionCalendarizada(usuario, id, datos) {
  if (usuario.rol !== 'administrador') {
    throw new ApiError(403, 'Solo el administrador puede modificar inscripciones calendarizadas.');
  }

  if (!esEnteroPositivo(id)) {
    throw new ApiError(400, 'El identificador de la inscripción no es válido.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: actuales } = await client.query(
      `SELECT id, recurso_id,
              TO_CHAR(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
              TO_CHAR(fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
              dias_semana, bloque_ids, cantidad, uso
       FROM inscripciones_calendarizadas
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    if (actuales.length === 0) {
      throw new ApiError(404, 'La inscripción calendarizada no existe.');
    }

    const entrada = normalizarEntrada(datos, actuales[0]);
    const recurso = await obtenerRecurso(client, entrada.recursoId);
    validarCantidadPorRecurso(recurso, entrada.cantidad);
    const bloques = await obtenerBloques(client, entrada.bloqueIds);
    const fechas = generarFechas(entrada.fechaInicio, entrada.fechaFin, entrada.diasSemana);

    await client.query('DELETE FROM reservas WHERE inscripcion_id = $1', [id]);

    const conflictos = await detectarConflictos(client, {
      recurso,
      fechas,
      bloques,
      cantidad: entrada.cantidad
    });

    if (conflictos.length > 0 && !entrada.solapar) {
      throw new ApiError(
        409,
        'La modificación se topa con reservas existentes. Revisa los conflictos o confirma que deseas solaparla.',
        { conflictos }
      );
    }

    if (conflictos.length > 0) {
      await cancelarConflictos(client, conflictos);
    }

    await client.query(
      `UPDATE inscripciones_calendarizadas
       SET recurso_id = $2,
           fecha_inicio = $3,
           fecha_fin = $4,
           dias_semana = $5,
           bloque_ids = $6,
           cantidad = $7,
           uso = $8,
           actualizada_en = NOW()
       WHERE id = $1`,
      [
        id,
        entrada.recursoId,
        entrada.fechaInicio,
        entrada.fechaFin,
        entrada.diasSemana,
        entrada.bloqueIds,
        entrada.cantidad,
        entrada.uso
      ]
    );

    await insertarReservas(client, {
      inscripcionId: Number(id),
      usuarioId: usuario.id,
      recursoId: entrada.recursoId,
      fechas,
      bloques,
      cantidad: entrada.cantidad,
      uso: entrada.uso
    });

    await client.query('COMMIT');
    return await obtenerInscripcionCalendarizada(id);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
    }
    throw error;
  } finally {
    client.release();
  }
}

async function eliminarInscripcionCalendarizada(usuario, id) {
  if (usuario.rol !== 'administrador') {
    throw new ApiError(403, 'Solo el administrador puede eliminar inscripciones calendarizadas.');
  }

  if (!esEnteroPositivo(id)) {
    throw new ApiError(400, 'El identificador de la inscripción no es válido.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT id FROM inscripciones_calendarizadas WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (rows.length === 0) {
      throw new ApiError(404, 'La inscripción calendarizada no existe.');
    }

    await client.query('DELETE FROM reservas WHERE inscripcion_id = $1', [id]);
    await client.query('DELETE FROM inscripciones_calendarizadas WHERE id = $1', [id]);

    await client.query('COMMIT');
    return { id: Number(id), eliminada: true };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
    }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  crearInscripcionCalendarizada,
  listarInscripcionesCalendarizadas,
  obtenerInscripcionCalendarizada,
  actualizarInscripcionCalendarizada,
  eliminarInscripcionCalendarizada
};
