const supabase = require('../config/supabase');

exports.obtenerTickets = async (req, res) => {
    try {
        const empleadoId = req.cookies.usuarioId;
        if (!empleadoId) return res.redirect('/auth/login');

        const { data: perfil } = await supabase
            .from('perfiles')
            .select('nombre')
            .eq('id', empleadoId)
            .single();

        const { data: tickets, error } = await supabase
            .from('ordenes_trabajo')
            .select(`
                id,
                estatus_servicio,
                created_at,
                vehiculo,
                placa,
                id_servicio,
                servicios ( tiempo_estimado_hrs ),
                perfiles!ordenes_trabajo_id_cliente_fkey ( nombre )
            `)
            .eq('id_empleado_asignado', empleadoId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const ticketsProcesados = (tickets || []).map(t => {
            const servicioInfo = Array.isArray(t.servicios) ? t.servicios[0] : t.servicios;
            const horas = servicioInfo?.tiempo_estimado_hrs || 0;
            const fechaIngreso = new Date(t.created_at);
            const fechaEntrega = new Date(fechaIngreso.getTime() + (horas * 3600000));

            return {
                ...t,
                esperaHoras: horas,
                fechaEntregaFormateada: horas > 0 
                    ? fechaEntrega.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : 'Pendiente'
            };
        });

        // Clasificar tickets
        const ticketsActivos = ticketsProcesados.filter(t => t.estatus_servicio !== 'Entregado');
        const ticketsFinalizados = ticketsProcesados.filter(t => t.estatus_servicio === 'Entregado');

        res.render('empleado', { 
            tickets: ticketsActivos,
            ticketsFinalizados: ticketsFinalizados,
            usuarioRol: 'empleado', 
            empleado: {
                nombre: perfil?.nombre || 'Mecánico',
                idCorto: empleadoId.substring(0, 6).toUpperCase()
            }
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send('Error en el servidor');
    }
};

exports.actualizarEstatusTicket = async (req, res) => {
    try {
        const { ticketId, nuevoEstatus } = req.body;
        await supabase
            .from('ordenes_trabajo')
            .update({ estatus_servicio: nuevoEstatus })
            .eq('id', ticketId);
        
        // Redirigir a la ruta que maneja la vista del empleado
        res.redirect('/empleado/tickets'); 
    } catch (error) {
        res.status(500).send('Error al actualizar');
    }
};

exports.archivarTicket = async (req, res) => {
    try {
        const { ticketId } = req.body;
        const empleadoId = req.cookies.usuarioId;

        // Seguridad: Solo archivar si la orden es del empleado y está LISTO
        const { error } = await supabase
            .from('ordenes_trabajo')
            .update({ estatus_servicio: 'Entregado' })
            .eq('id', ticketId)
            .eq('id_empleado_asignado', empleadoId) // Asegura pertenencia
            .eq('estatus_servicio', 'Listo para entrega'); // Asegura estado

        if (error) throw error;

        res.redirect('/empleado');
    } catch (error) {
        console.error("Error al archivar ticket:", error);
        res.status(500).send('No se pudo archivar el registro');
    }
};