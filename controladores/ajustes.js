// Ajustes: gestión de las preferencias de la aplicación, con permisos solo cuando hacen falta.
const preferencias = Dispositivo.preferencias;
const sonido = contenedor.querySelector("#pref-sonido");
const vibracion = contenedor.querySelector("#pref-vibracion");
const inclinacion = contenedor.querySelector("#pref-inclinacion");
const marcas = contenedor.querySelector("#pref-marcas");
const calidad = contenedor.querySelector("#pref-calidad");
const aviso = contenedor.querySelector("#aviso-inclinacion");
const resumen = contenedor.querySelector("#resumen-progreso");
const borrar = contenedor.querySelector("#borrar");

sonido.checked = preferencias.sonido;
vibracion.checked = preferencias.vibracion;
inclinacion.checked = preferencias.inclinacion;
marcas.checked = preferencias.marcas;
calidad.checked = preferencias.calidadAuto;

marcas.onchange = () => Dispositivo.guardarPreferencia("marcas", marcas.checked);
calidad.onchange = () => Dispositivo.guardarPreferencia("calidadAuto", calidad.checked);
sonido.onchange = () => Dispositivo.guardarPreferencia("sonido", sonido.checked);
vibracion.onchange = () => {
  Dispositivo.guardarPreferencia("vibracion", vibracion.checked);
  Dispositivo.vibrar(30);
};
inclinacion.onchange = async () => {
  aviso.hidden = true;
  const concedido = inclinacion.checked ? await Dispositivo.pedirInclinacion() : false;
  if (inclinacion.checked && !concedido) {
    inclinacion.checked = false;
    aviso.textContent = "Este móvil no deja leer la inclinación, o el permiso se ha denegado.";
    aviso.hidden = false;
  }
  Dispositivo.guardarPreferencia("inclinacion", inclinacion.checked);
};

const textoInstalar = contenedor.querySelector("#texto-instalar");
const botonInstalar = contenedor.querySelector("#instalar");
function pintarInstalacion() {
  const { instalada, puede, iPhone } = Dispositivo.instalacion();
  botonInstalar.hidden = !puede;
  if (instalada) textoInstalar.textContent = "Ya está instalado. Funciona también sin conexión.";
  else if (puede) textoInstalar.textContent = "Tendrás el icono en tu móvil y podrás jugar sin conexión.";
  else if (iPhone) textoInstalar.textContent = "En Safari, toca Compartir y luego «Añadir a pantalla de inicio».";
  else textoInstalar.textContent = "En el menú del navegador, elige «Instalar aplicación» o «Añadir a pantalla de inicio».";
}
pintarInstalacion();
const dejarDeOirInstalacion = Dispositivo.alCambiarInstalacion(pintarInstalacion);
botonInstalar.onclick = () => Dispositivo.instalar();

function pintarResumen() {
  let completadas = 0;
  for (let n = 1; n <= Niveles.total; n++) if (Progreso.completada(n)) completadas++;
  resumen.textContent = `${completadas} de ${Niveles.total} niveles completados en este dispositivo.`;
}
pintarResumen();

// Es irreversible: el primer toque pide confirmación y se cancela solo a los 4 segundos.
let espera = null;
borrar.onclick = () => {
  if (!espera) {
    borrar.textContent = "Tócalo otra vez para borrar";
    espera = setTimeout(() => { espera = null; borrar.textContent = "Borrar el progreso"; }, 4000);
    return;
  }
  clearTimeout(espera);
  espera = null;
  Progreso.borrarTodo();
  borrar.textContent = "Borrar el progreso";
  pintarResumen();
};

return () => { clearTimeout(espera); dejarDeOirInstalacion(); };
