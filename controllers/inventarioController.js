const { body, param, validationResult } = require('express-validator');
const xss = require('xss');

// ==========================================
// Validadores para rutas de inventario
// ==========================================
exports.validarProducto = [
    body('nombre_producto')
        .trim()
        .notEmpty().withMessage('El nombre del producto es obligatorio.')
        .isLength({ max: 200 }).withMessage('Nombre demasiado largo.'),
    body('cantidad_stock')
        .optional({ checkFalsy: true })
        .isInt({ min: 0 }).withMessage('El stock debe ser un número entero positivo.'),
    body('precio_unitario')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo.')
];

// ==========================================
// Muestra la lista de productos
// ==========================================
const supabase = require('../config/supabase');

exports.mostrarInventario = async (req, res) => {
    try {
        const { data: productos, error } = await supabase
            .from('inventario')
            .select('*')
            .order('nombre_producto', { ascending: true });

        if (error) throw error;

        res.render('inventario', {
            productos: productos || [],
            exito: req.query.exito || null,
            errorMsg: req.query.error || null
        });
    } catch (e) {
        console.error('[INVENTARIO ERROR]', e.message);
        res.render('inventario', { productos: [], errorMsg: 'No se pudo cargar el inventario.' });
    }
};

// Crear nuevo producto
exports.crearProducto = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.redirect('/inventario?error=' + encodeURIComponent(errores.array()[0].msg));
    }

    try {
        const { nombre_producto, cantidad_stock, precio_unitario } = req.body;

        const { error } = await supabase.from('inventario').insert([{
            nombre_producto: xss(nombre_producto.trim()),
            cantidad_stock: parseInt(cantidad_stock) || 0,
            precio_unitario: parseFloat(precio_unitario) || 0
        }]);

        if (error) throw error;

        res.redirect('/inventario?exito=Producto agregado correctamente.');
    } catch (e) {
        console.error('[INVENTARIO CREATE ERROR]', e.message);
        res.redirect('/inventario?error=No se pudo agregar el producto.');
    }
};

// Actualizar un producto existente
exports.editarProducto = async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.redirect('/inventario?error=' + encodeURIComponent(errores.array()[0].msg));
    }

    try {
        const { id } = req.params;
        const { nombre_producto, cantidad_stock, precio_unitario } = req.body;

        // A01: Validar que el id sea un UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.redirect('/inventario?error=ID de producto no válido.');
        }

        const { error } = await supabase.from('inventario').update({
            nombre_producto: xss(nombre_producto.trim()),
            cantidad_stock: parseInt(cantidad_stock) || 0,
            precio_unitario: parseFloat(precio_unitario) || 0
        }).eq('id', id);

        if (error) throw error;

        res.redirect('/inventario?exito=Producto actualizado correctamente.');
    } catch (e) {
        console.error('[INVENTARIO UPDATE ERROR]', e.message);
        res.redirect('/inventario?error=No se pudo actualizar el producto.');
    }
};

// Eliminar un producto
exports.eliminarProducto = async (req, res) => {
    try {
        const { id } = req.params;

        // A01: Validar UUID para no permitir manipulación de parámetros
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
            return res.redirect('/inventario?error=ID de producto no válido.');
        }

        const { error } = await supabase.from('inventario').delete().eq('id', id);

        if (error) throw error;

        res.redirect('/inventario?exito=Producto eliminado correctamente.');
    } catch (e) {
        console.error('[INVENTARIO DELETE ERROR]', e.message);
        res.redirect('/inventario?error=No se pudo eliminar el producto.');
    }
};
