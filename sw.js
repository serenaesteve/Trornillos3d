// Modo sin conexión. Con red, siempre lo último; sin red, lo que se guardó al instalar.
const CACHE = "telon-v5";
const ARCHIVOS = [
  "./", "index.html", "estilo.css", "manifest.webmanifest",
  "controlador.js", "componentes.js", "dispositivo.js",
  "js/tres.js", "vendor/three.module.min.js", "vendor/three.core.min.js",
  "js/motor/Recursos.js", "js/motor/Geometrias.js", "js/motor/Estudio.js", "js/motor/Entrada.js", "js/motor/Actor.js", "js/motor/Particulas.js", "js/motor/Camara.js",
  "js/motor/Escena.js", "js/motor/Motor.js", "js/motor/Sonido.js", "js/motor/Inspector.js",
  "js/juego/modelos.js", "js/juego/reglas.js", "js/juego/niveles.js", "js/juego/progreso.js", "js/juego/tinta.js", "js/juego/taller.js",
  "vistas/inicio.html", "vistas/laminas.html", "vistas/ajustes.html", "vistas/banco.html", "vistas/juego.html", "vistas/componentes.html", "vistas/productos.html",
  "controladores/inicio.js", "controladores/laminas.js", "controladores/ajustes.js", "controladores/banco.js", "controladores/juego.js", "controladores/componentes.js", "controladores/productos.js",
  "templates/badge.html", "templates/boton.html", "templates/cabecera.html", "templates/celda.html", "templates/checkbox.html", "templates/fila.html", "templates/formulario.html", "templates/grupo.html", "templates/input.html", "templates/interruptor.html", "templates/item.html", "templates/lamina.html", "templates/lista.html", "templates/menu.html", "templates/seccion.html", "templates/select.html", "templates/tabla.html", "templates/tarjeta.html", "templates/textarea.html", "templates/titulo.html",
  "fuentes/LilitaOne-400.woff2", "fuentes/Nunito.woff2",
  "iconos/icono.svg", "iconos/icono-192.png", "iconos/icono-512.png",
  ...Array.from({ length: 15 }, (_, i) => `iconos/niveles/${String(i + 1).padStart(2, "0")}.png`),
];

self.addEventListener("install", evento => {
  evento.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", evento => {
  evento.waitUntil(
    caches.keys()
      .then(nombres => Promise.all(nombres.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", evento => {
  const peticion = evento.request;
  if (peticion.method !== "GET" || new URL(peticion.url).origin !== location.origin) return;
  evento.respondWith(
    fetch(peticion)
      .then(respuesta => {
        if (respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(CACHE).then(cache => cache.put(peticion, copia));
        }
        return respuesta;
      })
      .catch(async () => (await caches.match(peticion, { ignoreSearch: true })) ?? new Response("", { status: 404 }))
  );
});
