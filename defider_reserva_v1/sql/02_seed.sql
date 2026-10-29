INSERT INTO usuarios (nombre, correo, rol, sancionado, motivo_sancion) VALUES
  ('Juan Pérez', 'juan.perez@usm.cl', 'consumidor', FALSE, NULL),
  ('María Privilegiada', 'maria.privilegiada@usm.cl', 'privilegiado', FALSE, NULL),
  ('Fiscalizador DEFIDER', 'fiscalizador@usm.cl', 'fiscalizador', FALSE, NULL),
  ('Administrador DEFIDER', 'admin@usm.cl', 'administrador', FALSE, NULL)
ON CONFLICT (correo) DO NOTHING;

INSERT INTO sedes (nombre) VALUES
  ('San Joaquín'),
  ('Casa Central'),
  ('Sede Viña del Mar')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO bloques (codigo, hora_inicio, hora_fin) VALUES
  ('1-2', '08:15', '09:25'),
  ('3-4', '09:35', '10:45'),
  ('5-6', '10:55', '12:05'),
  ('7-8', '12:15', '13:25'),
  ('9-10', '14:30', '15:40'),
  ('11-12', '15:50', '17:00'),
  ('13-14', '17:10', '18:20'),
  ('15-16', '18:30', '19:40')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO recursos (nombre, categoria, tipo, sede_id, indicaciones, imagen, stock_total, materiales_asociados)
SELECT
  'Cancha de Tenis N° 1',
  'cancha',
  'Cancha de Tenis',
  (SELECT id FROM sedes WHERE nombre = 'San Joaquín'),
  'Uso exclusivo con calzado de suela lisa o tenis. Mantener la cancha limpia.',
  'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=600&q=80',
  1,
  '[{"nombre": "Red de Tenis Profesional", "cantidad": 1}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM recursos WHERE nombre = 'Cancha de Tenis N° 1');

INSERT INTO recursos (nombre, categoria, tipo, sede_id, indicaciones, imagen, stock_total, materiales_asociados)
SELECT
  'Cancha de Tenis N° 2',
  'cancha',
  'Cancha de Tenis',
  (SELECT id FROM sedes WHERE nombre = 'San Joaquín'),
  'Uso exclusivo con calzado de suela lisa o tenis.',
  'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=600&q=80',
  1,
  '[{"nombre": "Red de Tenis Profesional", "cantidad": 1}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM recursos WHERE nombre = 'Cancha de Tenis N° 2');

INSERT INTO recursos (nombre, categoria, tipo, sede_id, indicaciones, imagen, stock_total, materiales_asociados)
SELECT
  'Cancha de Fútbol Principal',
  'cancha',
  'Cancha de Fútbol',
  (SELECT id FROM sedes WHERE nombre = 'San Joaquín'),
  'Obligatorio el uso de canilleras y zapatillas de fútbol.',
  'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=600&q=80',
  1,
  '[{"nombre": "Arcos Oficiales", "cantidad": 2}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM recursos WHERE nombre = 'Cancha de Fútbol Principal');

INSERT INTO recursos (nombre, categoria, tipo, sede_id, indicaciones, imagen, stock_total, materiales_asociados)
SELECT
  'Pack de 5 Balones de Básquetbol',
  'material',
  'Balones de Básquetbol',
  (SELECT id FROM sedes WHERE nombre = 'Casa Central'),
  'Verificar nivel de inflado al retirar en pañol.',
  'https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=600&q=80',
  8,
  '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM recursos WHERE nombre = 'Pack de 5 Balones de Básquetbol');

INSERT INTO recursos (nombre, categoria, tipo, sede_id, indicaciones, imagen, stock_total, materiales_asociados)
SELECT
  'Gimnasio Multiuso N° 1',
  'cancha',
  'Gimnasio Multiuso',
  (SELECT id FROM sedes WHERE nombre = 'Casa Central'),
  'Uso de zapatillas bajitas de suela blanca.',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=600&q=80',
  1,
  '[{"nombre": "Arcos móviles", "cantidad": 2}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM recursos WHERE nombre = 'Gimnasio Multiuso N° 1');

INSERT INTO recursos (nombre, categoria, tipo, sede_id, indicaciones, imagen, stock_total, materiales_asociados)
SELECT
  'Set de Raquetas de Tenis (Par)',
  'material',
  'Raquetas de Tenis',
  (SELECT id FROM sedes WHERE nombre = 'San Joaquín'),
  'Manipular con cuidado para evitar daños en cuerdas.',
  'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=600&q=80',
  4,
  '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM recursos WHERE nombre = 'Set de Raquetas de Tenis (Par)');
