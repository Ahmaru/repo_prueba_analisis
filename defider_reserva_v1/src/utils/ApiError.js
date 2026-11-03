class ApiError extends Error {
  constructor(status, mensaje, detalles = null) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
  }
}

module.exports = ApiError;
