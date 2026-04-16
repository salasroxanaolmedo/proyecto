const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EjemploSchema = new Schema({
    nombre: { 
        type: String, 
        required: true ,
        default: 'Ejemplo'
    },
    valor: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Ejemplo', EjemploSchema);