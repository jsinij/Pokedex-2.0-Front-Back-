import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import 'dotenv/config';
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import pokemonRoutes from "./routes/pokemon";
import { initializeDatabase, disconnectDatabase } from "./db";

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Demasiadas solicitudes desde esta IP, intenta más tarde',
  standardHeaders: true,
  legacyHeaders: false,
});

// Configurar CORS con orígenes específicos
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middlewares
app.use(cors(corsOptions));
app.use(limiter);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware para logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Ruta de prueba
app.get("/api/hello", (req, res) => {
  res.json({ message: "🚀 Backend en Node + TypeScript + Prisma", status: "OK" });
});

// Rutas de autenticación
app.use(authRoutes);

// Rutas de usuarios
app.use(usersRoutes);

// Rutas de Pokémon personalizados
app.use(pokemonRoutes);

// Middleware de error 404
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Middleware de manejo de errores global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error:', err.message);
  
  // No mostrar detalles sensibles en producción
  const isDevelopment = process.env.NODE_ENV === 'development';
  const errorMessage = isDevelopment ? err.message : 'Error interno del servidor';
  
  res.status(err.status || 500).json({ 
    error: errorMessage,
    ...(isDevelopment && { details: err.stack })
  });
});

// Inicializar servidor
async function startServer() {
  try {
    // Inicializar base de datos
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`\n✅ Backend escuchando en http://localhost:${PORT}`);
      console.log(`📝 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔒 CORS permitidos: ${allowedOrigins.join(', ')}`);
      console.log(`⏱️  Rate limit: ${process.env.RATE_LIMIT_MAX_REQUESTS || '100'} requests/${process.env.RATE_LIMIT_WINDOW_MS || '900000'}ms\n`);
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

// Manejo de cierre gracioso
process.on('SIGTERM', async () => {
  console.log('SIGTERM recibido. Cerrando servidor...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT recibido. Cerrando servidor...');
  await disconnectDatabase();
  process.exit(0);
});

startServer();
