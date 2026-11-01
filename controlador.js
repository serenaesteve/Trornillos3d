// Telón: navegación en carrusel, gestos, historial y modelo de estados de la aplicación.
//
// Contrato de una vista (el mismo de clase, ampliado):
//   vistas/<nombre>.html        la plantilla, con componentes ui-*
//   controladores/<nombre>.js   opcional; recibe `contenedor` y `parametros`
// El controlador puede devolver una función de limpieza o un objeto con
// { alPausar, alReanudar, alDestruir, ...lo que quiera exponer }.
const contenedor = document.querySelector("#contenedor");

const Telon = (() => {
  const VISTA_INICIAL = "inicio";
  const GESTO_MINIMO = 60;
  const MAX_ESTADOS = 40;

  let rutaActual = null;
  let vistaActual = null;
  let pantallaActual = null;
  let controladorActual = null;
  let navegacion = 0;
  let peticionActual = null;
  let animando = false;
  let pendiente = null;
  let profundidad = 0;
  let estado = "activo";
  const estados = [];

  function registrar(ambito, nombre, valor) {
    estados.push({ cuando: new Date().toLocaleTimeString("es"), ambito, nombre, estado: valor });
    if (estados.length > MAX_ESTADOS) estados.shift();
  }

  function botonesMenu() {
    return [...document.querySelectorAll(".navegacion-principal [data-url]")];
  }
  function indiceVista(nombre) {
    return botonesMenu().findIndex(b => b.dataset.url === nombre);
  }
  function actualizarMenu(nombre) {
    botonesMenu().forEach(b => {
      const activo = b.dataset.url === nombre;
      b.classList.toggle("activo", activo);
      if (activo) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
  }

  function aRuta(nombre, parametros = {}) {
    const consulta = new URLSearchParams(parametros).toString();
    return `#/${nombre}${consulta ? "?" + consulta : ""}`;
  }
  function deRuta(ruta) {
    const [nombre, consulta] = (ruta || "").replace(/^#\//, "").split("?");
    return {
      nombre: /^[a-z0-9_-]+$/i.test(nombre) ? nombre : VISTA_INICIAL,
      parametros: Object.fromEntries(new URLSearchParams(consulta || "")),
    };
  }

  // ---- Modelo de estados -------------------------------------------------------------
  function llamar(metodo) {
    if (!controladorActual?.[metodo]) return;
    try { controladorActual[metodo](); } catch (e) { console.error(e); }
  }
  function cambiarEstado(nuevo) {
    if (estado === nuevo) return;
    estado = nuevo;
    registrar("aplicación", "app", nuevo);
    if (nuevo === "pausa") llamar("alPausar");
    if (nuevo === "activo") llamar("alReanudar");
    document.documentElement.dataset.estado = nuevo;
  }
  function destruirVista() {
    if (!vistaActual) return;
    llamar("alDestruir");
    controladorActual = null;
    registrar("vista", vistaActual, "destruido");
  }
  document.addEventListener("visibilitychange", () => cambiarEstado(document.hidden ? "pausa" : "activo"));
  addEventListener("pagehide", () => { cambiarEstado("destruido"); destruirVista(); });
  addEventListener("pageshow", e => {
    // Algunos navegadores devuelven la página congelada: la vista ya se destruyó y hay que crearla.
    if (e.persisted) { estado = "activo"; registrar("aplicación", "app", "activo"); recargar(); }
  });

  // ---- Transición en carril ---------------------------------------------------------
  function esperarTransicion(carril) {
    return new Promise(resolve => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return resolve();
      let terminado = false;
      const terminar = () => {
        if (terminado) return;
        terminado = true;
        carril.removeEventListener("transitionend", alTerminar);
        clearTimeout(respaldo);
        resolve();
      };
      const alTerminar = e => { if (e.target === carril && e.propertyName === "transform") terminar(); };
      carril.addEventListener("transitionend", alTerminar);
      const respaldo = setTimeout(terminar, 650);
    });
  }

  function quitarArranque() {
    document.querySelector("#arranque")?.remove();
  }

  async function mover(anterior, nueva, haciaDerecha) {
    quitarArranque();
    const carril = document.createElement("div");
    carril.className = "carril-pantallas";
    if (!anterior) {
      carril.append(nueva);
      contenedor.replaceChildren(carril);
      return;
    }
    if (haciaDerecha) carril.append(anterior, nueva);
    else carril.append(nueva, anterior);
    contenedor.replaceChildren(carril);
    if (!haciaDerecha) carril.style.transform = "translate3d(-100%,0,0)";
    // Dos fotogramas para garantizar que el navegador registre la posición inicial.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    carril.classList.add("en-movimiento");
    carril.style.transform = haciaDerecha ? "translate3d(-100%,0,0)" : "translate3d(0,0,0)";
    await esperarTransicion(carril);
    destruirVista();
    anterior.remove();
    carril.classList.remove("en-movimiento");
    carril.style.transform = "";
  }

  function mostrarError(nombre) {
    quitarArranque();
    const aviso = document.createElement("div");
    aviso.className = "pantalla aviso-error";
    aviso.innerHTML = `<h1>Falta esta página del manual</h1>
      <p>No se ha podido abrir «${Componentes.escapar(nombre)}». Comprueba la conexión e inténtalo de nuevo.</p>
      <button type="button" class="boton boton-primario">Volver a intentarlo</button>`;
    aviso.querySelector("button").onclick = () => recargar();
    if (controladorActual) destruirVista();
    contenedor.replaceChildren(aviso);
    vistaActual = null;
    pantallaActual = null;
    rutaActual = null;
  }

  // ---- Carga de vistas ---------------------------------------------------------------
  async function cargar(ruta, { haciaDerecha = null } = {}) {
    if (animando) { pendiente = { ruta, haciaDerecha }; return; }
    if (ruta === rutaActual) return;
    const { nombre, parametros } = deRuta(ruta);
    const actual = ++navegacion;
    peticionActual?.abort();
    const peticion = new AbortController();
    peticionActual = peticion;
    try {
      const respuesta = await fetch(`vistas/${nombre}.html`, { signal: peticion.signal });
      if (!respuesta.ok) throw new Error(`Vista no encontrada: ${nombre}`);
      const html = await respuesta.text();
      if (actual !== navegacion) return;

      const nueva = document.createElement("div");
      nueva.className = "pantalla";
      nueva.innerHTML = html;
      await Componentes.renderizar(nueva);
      if (actual !== navegacion) return;

      const modulo = await fetch(`controladores/${nombre}.js`, { signal: peticion.signal });
      if (!modulo.ok && modulo.status !== 404) throw new Error("Error al cargar controlador");
      const codigo = modulo.ok ? await modulo.text() : null;
      if (actual !== navegacion) return;

      const anterior = pantallaActual;
      const derecha = haciaDerecha ?? esHaciaDerecha(nombre);
      animando = true;
      document.body.classList.toggle("sin-navegacion", !!nueva.querySelector("[data-pantalla-completa]"));
      actualizarMenu(nombre);
      await mover(anterior, nueva, derecha);

      pantallaActual = nueva;
      vistaActual = nombre;
      rutaActual = ruta;
      document.body.dataset.vista = nombre;
      registrar("vista", nombre, "activo");
      if (codigo !== null) iniciarControlador(nombre, codigo, nueva, parametros);
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error(error);
      if (actual === navegacion) mostrarError(nombre);
    } finally {
      if (actual === navegacion) {
        animando = false;
        if (pendiente) {
          const siguiente = pendiente;
          pendiente = null;
          cargar(siguiente.ruta, { haciaDerecha: siguiente.haciaDerecha });
        }
      }
    }
  }

  function esHaciaDerecha(nombre) {
    const destino = indiceVista(nombre);
    const origen = indiceVista(vistaActual);
    // Las vistas fuera del menú (el tablero de juego) son siempre "más adentro".
    if (destino < 0) return true;
    if (origen < 0) return false;
    return destino > origen;
  }

  function iniciarControlador(nombre, codigo, pantalla, parametros) {
    try {
      const iniciar = new Function("contenedor", "parametros", `${codigo}\n//# sourceURL=controladores/${nombre}.js`);
      const devuelto = iniciar(pantalla, parametros);
      // Una función sola sigue valiendo, como en el framework de clase.
      controladorActual = typeof devuelto === "function" ? { alDestruir: devuelto } : devuelto || null;
    } catch (e) {
      console.error("Error inicializando controlador:", e);
    }
  }

  // ---- Navegación pública ------------------------------------------------------------
  function navegar(nombre, parametros = {}) {
    const ruta = aRuta(nombre, parametros);
    if (ruta === rutaActual) return;
    history.pushState({ profundidad: ++profundidad }, "", ruta);
    return cargar(ruta);
  }
  function reemplazar(nombre, parametros = {}) {
    const ruta = aRuta(nombre, parametros);
    history.replaceState({ profundidad }, "", ruta);
    return cargar(ruta);
  }
  function volver(alternativa = VISTA_INICIAL) {
    if (profundidad > 0) history.back();
    else reemplazar(alternativa);
  }
  function recargar() {
    const ruta = location.hash || aRuta(VISTA_INICIAL);
    rutaActual = null;
    return cargar(ruta);
  }

  // El botón "atrás" de Android llega aquí.
  addEventListener("popstate", e => {
    const nueva = e.state?.profundidad ?? 0;
    const haciaDerecha = nueva > profundidad;
    profundidad = nueva;
    cargar(location.hash || aRuta(VISTA_INICIAL), { haciaDerecha });
  });

  document.addEventListener("click", e => {
    const boton = e.target.closest(".navegacion-principal [data-url]");
    if (!boton) return;
    e.preventDefault();
    navegar(boton.dataset.url);
  });

  // ---- Lo que un navegador móvil haría por su cuenta y estorba en una app --------------
  const esJuego = objetivo => objetivo?.closest?.("canvas, .mesa, .lamina, .navegacion-principal");
  // Mantener pulsado no abre el menú del navegador sobre el juego.
  document.addEventListener("contextmenu", e => { if (esJuego(e.target)) e.preventDefault(); });
  // Safari ignora touch-action para el pellizco: sin esto, ampliaría la página entera.
  document.addEventListener("gesturestart", e => { if (esJuego(e.target)) e.preventDefault(); });
  // Safari solo aplica :active si hay algún oyente táctil: es el hundido de los botones.
  document.addEventListener("touchstart", () => {}, { passive: true });

  // ---- Gesto de deslizar entre pestañas: en un móvil no hay clic, hay toque ----------
  let origenGesto = null;
  contenedor.addEventListener("pointerdown", e => {
    const bloqueado = e.target.closest("[data-sin-gesto], input, canvas");
    origenGesto = bloqueado ? null : { x: e.clientX, y: e.clientY, id: e.pointerId };
  });
  contenedor.addEventListener("pointercancel", () => { origenGesto = null; });
  // Un deslizamiento horizontal es nuestro. Si el navegador lo procesa, le aplica inercia,
  // y un toque justo después solo serviría para frenarla: el botón parecería no responder.
  contenedor.addEventListener("touchmove", e => {
    if (!origenGesto || e.touches.length !== 1) return;
    const dx = Math.abs(e.touches[0].clientX - origenGesto.x);
    const dy = Math.abs(e.touches[0].clientY - origenGesto.y);
    if (dx > 8 && dx > dy && e.cancelable) e.preventDefault();
  }, { passive: false });
  contenedor.addEventListener("pointerup", e => {
    if (!origenGesto || origenGesto.id !== e.pointerId) return;
    const dx = e.clientX - origenGesto.x;
    const dy = e.clientY - origenGesto.y;
    origenGesto = null;
    if (Math.abs(dx) < GESTO_MINIMO || Math.abs(dy) > Math.abs(dx) * 0.6) return;
    const botones = botonesMenu();
    const siguiente = botones[indiceVista(vistaActual) + (dx < 0 ? 1 : -1)];
    if (siguiente && indiceVista(vistaActual) >= 0) navegar(siguiente.dataset.url);
  });

  history.replaceState({ profundidad: 0 }, "", location.hash || aRuta(VISTA_INICIAL));
  registrar("aplicación", "app", "activo");
  document.documentElement.dataset.estado = "activo";
  cargar(location.hash);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(e => console.warn("Sin modo offline:", e.message));
  }

  return {
    navegar,
    reemplazar,
    volver,
    recargar,
    get estado() { return estado; },
    get estados() { return [...estados]; },
    get vista() { return vistaActual; },
    get controlador() { return controladorActual; },
    get ocupado() { return animando; },
  };
})();
