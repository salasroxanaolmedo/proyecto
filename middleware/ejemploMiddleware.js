exports.registrarPeticion = (req, res, next) => {
    const fecha = new Date().toLocaleTimeString();
    console.log(`[${fecha}] Petición recibida: ${req.method} a la ruta ${req.originalUrl}`);
    next(); 
};

//este middleware se puede usar para registrar cada petición que llega al servidor, lo que es útil para depuración y monitoreo.