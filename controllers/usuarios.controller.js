const supabase = require('../config/supabase');
const xss = require('xss');

// Obtiene la lista de perfiles, aplica filtros de búsqueda y renderiza la vista de gestión
exports.obtenerUsuarios = async (req, res) => {
    try {
        // Sanitizar parámetros de búsqueda (A03 - Injection)
        const busqueda = xss((req.query.buscar || '').trim().substring(0, 100));
        const campo = req.query.campo || 'todos';

        let query = supabase
            .from('perfiles')
            .select('*')
            .order('updated_at', { ascending: false });

        if (busqueda) {
            if (campo === 'nombre') {
                query = query.ilike('nombre', `%${busqueda}%`);
            } else if (campo === 'rol') {
                query = query.ilike('rol', `%${busqueda}%`);
            } else if (campo === 'email') {
                query = query.or(`email.ilike.%${busqueda}%,usuario_acceso.ilike.%${busqueda}%`);
            } else if (campo === 'telefono') {
                query = query.ilike('telefono', `%${busqueda}%`);
            } else {
                // Buscar en todos los campos compatibles
                query = query.or(
                    `nombre.ilike.%${busqueda}%,rol.ilike.%${busqueda}%,email.ilike.%${busqueda}%,usuario_acceso.ilike.%${busqueda}%,telefono.ilike.%${busqueda}%`
                );
            }
        }

        const { data: usuarios, error } = await query;

        if (error) throw error;

        res.render('gestionUsuarios', {
            usuarios: usuarios || [],
            busquedaActual: busqueda,
            campoActual: campo
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener los usuarios');
    }
};