// Dispositivo: hardware del móvil y preferencias de la aplicación.
// Cada función comprueba antes si el navegador la permite: no todos los móviles tienen de todo.
const Dispositivo = (() => {
  const CLAVE = "telon.preferencias";
  const PREDETERMINADAS = { sonido: true, vibracion: true, inclinacion: false, marcas: false, calidadAuto: true };

  function leerPreferencias() {
    try { return { ...PREDETERMINADAS, ...JSON.parse(localStorage.getItem(CLAVE) || "{}") }; }
    catch { return { ...PREDETERMINADAS }; }
  }

  const preferencias = leerPreferencias();

  function guardarPreferencia(nombre, valor) {
    preferencias[nombre] = valor;
    try { localStorage.setItem(CLAVE, JSON.stringify(preferencias)); }
    catch { /* En modo privado no se guarda, pero sigue funcionando durante la sesión. */ }
  }

  function vibrar(patron) {
    if (!preferencias.vibracion || !navigator.vibrate) return false;
    try { return navigator.vibrate(patron); } catch { return false; }
  }

  async function pedirInclinacion() {
    if (typeof DeviceOrientationEvent === "undefined") return false;
    if (typeof DeviceOrientationEvent.requestPermission !== "function") return true;
    // iOS pide permiso, y solo lo acepta dentro de un gesto del usuario.
    try { return (await DeviceOrientationEvent.requestPermission()) === "granted"; }
    catch { return false; }
  }

  async function bateria() {
    if (!navigator.getBattery) return null;
    try {
      const b = await navigator.getBattery();
      return { nivel: Math.round(b.level * 100), cargando: b.charging };
    } catch { return null; }
  }

  // Mantiene la pantalla encendida: en un puzle se piensa sin tocar nada.
  let bloqueo = null;
  async function mantenerPantalla(activa) {
    if (!activa) {
      const anterior = bloqueo;
      bloqueo = null;
      try { await anterior?.release(); } catch { /* Ya estaba liberado. */ }
      return false;
    }
    if (bloqueo || !navigator.wakeLock) return !!bloqueo;
    try { bloqueo = await navigator.wakeLock.request("screen"); return true; }
    catch { return false; } // Batería baja o sin permiso: el juego sigue igual.
  }

  // Instalación: Android la ofrece con un aviso que se puede guardar; iPhone solo desde su menú.
  let avisoInstalar = null;
  const oyentesInstalar = new Set();
  addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    avisoInstalar = e;
    oyentesInstalar.forEach(f => f());
  });
  addEventListener("appinstalled", () => {
    avisoInstalar = null;
    oyentesInstalar.forEach(f => f());
  });
  function instalacion() {
    const instalada = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    const iPhone = /iP(hone|ad|od)/.test(navigator.userAgent);
    return { instalada, puede: !!avisoInstalar, iPhone };
  }
  async function instalar() {
    if (!avisoInstalar) return false;
    avisoInstalar.prompt();
    const { outcome } = await avisoInstalar.userChoice;
    avisoInstalar = null;
    oyentesInstalar.forEach(f => f());
    return outcome === "accepted";
  }
  const alCambiarInstalacion = funcion => { oyentesInstalar.add(funcion); return () => oyentesInstalar.delete(funcion); };

  function capacidades() {
    const lienzo = document.createElement("canvas");
    return [
      { nombre: "Pantalla táctil", disponible: navigator.maxTouchPoints > 0 },
      { nombre: "Vibrador", disponible: !!navigator.vibrate },
      { nombre: "Pantalla siempre encendida", disponible: !!navigator.wakeLock },
      { nombre: "Acelerómetro / orientación", disponible: typeof DeviceOrientationEvent !== "undefined" },
      { nombre: "Batería (lectura)", disponible: !!navigator.getBattery },
      { nombre: "Audio (Web Audio)", disponible: !!(window.AudioContext || window.webkitAudioContext) },
      { nombre: "Gráficos 3D (WebGL2)", disponible: !!lienzo.getContext("webgl2") },
      { nombre: "Modo sin conexión", disponible: "serviceWorker" in navigator && isSecureContext },
      { nombre: "Almacenamiento local", disponible: (() => { try { return !!window.localStorage; } catch { return false; } })() },
    ];
  }

  return { preferencias, guardarPreferencia, vibrar, pedirInclinacion, bateria, capacidades, mantenerPantalla, instalacion, instalar, alCambiarInstalacion };
})();
