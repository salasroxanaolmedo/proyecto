const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InspeccionSchema = new Schema({
    id_orden: { 
        type: String, 
        required: true,
        unique: true 
    },
    notas_mecanico: { 
        type: String, 
        default: 'Sin observaciones' 
    },
    recomendaciones_futuras: { 
        type: String, 
        default: 'Ninguna por ahora' 
    },
    
    // LISTA DINÁMICA DE REVISIÓN
    revision_servicios: [{
        nombre_servicio: String, 
        estado: { 
            type: String, 
            enum: ['OK', 'Atención Necesaria', 'Urgente', 'No revisado'], 
            default: 'No revisado' 
        },
        comentarios: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('Inspeccion', InspeccionSchema);