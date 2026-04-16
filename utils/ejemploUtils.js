exports.formatearFechaCita = (fechaISO) => {
    const fecha = new Date(fechaISO);
    
    // Extraemos el día, mes y año
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear();
    
    // Devolvemos un formato DD/MM/YYYY
    return `${dia}/${mes}/${anio}`;
};

//utilidad para formatear fechas 
//estas se ponen en los controladores de la siguiente manera:
// const { formatearFechaCita } = require('../utils/ejemploUtils');

//luego un endpoint lo puede usar así:
// const fechaFormateada = formatearFechaCita(cita.fecha);
// res.json({ ...cita, fecha: fechaFormateada });