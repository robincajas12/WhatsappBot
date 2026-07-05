// Este es un script de ejemplo para probar tu bot de WhatsApp.
// Recibe cualquier argumento que le envíes y lo imprime.

const args = process.argv.slice(2);
console.log("¡Hola desde el script de Node.js!");
if (args.length > 0) {
    console.log(`Argumentos recibidos: ${args.join(', ')}`);
} else {
    console.log("No se recibieron argumentos. Intenta ejecutar: !run saludo.js Robin");
}
