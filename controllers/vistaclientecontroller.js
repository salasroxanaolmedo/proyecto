const supabase = require('../config/supabase');

// Obtiene la lista de ordenes del cliente, busca su nombre para el header y renderiza la vista general.
exports.listarOrdenes = async (req, res) => {
    try {
        const { usuarioId, usuarioRol } = req.cookies;
        const estatus = req.query.estatus;

        let query = supabase
            .from('ordenes_trabajo')
            .select('id, estatus_servicio, estatus_pago, vehiculo, placa, fecha_entrega, created_at')
            .eq('id_cliente', usuarioId)
            .order('created_at', { ascending: false });

        if (estatus) {
            query = query.eq('estatus_servicio', estatus);
        }

        const { data: ordenes, error } = await query;

        if (error) throw error;

        const { data: cliente } = await supabase
            .from('perfiles')
            .select('nombre')
            .eq('id', usuarioId)
            .single();

        res.render('clienteOrdenes', { 
            ordenes: ordenes || [], 
            estatus,
            usuarioRol: usuarioRol || 'cliente', 
            cliente: cliente || { nombre: 'Cliente' } 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error del servidor');
    }
};

// Obtiene los detalles completos de una orden especifica, busca el nombre del cliente para el header y renderiza la vista de progreso.
exports.detalleOrden = async (req, res) => {
    try {
        const { usuarioId } = req.cookies;
        const { id } = req.params;

        const { data: orden, error } = await supabase
            .from('ordenes_trabajo')
            .select(`
                *,
                mecanico:perfiles!id_empleado_asignado ( nombre ),
                servicios ( tiempo_estimado_hrs )
            `)
            .eq('id', id)
            .eq('id_cliente', usuarioId)
            .single();

        if (error || !orden) return res.status(404).send('Orden no encontrada');

        // --- LÓGICA DE EXTRACCIÓN SEGURA ---
        // A veces Supabase devuelve [ {tiempo...} ] y otras {tiempo...}
        let horas = 0;
        if (orden.servicios) {
            if (Array.isArray(orden.servicios) && orden.servicios.length > 0) {
                horas = orden.servicios[0].tiempo_estimado_hrs;
            } else if (typeof orden.servicios === 'object') {
                horas = orden.servicios.tiempo_estimado_hrs;
            }
        }

        const fechaIngreso = new Date(orden.created_at);
        const fechaEntregaObj = new Date(fechaIngreso.getTime() + (horas * 3600000));

        const fechaEntregaFormateada = horas > 0 
            ? fechaEntregaObj.toLocaleString('es-MX', { 
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
              })
            : 'Pendiente de diagnóstico';

        // Traer nombre del cliente
        const { data: cliente } = await supabase
            .from('perfiles')
            .select('nombre')
            .eq('id', usuarioId)
            .single();

        res.render('vistacliente', { 
            orden: orden, 
            fechaEntregaCalculada: fechaEntregaFormateada,
            cliente: cliente || { nombre: 'Cliente' },
            usuarioRol: 'cliente'
        });

    } catch (err) {
        console.error("Error en detalleOrden:", err);
        res.status(500).send('Error del servidor');
    }
};