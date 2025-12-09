import { Router, Request, Response } from 'express';
import validator from 'validator';
import { authenticateToken, requireAdmin } from '../auth';
import {
  createCustomPokemon,
  getAllCustomPokemons,
  getCustomPokemonById,
  getCustomPokemonsByUser,
  updateCustomPokemonEvolutions,
  getUserById,
} from '../db';
import { JwtPayload } from '../types';

const router = Router();

// ============================================================================
// RUTAS DE LECTURA - GET
// ============================================================================

/**
 * GET /api/pokemon/custom/user/:userId
 * Obtiene TODOS los Pokémon personalizados creados por un usuario específico
 *
 * IMPORTANTE: Esta ruta debe estar ANTES que /api/pokemon/custom/:id
 * para evitar conflictos de routing (userId podría interpretarse como ID)
 *
 * Autenticación: PÚBLICA (sin requiere token)
 *
 * @route GET /api/pokemon/custom/user/:userId
 * @param userId - ID del usuario propietario de los Pokémon
 * @returns {CustomPokemon[]} Array de Pokémon personalizados del usuario
 * @status 200 - OK, array de Pokémon retornado (puede estar vacío)
 * @status 500 - Error al obtener los Pokémon
 *
 * @example
 * ```ts
 * // GET /api/pokemon/custom/user/user-123
 * // Response:
 * // [
 * //   { id: 1026, name: "Yuli", types: ["Water"], ... },
 * //   { id: 1027, name: "Yuli2", types: ["Fire"], ... }
 * // ]
 * ```
 */
router.get('/api/pokemon/custom/user/:userId', async (req: Request, res: Response) => {
  try {
    console.log(`👤 [pokemon] GET user/${req.params.userId} - Obteniendo Pokémon del usuario`);
    const pokemons = await getCustomPokemonsByUser(req.params.userId);
    console.log(`   ✅ ${pokemons.length} Pokémon encontrados para usuario ${req.params.userId}`);
    res.json(pokemons);
  } catch (error) {
    console.error(`   ❌ Error al obtener Pokémon del usuario ${req.params.userId}:`, error);
    res.status(500).json({ 
      error: 'Error al obtener Pokémon del usuario',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * POST /api/pokemon/custom
 * CREAR un nuevo Pokémon personalizado en la base de datos
 *
 * Autenticación: REQUERIDA + ADMIN
 * Solo administradores pueden crear nuevos Pokémon personalizados
 *
 * Request Body Obligatorio:
 * - name (string, 1-100 caracteres): Nombre único del Pokémon
 * - types (string[], 1-2 elementos): Tipos del Pokémon (ej: ["water", "electric"])
 * - sprite (string): URL o base64 de la imagen del Pokémon
 * - description (string, 1-500 caracteres): Descripción Pokédex
 *
 * Request Body Opcional:
 * - height (number, 0-100): Altura en decímetros
 * - weight (number, 0-1000): Peso en hectogramos
 * - evolutions (string[]): Array de nombres de Pokémon a los que evoluciona
 *
 * Validaciones Realizadas:
 * 1. Usuario autenticado y es administrador
 * 2. Usuario existe en la base de datos
 * 3. Campos obligatorios presentes y válidos
 * 4. Campos opcionales (si se envían) cumplen con restricciones
 *
 * @route POST /api/pokemon/custom
 * @status 201 - Pokémon creado exitosamente
 * @status 400 - Validación fallida (campo faltante o inválido)
 * @status 401 - No autenticado o no es administrador
 * @status 404 - Usuario no encontrado
 * @status 500 - Error de base de datos
 *
 * @example
 * ```ts
 * // POST /api/pokemon/custom
 * // Headers: Authorization: Bearer <token>
 * // Body:
 * {
 *   name: "Yuli",
 *   types: ["water", "ice"],
 *   sprite: "https://...",
 *   description: "Un pokémon acuático misterioso",
 *   height: 6,
 *   weight: 15,
 *   evolutions: ["Yulix"]
 * }
 * // Response (201):
 * {
 *   message: "Pokémon personalizado creado exitosamente",
 *   pokemon: {
 *     id: 1026,
 *     name: "Yuli",
 *     types: ["water", "ice"],
 *     ...
 *   }
 * }
 * ```
 */
router.post(
  '/api/pokemon/custom',
  authenticateToken,
  requireAdmin,
  async (req: Request & { user?: JwtPayload }, res: Response) => {
    try {
      const { name, types, sprite, description, height, weight, evolutions } = req.body;
      console.log(`📝 [pokemon] POST custom - Creando Pokémon: "${name}"`);

      // VALIDACIÓN 1: Usuario autenticado y existe
      if (!req.user || !req.user.userId) {
        console.warn('   ⚠️  Usuario no identificado en token');
        return res.status(401).json({ error: 'Usuario no identificado' });
      }

      const user = await getUserById(req.user.userId);
      if (!user) {
        console.warn(`   ⚠️  Usuario ${req.user.userId} no encontrado en BD`);
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // VALIDACIÓN 2: Campos obligatorios presentes
      if (!name || !types || !sprite || !description) {
        console.warn('   ⚠️  Campos obligatorios faltantes:', { name: !!name, types: !!types, sprite: !!sprite, description: !!description });
        return res.status(400).json({
          error: 'Campos requeridos: name, types, sprite, description',
        });
      }

      // VALIDACIÓN 3: NAME (1-100 caracteres)
      if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
        console.warn(`   ⚠️  Name inválido: "${name}" (type: ${typeof name}, length: ${name?.length})`);
        return res.status(400).json({
          error: 'name debe ser una cadena no vacía de máximo 100 caracteres',
        });
      }

      // VALIDACIÓN 4: TYPES (array de 1-2 elementos)
      if (!Array.isArray(types) || types.length === 0 || types.length > 2) {
        console.warn(`   ⚠️  Types inválido: ${JSON.stringify(types)} (debe ser array de 1-2)`);
        return res.status(400).json({
          error: 'types debe ser un array con 1-2 elementos',
        });
      }

      if (!types.every(t => typeof t === 'string' && t.length > 0 && t.length < 50)) {
        console.warn(`   ⚠️  Algún type es inválido en: ${JSON.stringify(types)}`);
        return res.status(400).json({
          error: 'Cada tipo debe ser una cadena válida (máximo 50 caracteres)',
        });
      }

      // VALIDACIÓN 5: SPRITE (URL o base64)
      if (typeof sprite !== 'string' || sprite.trim().length === 0) {
        console.warn(`   ⚠️  Sprite inválido o vacío`);
        return res.status(400).json({
          error: 'sprite debe ser una URL o base64 válida',
        });
      }

      // VALIDACIÓN 6: DESCRIPTION (1-500 caracteres)
      if (typeof description !== 'string' || description.trim().length === 0 || description.length > 500) {
        console.warn(`   ⚠️  Description inválida: length=${description?.length}`);
        return res.status(400).json({
          error: 'description debe tener entre 1 y 500 caracteres',
        });
      }

      // VALIDACIÓN 7: HEIGHT (si se envía, debe estar entre 0-100)
      if (height !== undefined && (typeof height !== 'number' || height < 0 || height > 100)) {
        console.warn(`   ⚠️  Height inválido: ${height}`);
        return res.status(400).json({
          error: 'height debe ser un número entre 0 y 100',
        });
      }

      // VALIDACIÓN 8: WEIGHT (si se envía, debe estar entre 0-1000)
      if (weight !== undefined && (typeof weight !== 'number' || weight < 0 || weight > 1000)) {
        console.warn(`   ⚠️  Weight inválido: ${weight}`);
        return res.status(400).json({
          error: 'weight debe ser un número entre 0 y 1000',
        });
      }

      // VALIDACIÓN 9: EVOLUTIONS (si se envía, debe ser array)
      if (evolutions !== undefined && !Array.isArray(evolutions)) {
        console.warn(`   ⚠️  Evolutions no es array: ${typeof evolutions}`);
        return res.status(400).json({
          error: 'evolutions debe ser un array',
        });
      }

      // ✅ TODAS LAS VALIDACIONES PASARON - CREAR POKÉMON
      console.log(`   ✅ Validaciones OK. Creando Pokémon "${name}" para usuario ${req.user.userId}`);
      const pokemon = await createCustomPokemon(
        name.trim(),
        types,
        sprite.trim(),
        description.trim(),
        evolutions,
        req.user!.userId,
        height,
        weight
      );

      console.log(`   ✅ Pokémon creado exitosamente: ID=${pokemon.id}, name="${pokemon.name}"`);
      res.status(201).json({
        message: 'Pokémon personalizado creado exitosamente',
        pokemon,
      });
    } catch (error) {
      console.error('   ❌ Error creando Pokémon:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ 
        error: 'Error al crear Pokémon personalizado',
        details: errorMessage
      });
    }
  }
);

/**
 * GET /api/pokemon/custom
 * Obtiene TODOS los Pokémon personalizados de la aplicación
 *
 * NOTA: Es la versión "bulk" de /api/pokemon/custom/:id
 * Retorna completo (con todos los campos), no solo nombres
 *
 * Autenticación: PÚBLICA (sin requiere token)
 *
 * @route GET /api/pokemon/custom
 * @returns {CustomPokemon[]} Array de TODOS los Pokémon personalizados existentes
 * @status 200 - OK, array retornado (puede estar vacío si no hay custom Pokémon)
 * @status 500 - Error al obtener de la BD
 *
 * @example
 * ```ts
 * // GET /api/pokemon/custom
 * // Response:
 * // [
 * //   { id: 1026, name: "Yuli", types: ["water"], ... },
 * //   { id: 1027, name: "Yuli2", types: ["fire"], ... },
 * //   { id: 1028, name: "Yuli3", types: ["grass"], ... }
 * // ]
 * ```
 */
router.get('/api/pokemon/custom', async (req: Request, res: Response) => {
  try {
    console.log(`📚 [pokemon] GET custom - Obteniendo TODOS los Pokémon personalizados`);
    const pokemons = await getAllCustomPokemons();
    console.log(`   ✅ Total: ${pokemons.length} Pokémon encontrados`);
    res.json(pokemons);
  } catch (error) {
    console.error(`   ❌ Error al obtener Pokémon personalizados:`, error);
    res.status(500).json({ 
      error: 'Error al obtener Pokémon personalizados',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * GET /api/pokemon/custom/:id
 * Obtiene un Pokémon personalizado específico por ID o NOMBRE
 *
 * Búsqueda en este orden:
 * 1. Si `:id` es número → busca por ID en BD
 * 2. Si no encuentra → busca por NAME (case-insensitive)
 * 3. Si no encuentra → retorna 404
 *
 * IMPORTANTE: Esta ruta debe estar DESPUÉS de /api/pokemon/custom/user/:userId
 * para evitar conflictos de routing
 *
 * Autenticación: PÚBLICA (sin requiere token)
 *
 * @route GET /api/pokemon/custom/:id
 * @param id - ID (número) o NAME (string) del Pokémon
 * @returns {CustomPokemon & {customPokemon: true}} Pokémon encontrado con bandera custom=true
 * @status 200 - Pokémon encontrado
 * @status 404 - Pokémon no encontrado en BD (ni por ID ni por nombre)
 * @status 500 - Error al consultar BD
 *
 * @example
 * ```ts
 * // Búsqueda por ID
 * // GET /api/pokemon/custom/1026
 * // Response:
 * { id: 1026, name: "Yuli", customPokemon: true, ... }
 *
 * // Búsqueda por NOMBRE (case-insensitive)
 * // GET /api/pokemon/custom/yuli
 * // GET /api/pokemon/custom/YULI
 * // Response (mismo Pokémon):
 * { id: 1026, name: "Yuli", customPokemon: true, ... }
 * ```
 */
router.get('/api/pokemon/custom/:id', async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    console.log(`🔍 [pokemon] GET custom/:${idParam}`);

    // PASO 1: Intentar búsqueda por ID (si es número)
    const numId = parseInt(idParam, 10);
    if (!isNaN(numId)) {
      console.log(`   → Buscando por ID numérico: ${numId}`);
      const pokemon = await getCustomPokemonById(numId);
      if (pokemon) {
        console.log(`   ✅ Encontrado por ID: "${pokemon.name}"`);
        return res.json({
          ...pokemon,
          customPokemon: true,
        });
      }
      console.log(`   ℹ️  No encontrado por ID, intentando por nombre...`);
    }

    // PASO 2: Búsqueda por NOMBRE (case-insensitive)
    console.log(`   → Buscando por nombre: "${idParam}"`);
    const allPokemons = await getAllCustomPokemons();
    const byName = allPokemons.find(
      (p: any) => p.name.toLowerCase() === idParam.toLowerCase()
    );

    if (byName) {
      console.log(`   ✅ Encontrado por nombre: ID=${byName.id}, name="${byName.name}"`);
      return res.json({
        ...byName,
        customPokemon: true,
      });
    }

    // PASO 3: No encontrado en ninguna búsqueda
    console.log(`   ❌ No encontrado en BD (ni por ID ni por nombre)`);
    return res.status(404).json({ error: 'Pokémon no encontrado' });
  } catch (error) {
    console.error(`   ❌ Error al obtener Pokémon:`, error);
    res.status(500).json({ 
      error: 'Error al obtener Pokémon',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// ============================================================================
// RUTAS DE ACTUALIZACIÓN - PUT
// ============================================================================

/**
 * PUT /api/pokemon/custom/:id
 * ACTUALIZA las evoluciones de un Pokémon personalizado existente
 *
 * Solo actualiza el campo `evolutions`, no otros campos del Pokémon
 * Permite especificar a qué Pokémon evoluciona este
 *
 * Autenticación: REQUERIDA + ADMIN
 * Solo administradores pueden editar evoluciones
 *
 * Request Body Obligatorio:
 * - evolutions (string[]): Array de nombres de Pokémon a los que evoluciona
 *   - Máximo 10 evoluciones por Pokémon
 *   - Cada nombre debe ser string válido (1-100 caracteres)
 *
 * Búsqueda del Pokémon:
 * 1. Si `:id` es número → busca por ID
 * 2. Si no encuentra → busca por NOMBRE
 * 3. Si no encuentra → retorna 404
 *
 * @route PUT /api/pokemon/custom/:id
 * @param id - ID (número) o NAME (string) del Pokémon
 * @status 200 - Pokémon actualizado exitosamente
 * @status 400 - Validación fallida (evolutions inválido)
 * @status 401 - No autenticado o no es administrador
 * @status 404 - Pokémon no encontrado
 * @status 500 - Error de base de datos
 *
 * @example
 * ```ts
 * // PUT /api/pokemon/custom/1026
 * // Headers: Authorization: Bearer <token>
 * // Body:
 * {
 *   evolutions: ["Yulix", "Yulit"]
 * }
 * // Response:
 * {
 *   message: "Pokémon actualizado exitosamente",
 *   pokemon: {
 *     id: 1026,
 *     name: "Yuli",
 *     evolutions: ["Yulix", "Yulit"],
 *     ...
 *   }
 * }
 * ```
 */
router.put(
  '/api/pokemon/custom/:id',
  authenticateToken,
  requireAdmin,
  async (req: Request & { user?: JwtPayload }, res: Response) => {
    try {
      const idParam = req.params.id;
      const { evolutions } = req.body;
      console.log(`✏️  [pokemon] PUT custom/:${idParam} - Actualizando evoluciones`);

      // VALIDACIÓN 1: EVOLUTIONS (debe ser array)
      if (!Array.isArray(evolutions)) {
        console.warn(`   ⚠️  Evolutions no es array: ${typeof evolutions}`);
        return res.status(400).json({ 
          error: 'evolutions debe ser un array',
          received: typeof evolutions
        });
      }

      // VALIDACIÓN 2: EVOLUTIONS (máximo 10)
      if (evolutions.length > 10) {
        console.warn(`   ⚠️  Demasiadas evoluciones: ${evolutions.length} (máx 10)`);
        return res.status(400).json({ 
          error: 'No puede haber más de 10 evoluciones',
          received: evolutions.length
        });
      }

      // VALIDACIÓN 3: EVOLUTIONS (cada una debe ser string válido)
      if (!evolutions.every(e => typeof e === 'string' && e.trim().length > 0 && e.length < 100)) {
        console.warn(`   ⚠️  Alguna evolución es inválida en: ${JSON.stringify(evolutions)}`);
        return res.status(400).json({ 
          error: 'Cada evolución debe ser una cadena válida (1-100 caracteres)'
        });
      }

      // BÚSQUEDA: Intentar por ID primero, luego por NOMBRE
      console.log(`   → Buscando Pokémon: ${idParam}`);
      let pokemon: any = null;
      let pokemonId: number | null = null;

      // Intentar por ID (si es número)
      const numId = parseInt(idParam, 10);
      if (!isNaN(numId)) {
        console.log(`     → Por ID: ${numId}`);
        pokemon = await getCustomPokemonById(numId);
        pokemonId = numId;
      }

      // Si no encontró por ID, intentar por NOMBRE
      if (!pokemon) {
        console.log(`     → Por NOMBRE: "${idParam}"`);
        const allPokemons = await getAllCustomPokemons();
        pokemon = allPokemons.find(
          (p: any) => p.name.toLowerCase() === idParam.toLowerCase()
        );
        if (pokemon) pokemonId = pokemon.id;
      }

      // VALIDACIÓN: Pokémon existe
      if (!pokemon || pokemonId === null) {
        console.warn(`   ⚠️  Pokémon no encontrado: ${idParam}`);
        return res.status(404).json({ 
          error: 'Pokémon no encontrado',
          searched: idParam
        });
      }

      // ✅ VALIDACIONES PASADAS - ACTUALIZAR EVOLUCIONES
      console.log(`   ✅ Pokémon encontrado: "${pokemon.name}" (ID=${pokemonId})`);
      console.log(`   → Actualizando evolutions: ${JSON.stringify(evolutions)}`);
      const updatedPokemon = await updateCustomPokemonEvolutions(pokemonId, evolutions);
      
      console.log(`   ✅ Evoluciones actualizadas exitosamente para "${pokemon.name}"`);
      return res.json({
        message: 'Pokémon actualizado exitosamente',
        pokemon: updatedPokemon,
      });
    } catch (error) {
      console.error(`   ❌ Error al actualizar Pokémon:`, error);
      res.status(500).json({ 
        error: 'Error al actualizar Pokémon',
        details: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
);

// ============================================================================
// EXPORTAR ROUTER
// ============================================================================

export default router;
