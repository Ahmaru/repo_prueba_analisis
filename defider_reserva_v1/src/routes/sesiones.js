const express = require('express');
const pool = require('../../db');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/', asyncHandler(async (req, res) => {
  const correo = typeof req.body.correo === 'string' ? req.body.correo.trim().toLowerCase() : '';
  const tipo = req.body.tipo === 'administrador' ? 'administrador' : 'consumidor';

  if (!correo) {
    return res.status(400).json({ mensaje: 'El correo es obligatorio.' });
  }

  let { rows } = await pool.query(
    `SELECT id, nombre, correo, rol, sancionado, motivo_sancion
     FROM usuarios
     WHERE LOWER(correo) = $1`,
    [correo]
  );

  if (rows.length === 0) {
    ({ rows } = await pool.query(
      `SELECT id, nombre, correo, rol, sancionado, motivo_sancion
       FROM usuarios
       WHERE rol = $1
       ORDER BY id
       LIMIT 1`,
      [tipo]
    ));
  }

  if (rows.length === 0) {
    return res.status(401).json({ mensaje: 'No existe un usuario demo para ese rol.' });
  }

  const usuario = rows[0];

  return res.json({
    usuarioId: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    sancionado: usuario.sancionado,
    motivoSancion: usuario.motivo_sancion
  });
}));

module.exports = router;
