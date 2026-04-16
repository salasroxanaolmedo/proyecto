const supabase = require('../config/supabase');
const { body, validationResult } = require('express-validator');
const xss = require('xss');

// ==========================================
// VALIDADORES (exportados para usar en routes)
// ==========================================
exports.validarRegistro = [
    body('nombre')
        .trim()
        .notEmpty().withMessage('El nombre es obligatorio.')
        .isLength({ max: 100 }).withMessage('Nombre demasiado largo.')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]+$/).withMessage('El nombre solo puede contener letras y espacios.'),
    body('email')
        .trim()
        .notEmpty().withMessage('El correo es obligatorio.')
        .isEmail().withMessage('El correo no tiene un formato válido.')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('La contraseña es obligatoria.')
        .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.'),
    body('telefono')
        .optional({ checkFalsy: true })
        .isMobilePhone('es-MX').withMessage('El teléfono no es válido.'),
    body('rol')
        .isIn(['admin', 'recepcionista', 'empleado', 'cliente'])
        .withMessage('Rol no válido.')
];

exports.validarLogin = [
    body('email')
        .trim()
        .notEmpty().withMessage('El correo es obligatorio.')
        .isEmail().withMessage('El correo no tiene un formato válido.')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('La contraseña es obligatoria.')
];

// ------------------------------------------
// Renderiza la vista del formulario de registro.
// ------------------------------------------
exports.obtenerVistaRegistro = (req, res) => {
    res.render('auth/registro');
};

// ------------------------------------------
// Renderiza la vista del formulario de login.
// Nunca cachear para que atrás/adelante siempre consulte al servidor.
// ------------------------------------------
exports.obtenerVistaLogin = (req, res) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    res.render('auth/login');
};

// ------------------------------------------
// A03 - Injection / A07 - Auth Failures
// Registrar usuario con validación y sanitización
// ------------------------------------------
exports.registrarUsuario = async (req, res) => {
    // Verificar errores de validación
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        const primerError = errores.array()[0].msg;
        return res.status(400).render('auth/registro', { errorMsg: primerError });
    }

    try {
        const { nombre, telefono, email, password, rol, especialidad, salario_hora, disponible } = req.body;

        // Sanitizar inputs con XSS para prevenir inyección en la DB
        const nombreLimpio = xss(nombre.trim());
        const emailLimpio = email.trim().toLowerCase();

        // Roles permitidos — doble verificación aunque ya se validó
        const rolesPermitidos = ['admin', 'recepcionista', 'empleado', 'cliente'];
        if (!rolesPermitidos.includes(rol)) {
            return res.status(400).render('auth/registro', { errorMsg: 'Rol no válido.' });
        }

        // 1. Crear en Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: emailLimpio,
            password: password,
        });

        if (authError) {
            // A09: No exponer mensajes internos de Supabase al usuario
            console.error('[REGISTRO AUTH ERROR]', authError.message);
            return res.status(400).render('auth/registro', {
                errorMsg: 'No se pudo crear la cuenta. Es posible que el correo ya esté registrado.'
            });
        }

        if (authData && authData.user) {
            const userId = authData.user.id;

            // 2. Insertar perfil — NO guardar password_plana en producción real,
            //    pero respetamos el esquema existente de la BD
            const { error: profileError } = await supabase
                .from('perfiles')
                .insert([{
                    id: userId,
                    nombre: nombreLimpio,
                    telefono: telefono ? xss(telefono.trim()) : null,
                    rol: rol,
                    email: emailLimpio,
                    usuario_acceso: emailLimpio
                    // password_plana omitido intencionalmente (riesgo A02)
                }]);

            if (profileError) {
                console.error('[REGISTRO PERFIL ERROR]', profileError.message);
                return res.status(500).render('auth/registro', {
                    errorMsg: 'Error al guardar el perfil. Intenta de nuevo.'
                });
            }

            // 3. Si es empleado, insertar en tabla empleados
            if (rol === 'empleado') {
                const isDisponible = disponible === 'on';
                const salario = salario_hora ? parseFloat(salario_hora) : 0;

                const { error: empleadoError } = await supabase
                    .from('empleados')
                    .insert([{
                        id: userId,
                        especialidad: especialidad ? xss(especialidad.trim()) : 'General',
                        salario_hora: salario,
                        disponible: isDisponible
                    }]);
                if (empleadoError) {
                    console.error('[REGISTRO EMPLEADO ERROR]', empleadoError.message);
                }
            }

            res.redirect('/auth/login');
        } else {
            throw new Error('Respuesta inesperada de autenticación.');
        }

    } catch (error) {
        console.error('[REGISTRO ERROR]', error.message);
        res.status(500).render('auth/registro', {
            errorMsg: 'Ocurrió un error. Por favor intenta de nuevo.'
        });
    }
};

// ------------------------------------------
// A07 - Identification and Auth Failures
// Login con mensaje genérico (no revelar si el correo existe)
// ------------------------------------------
exports.iniciarSesion = async (req, res) => {
    // Verificar errores de validación
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).render('auth/login', {
            errorMsg: 'Credenciales no válidas. Verifica tu correo y contraseña.'
        });
    }

    try {
        const { email, password } = req.body;
        const emailLimpio = email.trim().toLowerCase();

        const { data, error } = await supabase.auth.signInWithPassword({
            email: emailLimpio,
            password: password,
        });

        if (error) {
            console.error('[LOGIN ERROR]', error.message);
            // A07: Mensaje genérico — no revelar si el correo existe o no
            return res.status(401).render('auth/login', {
                errorMsg: 'Credenciales incorrectas. Verifica tu correo y contraseña.'
            });
        }

        const userId = data.user.id;

        const { data: perfil } = await supabase
            .from('perfiles')
            .select('rol')
            .eq('id', userId)
            .single();

        const rol = perfil ? perfil.rol : 'cliente';

        // A02 - Cryptographic Failures: cookies httpOnly + SameSite + Secure
        const SESION_MS = 15 * 60 * 1000; // 15 minutos (deslizante — se renueva en cada petición)
        const cookieOpts = {
            httpOnly: true,             // No accesible desde JS
            sameSite: 'strict',         // CSRF protection
            secure: process.env.NODE_ENV === 'production', // HTTPS en producción
            maxAge: SESION_MS
        };

        res.cookie('usuarioId',  userId, cookieOpts);
        res.cookie('usuarioRol', rol,    cookieOpts);

        if (rol === 'admin' || rol === 'recepcionista') {
            res.redirect('/recepcion');
        } else if (rol === 'empleado') {
            res.redirect('/empleado');
        } else {
            res.redirect('/cliente/ordenes');
        }

    } catch (error) {
        console.error('[LOGIN ERROR]', error.message);
        res.status(500).render('auth/login', {
            errorMsg: 'Ocurrió un error. Por favor intenta de nuevo.'
        });
    }
};

// ------------------------------------------
// Cerrar sesión — limpiar cookies
// ------------------------------------------
exports.cerrarSesion = async (req, res) => {
    try {
        // 1. Avisar a Supabase que la sesión terminó
        await supabase.auth.signOut();

        // 2. OPCIONES DE BORRADO (Deben coincidir con cómo se crearon)
        const cookieOpts = { 
            httpOnly: true, 
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
            path: '/' // <--- ESTO ES LO QUE TE FALTABA
        };

        // 3. BORRAR LAS COOKIES
        // Esto le dice al navegador: "Tira estas llaves a la basura"
        res.clearCookie('usuarioId', cookieOpts);
        res.clearCookie('usuarioRol', cookieOpts);

        // 4. ELIMINAR LA FOTO DEL CACHÉ (El no-store)
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        // 5. ENVIAR AL LOGIN
        return res.redirect('/auth/login');

    } catch (error) {
        console.error('[LOGOUT ERROR]', error.message);
        res.redirect('/auth/login');
    }
};