-- Migration 001 : conversion de la colonne "time" de varchar → integer (secondes)
-- Forfeit est stocké comme NULL.
--
-- À lancer UNE SEULE FOIS en prod AVANT de déployer la nouvelle version de l'app.
-- Usage : psql -h <host> -U <user> -d <database> -f migrations/001-time-to-seconds.sql

BEGIN;

-- Vérifie que la migration n'a pas déjà tourné (colonne encore varchar)
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'score'
    AND column_name  = 'time';

  IF col_type IS NULL THEN
    RAISE EXCEPTION 'Table score ou colonne time introuvable.';
  END IF;

  IF col_type <> 'character varying' THEN
    RAISE NOTICE 'Migration déjà appliquée (colonne time de type %). Rien à faire.', col_type;
    RETURN;
  END IF;

  -- Colonne temporaire pour stocker les secondes
  EXECUTE 'ALTER TABLE score ADD COLUMN time_temp INTEGER';

  -- Conversion H:MM:SS / MM:SS → secondes, Forfeit → NULL
  EXECUTE $sql$
    UPDATE score SET time_temp =
      CASE
        WHEN time = 'Forfeit' OR time IS NULL OR time = '' THEN NULL
        WHEN time ~ '^[0-9]+(:[0-9]+){2}$' THEN
          SPLIT_PART(time, ':', 1)::INTEGER * 3600 +
          SPLIT_PART(time, ':', 2)::INTEGER * 60  +
          SPLIT_PART(time, ':', 3)::INTEGER
        WHEN time ~ '^[0-9]+:[0-9]+$' THEN
          SPLIT_PART(time, ':', 1)::INTEGER * 60 +
          SPLIT_PART(time, ':', 2)::INTEGER
        ELSE NULL
      END
  $sql$;

  EXECUTE 'ALTER TABLE score DROP COLUMN time';
  EXECUTE 'ALTER TABLE score RENAME COLUMN time_temp TO time';

  RAISE NOTICE 'Migration appliquée avec succès.';
END $$;

COMMIT;
