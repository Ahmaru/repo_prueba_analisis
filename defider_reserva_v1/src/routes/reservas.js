const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar, autorizar } = require('../middlewares/auth');
const { crearReserva, listarReservas, cancelarReserva } = require('../services/reservasService');

const router = express.Router();

router.use(autenticar, autorizar('consumidor', 'privilegiado', 'administrador'));

router.get('/', asyncHandler(async (req, res) => {
  const reservas = await listarReservas(req.usuario, { estado: req.query.estado });
  return res.json(reservas);
}));

router.post('/', asyncHandler(async (req, res) => {
  if (req.usuario.sancionado) {
    return res.status(403).json({
      mensaje: `Tienes una sanción activa: ${req.usuario.motivoSancion || 'no puedes realizar reservas.'}`
    });
  }

  const tipo = req.usuario.rol !== 'consumidor' && req.body.tipo === 'extracurricular'
    ? 'extracurricular'
    : 'individual';

  const reserva = await crearReserva({
    usuario: req.usuario,
    recursoId: req.body.recursoId,
    fecha: req.body.fecha,
    bloqueId: req.body.bloqueId,
    cantidad: req.body.cantidad ?? 1,
    uso: req.body.uso || null,
    tipo
  });

  return res.status(201).json(reserva);
}));

router.patch('/:id/cancelar', asyncHandler(async (req, res) => {
  const reserva = await cancelarReserva(req.usuario, req.params.id);
  return res.json(reserva);
}));

module.exports = router;
