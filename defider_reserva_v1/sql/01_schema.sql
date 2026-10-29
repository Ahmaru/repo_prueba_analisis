CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL UNIQUE,
  rol TEXT NOT NULL CHECK (rol IN ('consumidor', 'privilegiado', 'fiscalizador', 'administrador')),
  sancionado BOOLEAN NOT NULL DEFAULT FALSE,
  motivo_sancion TEXT
);

CREATE TABLE IF NOT EXISTS sedes (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS bloques (
  id SERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL
);

CREATE TABLE IF NOT EXISTS recursos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('cancha', 'material')),
  tipo TEXT NOT NULL,
  sede_id INTEGER NOT NULL REFERENCES sedes(id),
  indicaciones TEXT,
  imagen TEXT,
  stock_total INTEGER NOT NULL DEFAULT 1 CHECK (stock_total >= 0),
  materiales_asociados JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS reservas (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  recurso_id INTEGER NOT NULL REFERENCES recursos(id),
  fecha DATE NOT NULL,
  bloque_id INTEGER NOT NULL REFERENCES bloques(id),
  cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  uso TEXT,
  tipo TEXT NOT NULL DEFAULT 'individual' CHECK (tipo IN ('individual', 'extracurricular', 'calendarizada')),
  estado TEXT NOT NULL DEFAULT 'confirmada' CHECK (estado IN ('confirmada', 'cancelada', 'finalizada')),
  creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelada_en TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reservas_disponibilidad
  ON reservas (recurso_id, fecha, bloque_id, estado);

CREATE INDEX IF NOT EXISTS idx_reservas_usuario
  ON reservas (usuario_id, estado);
