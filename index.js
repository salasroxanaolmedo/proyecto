require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

// Importamos conexiones
const dbConnectMongo = require('./config/mongo');

const app = express();

// Para Render: confiar en el proxy para el Rate Limiting
app.set('trust proxy', 1);

// ==========================================
// 🔒 A05 - SECURITY MISCONFIGURATION
// Helmet: Cabeceras HTTP de seguridad
// ==========================================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],   // Permite onclick, onchange, etc. en HTML
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: null,         // No forzar HTTPS en localhost
        }
    },
    crossOriginEmbedderPolicy: false,
    hsts: false // <- Deshabilitar HSTS en local para que no fuerce HTTPS
}));

// ==========================================
// 🔒 A01 - BROKEN ACCESS CONTROL
// CORS: Solo acepta requests del mismo origen en producción
// ==========================================
const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
};
app.use(cors(corsOptions));


app.disable('x-powered-by');


app.use(express.json({ limit: '10kb' }));   // A04: Limitar tamaño de payload
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ==========================================
// CONFIGURACIÓN PUG
// ==========================================
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// ==========================================
// 🔒 MIDDLEWARE GLOBAL: Rol en vistas
// Solo confiar en cookies httpOnly (ya establecidas en auth.controller)
// ==========================================
app.use((req, res, next) => {
    if (req.cookies && req.cookies.usuarioRol) {
        // Solo permitir roles válidos
        const rolesPermitidos = ['admin', 'recepcionista', 'empleado', 'cliente'];
        const rol = req.cookies.usuarioRol;
        if (rolesPermitidos.includes(rol)) {
            res.locals.usuarioRol = rol;
            res.locals.usuarioId = req.cookies.usuarioId;
        }
    }
    next();
});

// ==========================================
// ARCHIVOS ESTÁTICOS
// ==========================================
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// CONEXIONES
// ==========================================
dbConnectMongo();
console.log('Supabase Listo');

// ==========================================
// RUTAS PRINCIPALES
// ==========================================
app.use('/', require('./routes/routes'));

// ==========================================
// 🔒 A09 - LOGGING: Manejador global de errores
// No exponer stack traces al cliente
// ==========================================
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${new Date().toISOString()} | ${req.method} ${req.path} | ${err.message}`);
    res.status(err.status || 500).render('auth/login', {
        errorMsg: 'Ocurrió un error interno. Por favor intenta de nuevo.'
    });
});

// 404 genérico
app.use((req, res) => {
    res.status(404).redirect('/inicio');
});

// ==========================================
// SERVIDOR
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en el puerto ${PORT}`);
});
