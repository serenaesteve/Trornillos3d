// La vista de componentes: enseña las piezas del framework y lleva a la app de ejemplo.
const estado = contenedor.querySelector("#kit-estado");
const formulario = contenedor.querySelector("#kit-formulario");

contenedor.querySelector("#abrir-productos").onclick = () => Telon.navegar("productos");

function enviar(evento) {
  evento.preventDefault();
  const nombre = contenedor.querySelector("#kit-nombre").value.trim();
  estado.textContent = nombre ? `Hola, ${nombre}` : "Falta el nombre";
  if (contenedor.querySelector("#kit-aviso").checked) Dispositivo.vibrar(30);
}
formulario.addEventListener("submit", enviar);

return () => formulario.removeEventListener("submit", enviar);
