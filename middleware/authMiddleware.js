const ROLES_VALIDOS = ['admin', 'recepcionista', 'empleado', 'cliente'];
const SESION_MS = 15 * 60 * 1000; // 15 minutos deslizantes

// ------------------------------------------
// Helper: renueva las cookies por 15 min más
// (sesión deslizante — se resetea en cada petición autenticada)
// ------------------------------------------
function renovarSesion(req, res) {
    const cookieOpts = {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: SESION_MS
    };
    res.cookie('usuarioId',  req.cookies.usuarioId,  cookieOpts);
    res.cookie('usuarioRol', req.cookies.usuarioRol, cookieOpts);
}

// ------------------------------------------
// Helper: valida que las cookies sean datos legítimos
// ------------------------------------------
function obtenerSesion(req) {
    const { usuarioId, usuarioRol } = req.cookies || {};
    // A01: Verificar que el rol sea uno de los permitidos (evitar manipulación de cookies)
    if (!usuarioId || !usuarioRol || !ROLES_VALIDOS.includes(usuarioRol)) {
        return null;
    }
    // Básica validación de UUID para el ID de usuario
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(usuarioId)) {
        return null;
    }
    return { usuarioId, usuarioRol };
}

// ------------------------------------------
// RECEPCIÓN + ADMIN
// ------------------------------------------
exports.protegerRecepcion = (req, res, next) => {
    const sesion = obtenerSesion(req);

    if (!sesion) {
        return res.redirect('/auth/login');
    }

    if (sesion.usuarioRol !== 'admin' && sesion.usuarioRol !== 'recepcionista') {
        return res.status(403).render('layouts/notacces', {
            mensaje: 'Acceso denegado. Esta área es exclusiva para recepción y administración.'
        });
    }

    renovarSesion(req, res); // Sesión deslizante: reinicia el contador de 15 min
    res.set({ 'Cache-Control': 'no-cache, must-revalidate, private', 'Pragma': 'no-cache', 'Expires': '0' });
    next();
};

// ------------------------------------------
// EMPLEADO + ADMIN
// ------------------------------------------
exports.protegerEmpleado = (req, res, next) => {
    const sesion = obtenerSesion(req);

    if (!sesion) {
        return res.redirect('/auth/login');
    }

    if (sesion.usuarioRol !== 'empleado' && sesion.usuarioRol !== 'admin') {
        return res.status(403).render('layouts/notacces', {
            mensaje: 'Acceso denegado. Área exclusiva para el equipo técnico.'
        });
    }

    renovarSesion(req, res); // Sesión deslizante: reinicia el contador de 15 min
    res.set({ 'Cache-Control': 'no-cache, must-revalidate, private', 'Pragma': 'no-cache', 'Expires': '0' });
    next();
};

// ------------------------------------------
// SOLO CLIENTE
// ------------------------------------------
exports.protegerCliente = (req, res, next) => {
    const sesion = obtenerSesion(req);

    if (!sesion) {
        return res.redirect('/auth/login');
    }

    if (sesion.usuarioRol !== 'cliente') {
        return res.status(403).render('layouts/notacces', {
            mensaje: 'Acceso denegado. Esta área es exclusiva para nuestros clientes.'
        });
    }

    renovarSesion(req, res); // Sesión deslizante: reinicia el contador de 15 min
    res.set({ 'Cache-Control': 'no-cache, must-revalidate, private', 'Pragma': 'no-cache', 'Expires': '0' });
    next();
};

// ------------------------------------------
// SOLO ADMIN
// ------------------------------------------
exports.protegerAdmin = (req, res, next) => {
    const sesion = obtenerSesion(req);

    if (!sesion) {
        return res.redirect('/auth/login');
    }

    if (sesion.usuarioRol !== 'admin') {
        return res.status(403).render('layouts/notacces', {
            mensaje: 'Acceso denegado. Área exclusiva para administradores.'
        });
    }

    // Evitar que el navegador cachee páginas protegidas
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    next();
};
