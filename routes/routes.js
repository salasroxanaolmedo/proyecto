const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// ==========================================
// 📦 CONTROLADORES
// ==========================================
const authController = require('../controllers/auth.controller');
const usuariosController = require('../controllers/usuarios.controller');
const serviciosController = require('../controllers/serviciosController');
const recepcionController = require('../controllers/recepcionController');
const empleadoController = require('../controllers/empleadoController');
const vistaclienteController = require('../controllers/vistaclientecontroller');
const inventarioController = require('../controllers/inventarioController');

// ==========================================
// 🛡️ MIDDLEWARES DE ROL
// ==========================================
const { protegerCliente, protegerEmpleado, protegerRecepcion, protegerAdmin } = require('../middleware/authMiddleware');

// ==========================================
// 🔒 A07 - RATE LIMITING en rutas de autenticación
// Máx 10 intentos por IP en 15 minutos
// ==========================================
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos. Por favor espera 15 minutos e intenta de nuevo.' },
    handler: (req, res) => {
        res.status(429).render('auth/login', {
            errorMsg: 'Demasiados intentos fallidos. Por favor espera 15 minutos.'
        });
    }
});

const registroLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 15,
    handler: (req, res) => {
        res.status(429).render('auth/registro', {
            errorMsg: 'Demasiadas solicitudes de registro. Por favor espera una hora.'
        });
    }
});

// ==========================================
// 🌐 RUTAS PÚBLICAS / INICIO
// ==========================================
router.get('/', (req, res) => {
    res.render('inicio');
});

// ==========================================
// 🔐 RUTAS DE AUTENTICACIÓN
// ==========================================
router.get('/auth/registro', authController.obtenerVistaRegistro);
router.get('/auth/login', (req, res, next) => {
    const { usuarioId, usuarioRol } = req.cookies || {};
    if (usuarioId && usuarioRol) {
        // Ya tiene sesión activa → redirigir al dashboard según su rol
        if (usuarioRol === 'admin' || usuarioRol === 'recepcionista') return res.redirect('/recepcion');
        if (usuarioRol === 'empleado') return res.redirect('/empleado');
        if (usuarioRol === 'cliente') return res.redirect('/cliente/ordenes');
    }
    next();
}, authController.obtenerVistaLogin);

// Acciones con rate limit + validación
router.post('/auth/registro',
    registroLimiter,
    authController.validarRegistro,
    authController.registrarUsuario
);
router.post('/auth/login',
    loginLimiter,
    authController.validarLogin,
    authController.iniciarSesion
);
router.get('/auth/logout', authController.cerrarSesion);

// ==========================================
// RUTAS DE ADMIN
// ==========================================
router.get('/auth/usuarios', protegerRecepcion, usuariosController.obtenerUsuarios);
router.get('/servicios', protegerRecepcion, serviciosController.obtenerServicios);
router.post('/servicios/agregar', protegerRecepcion, serviciosController.validarServicio, serviciosController.agregarServicio);


// ==========================================
// RUTAS DE RECEPCIONISTA / ADMIN
// ==========================================
router.get('/recepcion', protegerRecepcion, recepcionController.mostrarFormularioRecepcion);
router.post('/recepcion', protegerRecepcion, recepcionController.validarRecepcion, recepcionController.guardarRecepcion);

// ==========================================
// RUTAS DE INVENTARIO (recepcionista + admin)
// ==========================================
router.get('/inventario', protegerRecepcion, inventarioController.mostrarInventario);
router.post('/inventario', protegerRecepcion, inventarioController.validarProducto, inventarioController.crearProducto);
router.post('/inventario/editar/:id', protegerRecepcion, inventarioController.validarProducto, inventarioController.editarProducto);
router.post('/inventario/eliminar/:id', protegerRecepcion, inventarioController.eliminarProducto);

// ==========================================
//  RUTAS DE EMPLEADO (Técnicos/Mecánicos)
// ==========================================
router.get('/empleado', protegerEmpleado, empleadoController.obtenerTickets);
router.get('/empleado/tickets', protegerEmpleado, empleadoController.obtenerTickets);
router.post('/empleado/actualizar-ticket', protegerEmpleado, empleadoController.actualizarEstatusTicket);
router.post('/empleado/archivar-ticket', protegerEmpleado, empleadoController.archivarTicket);

// ==========================================
// RUTAS DE CLIENTE
// ==========================================
router.get('/cliente/ordenes', protegerCliente, vistaclienteController.listarOrdenes);
router.get('/cliente/ordenes/:id', protegerCliente, vistaclienteController.detalleOrden);

module.exports = router;


//comentario nadaqueverpara actualizar render