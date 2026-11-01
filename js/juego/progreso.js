// Persistencia del juego: sellos conseguidos y la partida en curso de cada lámina.
// Se guarda en cada jugada: un móvil puede cerrar la aplicación en cualquier momento sin avisar.
const Progreso = (() => {
  // La versión cambia cuando cambian los niveles: una partida antigua no vale para los nuevos.
  const CLAVE = "despiece.progreso.v2";

  function leer() {
    try {
      const datos = JSON.parse(localStorage.getItem(CLAVE) || "{}");
      return { sellos: datos.sellos ?? {}, enCurso: datos.enCurso ?? {} };
    } catch { return { sellos: {}, enCurso: {} }; }
  }

  let datos = leer();

  // Huella del nivel: si el nivel cambia, una partida guardada ya no vale, pero las estrellas sí.
  function huella(numero) {
    const nivel = Niveles.obtener(numero);
    const texto = nivel.tornillos.map(t => `${t.pieza}${t.pos}${t.color}`).join("|") + nivel.cajas.join("");
    let h = 5381;
    for (let i = 0; i < texto.length; i++) h = (Math.imul(h, 33) ^ texto.charCodeAt(i)) >>> 0;
    return h;
  }
  const esValida = (numero, guardada) => !!guardada && guardada.huella === huella(numero);

  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(datos)); }
    catch { /* Sin almacenamiento se puede jugar, pero el progreso dura solo esta sesión. */ }
  }

  return {
    sellos: numero => datos.sellos[numero] ?? 0,
    completada: numero => (datos.sellos[numero] ?? 0) > 0,
    desbloqueada: numero => numero === 1 || (datos.sellos[numero - 1] ?? 0) > 0,
    siguiente() {
      for (let n = 1; n <= Niveles.total; n++) if (!datos.sellos[n]) return n;
      return Niveles.total;
    },
    completar(numero, sellos) {
      datos.sellos[numero] = Math.max(datos.sellos[numero] ?? 0, sellos);
      delete datos.enCurso[numero];
      guardar();
    },
    guardarPartida(numero, partida) {
      datos.enCurso[numero] = { orden: partida.orden, ayudas: partida.ayudas, huella: huella(numero) };
      guardar();
    },
    esValida,
    partidaGuardada: numero => (esValida(numero, datos.enCurso[numero]) ? datos.enCurso[numero] : null),
    olvidarPartida(numero) { delete datos.enCurso[numero]; guardar(); },
    borrarTodo() { datos = { sellos: {}, enCurso: {} }; guardar(); },
  };
})();
