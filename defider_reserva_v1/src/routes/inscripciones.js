const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar, autorizar } = require('../middlewares/auth');
const {
  crearInscripcionCalendarizada,
  listarInscripcionesCalendarizadas,
  obtenerInscripcionCalendarizada,
  actualizarInscripcionCalendarizada,
  eliminarInscripcionCalendarizada
} = require('../services/inscripcionesService');

const router = express.Router();

router.use(autenticar, autorizar('administrador'));

router.get('/', asyncHandler(async (req, res) => {
  const inscripciones = await listarInscripcionesCalendarizadas(req.usuario);
  return res.json(inscripciones);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const inscripcion = await obtenerInscripcionCalendarizada(req.params.id);
  return res.json(inscripcion);
}));

router.post('/', asyncHandler(async (req, res) => {
  const inscripcion = await crearInscripcionCalendarizada(req.usuario, req.body);
  return res.status(201).json(inscripcion);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const inscripcion = await actualizarInscripcionCalendarizada(req.usuario, req.params.id, req.body);
  return res.json(inscripcion);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const resultado = await eliminarInscripcionCalendarizada(req.usuario, req.params.id);
  return res.json(resultado);
}));

module.exports = router;
