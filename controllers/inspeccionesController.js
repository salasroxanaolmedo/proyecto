const Inspeccion = require('../models/inspeccion');

// Obtiene inspecciones y renderiza
exports.obtenerInspecciones = async (req, res) => {
    try {
        const inspecciones = await Inspeccion.find().sort({ createdAt: -1 });
        res.render('gestionInspecciones', { inspecciones: inspecciones || [] });
    } catch (error) {
        console.error('Error en MongoDB:', error);
        res.status(500).send('Error al cargar las inspecciones técnicas');
    }
};

// Guarda una nueva inspección DINÁMICA
exports.agregarInspeccion = async (req, res) => {
    try {
        // Ahora recibimos 'revision_servicios' que es el array dinámico
        const { id_orden_sql, notas_mecanico, recomendaciones_futuras, revision_servicios } = req.body;

        const nuevaInspeccion = new Inspeccion({
            id_orden_sql,
            notas_mecanico,
            recomendaciones_futuras,
            revision_servicios // Esto guarda la lista de servicios que el mecánico revisó
        });

        await nuevaInspeccion.save();

        // Redirigir a donde necesites, por ejemplo al dashboard
        res.redirect('/servicios?msg=exito');
    } catch (error) {
        console.error("Error al guardar en NoSQL:", error);
        res.status(500).send('Error al registrar la inspección dinámica');
    }
};