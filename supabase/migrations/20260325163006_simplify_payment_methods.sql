/*
  # Simplificar medios de pago y eliminar transferencias

  1. Cambios
    - Eliminar columna es_transferencia de la tabla movimientos
    - Agregar constraint para limitar medio_pago a solo 3 opciones: 'MP Maxi', 'MP Caro', 'Efectivo'
  
  2. Notas
    - Los medios de pago ahora son solo 3: MP Maxi, MP Caro, Efectivo
    - No existen más transferencias internas
    - La caja solo trackea efectivo
*/

-- Eliminar columna es_transferencia
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'movimientos' AND column_name = 'es_transferencia'
  ) THEN
    ALTER TABLE movimientos DROP COLUMN es_transferencia;
  END IF;
END $$;

-- Agregar constraint para medios de pago válidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'movimientos_medio_pago_check'
  ) THEN
    ALTER TABLE movimientos 
    ADD CONSTRAINT movimientos_medio_pago_check 
    CHECK (medio_pago IN ('MP Maxi', 'MP Caro', 'Efectivo'));
  END IF;
END $$;