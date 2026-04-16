const inputTexto = document.getElementById('inputBusqueda');
const radiosRol = document.querySelectorAll('input[name="filtroRol"]');
const contenedor = document.getElementById('contenedorLista');

// Función principal de búsqueda
const ejecutarBusqueda = async () => {
    const texto = inputTexto.value;
    const rolSeleccionado = document.querySelector('input[name="filtroRol"]:checked').value;

    try {
        // Enviamos ambos parámetros al servidor internamente
        const url = `/auth/usuarios?buscar=${texto}&rol=${rolSeleccionado}`;
        const response = await fetch(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        const html = await response.text();

        // Extraemos solo el fragmento de la tabla para no refrescar toda la página
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const nuevaTabla = doc.getElementById('contenedorLista').innerHTML;

        contenedor.innerHTML = nuevaTabla;
    } catch (error) {
        console.error('Error en la búsqueda en vivo:', error);
    }
};

// Escuchar cuando el usuario escribe
inputTexto.addEventListener('input', ejecutarBusqueda);

// Escuchar cuando el usuario cambia el filtro de rol
radiosRol.forEach(radio => {
    radio.addEventListener('change', ejecutarBusqueda);
});