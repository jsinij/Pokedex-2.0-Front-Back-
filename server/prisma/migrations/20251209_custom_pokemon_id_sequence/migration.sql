-- Set custom pokemon ID sequence to start at 1026
-- Update SQLite's internal sequence counter
UPDATE "sqlite_sequence" SET "seq" = 1025 WHERE "name" = "custom_pokemons";
