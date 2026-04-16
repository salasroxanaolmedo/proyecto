const mongoose = require('mongoose');

const ComentarioSchema = new mongoose.Schema({
    id_orden: { type: String, required: true },
    id_cliente: String,
    mensaje: { type: String, required: true },
    estrellas: { type: Number, min: 1, max: 5 }
}, { timestamps: true });

module.exports = mongoose.model('Comentario', ComentarioSchema);