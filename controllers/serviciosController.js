const supabase = require('../config/supabase');
const { body, validationResult } = require('express-validator');
const xss = require('xss');

// ==========================================
// ✅ Validadores para rutas de servicios (REFORZADOS)
// ==========================================
exports.validarServicio = [
    body('nombre_servicio')
        .trim()
        .notEmpty().withMessage('El nombre del servicio es obligatorio.')
        .isLength({ max: 100 }).withMessage('El nombre del servicio no puede exceder 100 caracteres.'),
    
    body('precio_base')
        .notEmpty().withMessage('El precio base es obligatorio.')
        // REGLA DE ORO: Cambiamos min: 0 por un mínimo lógico (ej. $50.00) 
        // para mitigar la vulnerabilidad de $0.01 encontrada en el reporte.
        .isFloat({ min: 50.00 }).withMessage('El precio base debe ser un número positivo (mínimo $50.00).'),
    
    body('tiempo_estimado_hrs')
        .notEmpty().withMessage('El tiempo estimado es obligatorio.')
        // Un servicio no puede durar 0 horas, establecemos un mínimo de 0.1 (6 min)
        .isFloat({ min: 0.1 }).withMessage('El tiempo estimado debe ser un número positivo.')
];

// Obtiene la lista de servicios desde la base de datos y renderiza la vista principal
exports.obtenerServicios = async (req, res) => {
    try {
        const { data: servicios, error } = await supabase
            .from('servicios')
            .select('*')
            .order('nombre_servicio', { ascending: true });

        if (error) throw error;

        res.render('gestionServicios', {
            servicios: servicios || []
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al cargar la lista de servicios');
    }
};

// Inserta el nuevo registro en la base de datos y recarga la pagina correcta
exports.agregarServicio = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        console.error('[SERVICIOS VALIDACION ERROR]', errores.array());
        
        // Enviamos un 422 (Entidad no procesable) que es más preciso para errores de validación
        // Esto detendrá la herramienta de intercepción (Burp Suite) al recibir el error.
        return res.status(422).send('Datos de servicio inválidos: ' + errores.array().map(e => e.msg).join(', '));
    }

    try {
        const { nombre_servicio, precio_base, tiempo_estimado_hrs } = req.body;

        const { error } = await supabase
            .from('servicios')
            .insert([
                {
                    nombre_servicio: xss(nombre_servicio.trim()),
                    precio_base: parseFloat(precio_base),
                    tiempo_estimado_hrs: parseFloat(tiempo_estimado_hrs)
                }
            ]);

        if (error) throw error;

        // Redirige a la URL completa para evitar errores 404
        res.redirect('/servicios');
    } catch (error) {
        console.error('[SERVICIOS CREATE ERROR]', error.message);
        res.status(500).send('Error al registrar el servicio');
    }
};