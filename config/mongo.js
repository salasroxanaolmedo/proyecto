const mongoose = require('mongoose');

const dbConnectMongo = async () => {
    try {
    //Conexion a MONGO DB con proccess .env 
        await mongoose.connect(process.env.DB_MONGO);
        console.log('Conectado a MongoDB exitosamente');
    } catch (error) {
        console.error('Error en conexion a MongoDB:', error.message);
        process.exit(1); 
    }
};

module.exports = dbConnectMongo;