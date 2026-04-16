const mongoose = require('mongoose');

const HistorialSchema = new mongoose.Schema({
    id_orden: { type: String, required: true },
    pasos: [{
        estado: String,
        fecha: { type: Date, default: Date.now },
        nota: String
    }]
});

module.exports = mongoose.model('Historial', HistorialSchema);