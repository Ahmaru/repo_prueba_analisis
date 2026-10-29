const pool = require('../../db');
const ApiError = require('../utils/ApiError');
const { esEnteroPositivo, esFechaValida, fechaHoy } = require('../utils/validators');

const TIPOS_RESERVA = ['individual', 'extracurricular', 'calendarizada'];

function horaActual() {
  const ahora = new Date();
  return `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
}

async function crearReserva({ usuario, recursoId, fecha, bloqueId, cantidad = 1, uso = null, tipo = 'individual' }) {
  recursoId = Number(recursoId);
  bloqueId = Number(bloqueId);
  cantidad = Number(cantidad);
  uso = typeof uso === 'string' ? uso.trim().slice(0, 500) : null;

  if (!esEnteroPositivo(recursoId) || !esEnteroPositivo(bloqueId)) {
    throw new ApiError(400, 'El recurso y el bloque deben ser identificadores válidos.');
  }

  if (!esFechaValida(fecha)) {
    throw new ApiError(400, 'La fecha debe tener formato AAAA-MM-DD y ser válida.');
  }

  if (!esEnteroPositivo(cantidad)) {
    throw new ApiError(400, 'La cantidad debe ser un entero mayor que cero.');
  }

  if (!TIPOS_RESERVA.includes(tipo)) {
    throw new ApiError(400, 'El tipo de reserva no es válido.');
  }

  if (fecha < fechaHoy()) {
    throw new ApiError(400, 'No se pueden reservar fechas pasadas.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: recursos } = await client.query(
      `SELECT id, nombre, categoria, stock_total
       FROM recursos
       WHERE id = $1
       FOR UPDATE`,
      [recursoId]
    );

    if (recursos.length === 0) {
      throw new ApiError(404, 'El recurso solicitado no existe.');
    }

    const recurso = recursos[0];

    const { rows: bloques } = await client.query(
      `SELECT id, codigo, TO_CHAR(hora_fin, 'HH24:MI') AS hora_fin
       FROM bloques
       WHERE id = $1`,
      [bloqueId]
    );

    if (bloques.length === 0) {
      throw new ApiError(404, 'El bloque horario solicitado no existe.');
    }

    if (fecha === fechaHoy() && bloques[0].hora_fin <= horaActual()) {
      throw new ApiError(409, 'El bloque seleccionado ya terminó.');
    }

    if (recurso.categoria === 'cancha' && cantidad !== 1) {
      throw new ApiError(400, 'Una cancha solo puede reservarse una vez por bloque.');
    }

    const { rows: ocupacion } = await client.query(
      `SELECT COALESCE(SUM(cantidad), 0)::int AS total
       FROM reservas
       WHERE recurso_id = $1
         AND fecha = $2
         AND bloque_id = $3
         AND estado = 'confirmada'`,
      [recursoId, fecha, bloqueId]
    );

    const reservado = ocupacion[0].total;

    if (recurso.categoria === 'cancha' && reservado > 0) {
      throw new ApiError(409, 'La cancha ya está reservada para ese bloque.');
    }

    if (recurso.categoria === 'material' && reservado + cantidad > recurso.stock_total) {
      throw new ApiError(409, `No hay stock suficiente. Disponible: ${recurso.stock_total - reservado}.`);
    }

    const { rows: creadas } = await client.query(
      `INSERT INTO reservas (usuario_id, recurso_id, fecha, bloque_id, cantidad, uso, tipo, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmada')
       RETURNING id, estado, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
                 recurso_id, bloque_id, cantidad, tipo, uso`,
      [usuario.id, recursoId, fecha, bloqueId, cantidad, uso, tipo]
    );

    await client.query('COMMIT');

    const reserva = creadas[0];

    return {
      id: reserva.id,
      estado: reserva.estado,
      fecha: reserva.fecha,
      recursoId: reserva.recurso_id,
      recurso: recurso.nombre,
      bloqueId: reserva.bloque_id,
      cantidad: reserva.cantidad,
      tipo: reserva.tipo,
      uso: reserva.uso
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function listarReservas(usuario, filtros = {}) {
  const condiciones = [];
  const valores = [];

  if (usuario.rol !== 'administrador') {
    valores.push(usuario.id);
    condiciones.push(`res.usuario_id = $${valores.length}`);
  }

  if (filtros.estado) {
    valores.push(filtros.estado);
    condiciones.push(`res.estado = $${valores.length}`);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT res.id,
            res.recurso_id,
            r.nombre AS recurso,
            r.categoria,
            s.nombre AS sede,
            TO_CHAR(res.fecha, 'YYYY-MM-DD') AS fecha,
            b.codigo AS bloque,
            TO_CHAR(b.hora_inicio, 'HH24:MI') AS hora_inicio,
            TO_CHAR(b.hora_fin, 'HH24:MI') AS hora_fin,
            res.cantidad,
            res.uso,
            res.tipo,
            res.estado,
            res.creada_en,
            res.cancelada_en
     FROM reservas res
     JOIN recursos r ON r.id = res.recurso_id
     JOIN sedes s ON s.id = r.sede_id
     JOIN bloques b ON b.id = res.bloque_id
     ${where}
     ORDER BY res.fecha DESC, b.hora_inicio DESC, res.id DESC`,
    valores
  );

  return rows.map((reserva) => ({
    id: reserva.id,
    recursoId: reserva.recurso_id,
    recurso: reserva.recurso,
    categoria: reserva.categoria,
    sede: reserva.sede,
    fecha: reserva.fecha,
    bloque: reserva.bloque,
    horario: `${reserva.hora_inicio} - ${reserva.hora_fin}`,
    cantidad: reserva.cantidad,
    uso: reserva.uso,
    tipo: reserva.tipo,
    estado: reserva.estado,
    creadaEn: reserva.creada_en,
    canceladaEn: reserva.cancelada_en
  }));
}

async function cancelarReserva(usuario, reservaId) {
  if (!esEnteroPositivo(reservaId)) {
    throw new ApiError(400, 'El identificador de la reserva no es válido.');
  }

  const { rows } = await pool.query(
    `SELECT res.id, res.usuario_id, res.estado,
            TO_CHAR(res.fecha, 'YYYY-MM-DD') AS fecha,
            TO_CHAR(b.hora_fin, 'HH24:MI') AS hora_fin
     FROM reservas res
     JOIN bloques b ON b.id = res.bloque_id
     WHERE res.id = $1`,
    [reservaId]
  );

  if (rows.length === 0) {
    throw new ApiError(404, 'La reserva no existe.');
  }

  const reserva = rows[0];

  if (usuario.rol !== 'administrador' && reserva.usuario_id !== usuario.id) {
    throw new ApiError(403, 'No puedes cancelar una reserva que no es tuya.');
  }

  if (reserva.estado !== 'confirmada') {
    throw new ApiError(409, 'Solo se pueden cancelar reservas confirmadas.');
  }

  if (reserva.fecha < fechaHoy()) {
    throw new ApiError(409, 'No se pueden cancelar reservas de fechas pasadas.');
  }

  if (reserva.fecha === fechaHoy() && reserva.hora_fin <= horaActual()) {
    throw new ApiError(409, 'No se pueden cancelar reservas cuyo bloque ya terminó.');
  }

  const { rows: actualizadas } = await pool.query(
    `UPDATE reservas
     SET estado = 'cancelada', cancelada_en = NOW()
     WHERE id = $1
     RETURNING id, estado, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, cancelada_en`,
    [reservaId]
  );

  return {
    id: actualizadas[0].id,
    estado: actualizadas[0].estado,
    fecha: actualizadas[0].fecha,
    canceladaEn: actualizadas[0].cancelada_en
  };
}

module.exports = {
  crearReserva,
  listarReservas,
  cancelarReserva
};
