const pool = require('../../db');
const { esEnteroPositivo } = require('../utils/validators');

async function autenticar(req, res, next) {
  try {
    let usuarioId = req.header('x-usuario-id');
    const autorizacion = req.header('authorization');

    if (!usuarioId && autorizacion && autorizacion.startsWith('Bearer demo-')) {
      usuarioId = autorizacion.slice('Bearer demo-'.length);
    }

    if (!usuarioId || !esEnteroPositivo(usuarioId)) {
      return res.status(401).json({ mensaje: 'No hay sesión iniciada.' });
    }

    usuarioId = Number(usuarioId);

    const { rows } = await pool.query(
      `SELECT id, nombre, correo, rol, sancionado, motivo_sancion
       FROM usuarios
       WHERE id = $1`,
      [usuarioId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ mensaje: 'La sesión ya no es válida.' });
    }

    const usuario = rows[0];
    req.usuario = {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      sancionado: usuario.sancionado,
      motivoSancion: usuario.motivo_sancion
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

function autorizar(...rolesPermitidos) {
  return function verificarRol(req, res, next) {
    if (!req.usuario) {
      return res.status(401).json({ mensaje: 'No hay sesión iniciada.' });
    }
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: 'Tu rol no tiene permisos para realizar esta acción.' });
    }
    return next();
  };
}

module.exports = { autenticar, autorizar };
