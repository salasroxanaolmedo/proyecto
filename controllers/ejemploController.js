const supabase = require('../config/supabase');
//pedir datos a supabase solo declarar la instancia y pedir datos a supabase

exports.obtenerSucursales = async (req, res) => {
    try {
        const { data, error } = await supabase.from('sucursales').select('*');

        if (error) {
            return res.status(400).json({ error: error.message });
        }
        res.json(data);
    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};