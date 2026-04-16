const supabase = require('../config/supabase');
const { body, validationResult } = require('express-validator');
const xss = require('xss');

// ==========================================
// Validadores para recepción
// ==========================================
exports.validarRecepcion = [
    body('id_cliente').optional({ checkFalsy: true }).isUUID().withMessage('ID de cliente inválido'),
    body('nombre').optional({ checkFalsy: true }).trim().escape(),
    body('telefono').optional({ checkFalsy: true }).trim().escape(),
    body('identificacion').optional({ checkFalsy: true }).trim().escape(),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('El email no es válido').normalizeEmail(),
    body('password').optional({ checkFalsy: true }).isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    
    body('vehiculo').trim().notEmpty().withMessage('El vehículo es obligatorio').escape(),
    body('placa').trim().notEmpty().withMessage('La placa es obligatoria').escape(),
    body('anio').optional({ checkFalsy: true }).isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
    body('kilometraje').optional({ checkFalsy: true }).isNumeric(),
    body('nivel_combustible').optional({ checkFalsy: true }).trim().escape(),
    
    body('id_servicio').optional({ checkFalsy: true }).isUUID().withMessage('ID de servicio inválido'),
    body('id_producto').optional({ checkFalsy: true }).isUUID().withMessage('ID de producto inválido'),
    body('id_empleado_asignado').optional({ checkFalsy: true }).isUUID().withMessage('ID de empleado inválido'),
    
    body('notes').optional({ checkFalsy: true }).trim().escape()
];

// 1. Mostrar el formulario con datos iniciales
exports.mostrarFormularioRecepcion = async (req, res) => {
    try {
        const usuarioId = req.cookies.usuarioId;

        const { data: perfil } = await supabase
            .from('perfiles')
            .select('nombre')
            .eq('id', usuarioId)
            .single();

        const [servRes, empRes, cliRes, invRes] = await Promise.all([
            supabase.from('servicios').select('*'),
            supabase.from('perfiles').select('id, nombre, empleados(especialidad)').eq('rol', 'empleado'),
            supabase.from('perfiles').select('id, nombre, telefono, identificacion, usuario_acceso, vehiculos(id, placa, modelo, anio)').eq('rol', 'cliente'),
            supabase.from('inventario').select('*')
        ]);

        res.render('recepcion', {
            empleado: { 
                nombre: perfil?.nombre || 'Recepcionista', 
                idCorto: usuarioId ? usuarioId.substring(0, 6).toUpperCase() : 'REC-01' 
            },
            servicios: servRes.data || [],
            empleados: (empRes.data || []).map(e => ({
                id: e.id, 
                nombre: e.nombre, 
                especialidad: e.empleados?.especialidad || 'General'
            })),
            clientes: cliRes.data || [],
            productos: invRes.data || []
        });
    } catch (e) {
        console.error("Error al cargar formulario de recepción:", e);
        res.render('recepcion', { servicios: [], empleados: [], clientes: [], productos: [] });
    }
};

// 2. Guardar la recepción unificada
exports.guardarRecepcion = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        console.error('[RECEPCION VALIDACION ERROR]', errores.array());
        return res.status(400).json({ success: false, message: errores.array()[0].msg });
    }

    const {
        id_cliente, nombre, telefono, identificacion, email, password,
        vehiculo, placa, anio, kilometraje, nivel_combustible,
        id_servicio, id_producto, id_empleado_asignado,
        notas, ck_luces, ck_golpes, ck_limpieza
    } = req.body;

    try {
        const placaLimpia = placa.trim().toUpperCase();
        const emailLimpio = email.trim().toLowerCase();

        // --- SOLUCIÓN ZONA HORARIA: Forzamos la fecha del servidor ---
        const fechaEntradaReal = new Date().toISOString();

        // --- VALIDACIÓN DE SERVICIO OBLIGATORIO ---
        const tieneServicio = id_servicio && id_servicio !== "";
        if (!tieneServicio) {
            return res.status(400).json({ 
                success: false, 
                message: "Debe seleccionar forzosamente un SERVICIO para generar la orden de trabajo." 
            });
        }
        
        const productosArray = Array.isArray(id_producto) ? id_producto : [id_producto];
        const tieneProducto = id_producto && productosArray.some(p => p !== "" && p !== null);

        // --- MANEJO DE CLIENTE ---
        let clienteId = id_cliente;
        if (!clienteId || clienteId === "" || clienteId === "undefined") {
            const { data: perfilExistente } = await supabase
                .from('perfiles')
                .select('id')
                .eq('usuario_acceso', emailLimpio)
                .maybeSingle();

            if (perfilExistente) {
                clienteId = perfilExistente.id;
            } else {
                const { data: auth, error: aErr } = await supabase.auth.signUp({ 
                    email: emailLimpio, 
                    password: password 
                });
                if (aErr) throw new Error("Error Auth: " + aErr.message);

                const { data: p, error: pErr } = await supabase.from('perfiles').insert([{
                    id: auth.user.id,
                    nombre: nombre.trim(),
                    telefono,
                    identificacion,
                    rol: 'cliente',
                    usuario_acceso: emailLimpio
                }]).select().single();

                if (pErr) throw new Error("Error Perfil: " + pErr.message);
                clienteId = p.id;
            }
        }

        // --- VINCULAR VEHÍCULO ---
        let vehId = req.body.id_vehiculo; 
        
        if (vehId && vehId !== "") {
            const { data: vehiculoExistente } = await supabase
                .from('vehiculos')
                .select('id_cliente')
                .eq('id', vehId)
                .maybeSingle();
                
            if (!vehiculoExistente || vehiculoExistente.id_cliente !== clienteId) {
                return res.status(400).json({ success: false, message: "El vehículo seleccionado no es válido." });
            }
        } else {
            const { data: placaDuplicada } = await supabase
                .from('vehiculos')
                .select('id, id_cliente')
                .eq('placa', placaLimpia)
                .maybeSingle();

            if (placaDuplicada) {
                return res.status(400).json({ 
                    success: false, 
                    message: `La placa ${placaLimpia} ya se encuentra registrada en el sistema. Asegúrese de seleccionar el vehículo desde la lista o ingrese una placa distinta.` 
                });
            }

            const { data: nVeh, error: vErr } = await supabase.from('vehiculos').insert([{ 
                placa: placaLimpia, 
                id_cliente: clienteId, 
                modelo: vehiculo, 
                anio: parseInt(anio) || null 
            }]).select().single();
            if (vErr) throw new Error("Error registrando nuevo vehículo: " + vErr.message);
            vehId = nVeh.id;
        }

        // --- CREAR ORDEN DE TRABAJO ---
        const { data: orden, error: oErr } = await supabase.from('ordenes_trabajo').insert([{
            id_cliente: clienteId,
            id_vehiculo: vehId,
            id_servicio: id_servicio || null,
            id_empleado_asignado: id_empleado_asignado || null,
            id_recepcionista: req.cookies.usuarioId,
            estatus_servicio: 'Recibido',
            estatus_pago: 'Pendiente',
            vehiculo: vehiculo,
            placa: placaLimpia,
            created_at: fechaEntradaReal, // <--- IMPLEMENTACIÓN FECHA MÉXICO
            check_luces: ck_luces === 'on',
            check_golpes: ck_golpes === 'on',
            check_limpieza: ck_limpieza === 'on'
        }]).select().single();

        if (oErr) throw new Error("Error Orden: " + oErr.message);

        // --- VINCULAR PRODUCTOS (Tabla orden_inventario) ---
        if (tieneProducto) {
            const productosValidos = productosArray.filter(pId => pId && pId !== "");

            if (productosValidos.length > 0) {
                const insertsInventario = productosValidos.map(pId => ({
                    id_orden: orden.id,
                    id_producto: pId,
                    cantidad_usada: 1
                }));

                const { error: invErr } = await supabase
                    .from('orden_inventario')
                    .insert(insertsInventario);

                if (invErr) console.error("Error en orden_inventario:", invErr.message);
            }
        }

        return res.status(200).json({ success: true, message: "Orden generada con éxito" });

    } catch (error) {
        console.error("ERROR EN RECEPCIÓN:", error.message);
        return res.status(400).json({ success: false, message: error.message });
    }
};