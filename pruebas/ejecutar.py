#!/usr/bin/env python3
"""
Pruebas de Telón y Despiece en un navegador real, con un móvil emulado.

    python3 pruebas/ejecutar.py              # todas, en Chromium
    python3 pruebas/ejecutar.py --capturas   # además, regenera capturas/
    python3 pruebas/ejecutar.py --metricas   # además, escribe pruebas/metricas.json

Necesita Playwright (pip install playwright; playwright install chromium).
"""
import functools
import http.server
import json
import re
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parent.parent
CAPTURAS = RAIZ / "capturas"
ARGUMENTOS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
HACER_CAPTURAS = "--capturas" in sys.argv
ESCRIBIR_METRICAS = "--metricas" in sys.argv

resultados = []
metricas = {}


def comprobar(nombre, condicion, detalle=""):
    resultados.append((nombre, bool(condicion), detalle))
    print(("  ok   " if condicion else "  FALLO ") + nombre + (f"  [{detalle}]" if detalle else ""))


class Silencioso(http.server.SimpleHTTPRequestHandler):
    peticiones = []

    def log_message(self, *args):
        pass

    def do_GET(self):
        Silencioso.peticiones.append(self.path)
        super().do_GET()


def servir():
    manejador = functools.partial(Silencioso, directory=str(RAIZ))
    servidor = http.server.ThreadingHTTPServer(("127.0.0.1", 0), manejador)
    threading.Thread(target=servidor.serve_forever, daemon=True).start()
    return servidor


# ---- Sin navegador -------------------------------------------------------------------------
def pruebas_estaticas():
    print("Estructura del proyecto")
    prohibidas = re.compile(r"tornillo|l[aá]mina|bandeja|ping[uü]ino|despiece|molino", re.I)
    sin_comentarios = lambda texto: re.sub(r"/\*.*?\*/|//[^\n]*", "", texto, flags=re.S)
    sucios = [str(f.relative_to(RAIZ)) for f in (RAIZ / "js/motor").glob("*.js") if prohibidas.search(sin_comentarios(f.read_text()))]
    comprobar("js/motor no conoce el juego", not sucios, ", ".join(sucios))

    for carpeta in ["vistas", "controladores", "templates"]:
        comprobar(f"existe {carpeta}/", (RAIZ / carpeta).is_dir())

    codigo_sw = (RAIZ / "sw.js").read_text()
    lista = re.search(r"const ARCHIVOS = \[(.*?)\];", codigo_sw, re.S).group(1)
    declarados = set(re.findall(r'"([^"]+)"', lista)) - {"./", "0"}
    declarados |= {f"iconos/niveles/{n:02d}.png" for n in range(1, 16)}
    faltan_disco = [a for a in declarados if not (RAIZ / a).exists()]
    comprobar("todo lo precacheado existe", not faltan_disco, ", ".join(faltan_disco))
    reales = set()
    for patron in ["vistas/*", "controladores/*", "templates/*", "js/**/*.js", "fuentes/*", "vendor/*.js", "iconos/*", "iconos/niveles/*", "*.js", "*.css", "*.webmanifest", "*.html"]:
        for f in RAIZ.glob(patron):
            relativo = str(f.relative_to(RAIZ))
            if f.is_file() and relativo != "sw.js":
                reales.add(relativo)
    faltan_lista = sorted(reales - declarados)
    comprobar("todo lo necesario está precacheado", not faltan_lista, ", ".join(faltan_lista))


# ---- Reglas, sin dibujar -------------------------------------------------------------------
JS_REGLAS = r"""
() => {
  const salida = {};
  const nivelPrueba = {
    numero: 0, modelo: "x", bandeja: 2,
    cajas: [0, 1],
    solucion: [0, 1, 2, 3, 4, 5],
    tornillos: [
      { id: 0, pieza: "a", color: 0, bloqueadoPor: [], tapadoPor: [] },
      { id: 1, pieza: "a", color: 0, bloqueadoPor: [], tapadoPor: [] },
      { id: 2, pieza: "a", color: 0, bloqueadoPor: [], tapadoPor: [] },
      { id: 3, pieza: "b", color: 1, bloqueadoPor: ["a"], tapadoPor: ["a"] },
      { id: 4, pieza: "b", color: 1, bloqueadoPor: ["a"], tapadoPor: [] },
      { id: 5, pieza: "b", color: 1, bloqueadoPor: [], tapadoPor: [] },
    ],
  };
  const P = Reglas.Partida;
  let p = new P(nivelPrueba);
  salida.tapado = p.quitar(3).motivo === "tapado";
  salida.ocultoAlInicio = p.oculto(3) && !p.oculto(4);
  p.quitar(0); p.quitar(1);
  const r = p.quitar(2);
  salida.piezaCae = r.eventos.some(e => e.tipo === "pieza-cae" && e.pieza === "a");
  salida.cajaLlena = r.eventos.some(e => e.tipo === "caja-completa" && e.caja === 0);
  salida.yaLibre = p.libre(3);
  p.quitar(3); p.quitar(4); p.quitar(5);
  salida.gana = p.estado === "ganada";
  salida.noRepite = new P(nivelPrueba, [0]).quitar(0).motivo === "retirado";

  // Cinco cajas: solo las cuatro primeras están abiertas, así que la quinta tinta va a la bandeja.
  const dosHuecos = {
    numero: 0, modelo: "x", bandeja: 2, cajas: [0, 1, 2, 3, 4],
    solucion: [],
    tornillos: [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4].map((color, id) => ({ id, pieza: "p" + id, color, bloqueadoPor: [], tapadoPor: [] })),
  };
  let q = new P(dosHuecos);
  q.quitar(12);
  salida.aBandeja = q.bandeja.length === 1;
  salida.sigueConHueco = q.estado === "jugando";
  q.quitar(0); q.quitar(1); q.quitar(2);
  salida.saltaDesdeBandeja = q.bandeja.length === 0 && q.cajas[4].tornillos.includes(12);

  let m = new P(dosHuecos);
  m.quitar(12); m.quitar(13);
  salida.pierdeAlLlenar = m.estado === "perdida" && m.bandeja.length === 2;
  salida.noSeJuegaAlTerminar = m.quitar(0).motivo === "terminada";
  salida.ignoraDatosAntiguos = new P(dosHuecos, [999, 12]).orden.length === 1;

  const pinguino = Modelos.obtener("pinguino");
  const bajoGorro = pinguino.anclajes.find(a => a.pieza === "cabeza" && a.normal[1] === 1);
  const bloqueos = Reglas.calcularBloqueos(pinguino, bajoGorro);
  salida.bloqueoGeometrico = bloqueos.bloqueadoPor.includes("gorro") && bloqueos.tapadoPor.includes("gorro");

  // Todas las láminas.
  salida.laminas = [];
  const azar = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let n = 1; n <= Niveles.total; n++) {
    const nivel = Niveles.obtener(n);
    const def = Niveles.definicion(n);
    const final = new P(nivel, nivel.solucion);
    const inicio = performance.now();
    const solucion = Reglas.resolver(new P(nivel));
    const msResolver = performance.now() - inicio;
    const piezas = new Set(nivel.tornillos.map(t => t.pieza));
    const r = azar(n * 97);
    let ganaAzar = 0, ganaAtento = 0;
    const PARTIDAS = 300;
    for (let i = 0; i < PARTIDAS; i++) {
      for (const atento of [false, true]) {
        const b = new P(nivel);
        while (b.estado === "jugando") {
          const jugadas = b.libres().filter(id => b.comprobar(id).ok);
          if (!jugadas.length) break;
          const buenas = jugadas.filter(id => b.cajaPara(b.tornillos.get(id).color));
          const lista = atento && buenas.length ? buenas : jugadas;
          b.quitar(lista[Math.floor(r() * lista.length)]);
        }
        if (b.estado === "ganada") atento ? ganaAtento++ : ganaAzar++;
      }
    }
    const huerfanas = Modelos.obtener(nivel.modelo).piezas.filter(p => !piezas.has(p.id)).map(p => p.id);
    salida.laminas.push({
      n, modelo: def.modelo, tornillos: nivel.tornillos.length, colores: new Set(nivel.cajas).size, bandeja: nivel.bandeja,
      resuelta: final.estado === "ganada", picoSolucion: final.picoBandeja,
      solver: !!solucion, msResolver: Math.round(msResolver),
      multiploDeTres: nivel.tornillos.length % 3 === 0, huerfanas,
      tapados: nivel.tornillos.filter(t => t.bloqueadoPor.length).length,
      azar: Math.round(ganaAzar / PARTIDAS * 100), atento: Math.round(ganaAtento / PARTIDAS * 100),
    });
  }
  const det1 = JSON.stringify(Niveles.obtener(5).cajas);
  salida.determinista = det1 === JSON.stringify(Niveles.obtener(5).cajas);
  return salida;
}
"""


def pruebas_reglas(pagina):
    print("Reglas del juego")
    s = pagina.evaluate(JS_REGLAS)
    for clave in ["tapado", "ocultoAlInicio", "piezaCae", "cajaLlena", "yaLibre", "gana", "noRepite", "aBandeja", "sigueConHueco",
                  "saltaDesdeBandeja", "pierdeAlLlenar", "noSeJuegaAlTerminar", "ignoraDatosAntiguos", "bloqueoGeometrico", "determinista"]:
        comprobar(clave, s[clave])
    print("Láminas")
    print("   n  modelo     torn tint band tapados  pico  azar%  atento%  ms")
    for l in s["laminas"]:
        print(f"  {l['n']:2d}  {l['modelo']:9s} {l['tornillos']:4d} {l['colores']:4d} {l['bandeja']:4d} {l['tapados']:7d} {l['picoSolucion']:5d} {l['azar']:6d} {l['atento']:8d} {l['msResolver']:4d}")
    comprobar("todas tienen solución de construcción", all(l["resuelta"] for l in s["laminas"]))
    comprobar("el buscador las resuelve todas", all(l["solver"] for l in s["laminas"]))
    comprobar("tornillos múltiplos de 3", all(l["multiploDeTres"] for l in s["laminas"]))
    comprobar("ninguna pieza sin tornillo", all(not l["huerfanas"] for l in s["laminas"]))
    comprobar("cada nivel es un juguete distinto", len({l["modelo"] for l in s["laminas"]}) == 15)
    # Se admite un pequeño margen: son 300 partidas simuladas, no una cifra exacta.
    for clave, nombre in (("azar", "al azar"), ("atento", "con atención")):
        subidas = [l["n"] for a, l in zip(s["laminas"], s["laminas"][1:]) if l[clave] > a[clave] + 6]
        comprobar(f"la dificultad sube en cada nivel jugando {nombre}", not subidas, f"niveles más fáciles que el anterior: {subidas}")
    metricas["laminas"] = s["laminas"]


# ---- Interacción ---------------------------------------------------------------------------
JS_FRENTE = """
(id) => {
  const j = Telon.controlador, c = j.escena.camara;
  const t = j.partida.tornillos.get(id);
  const n = new THREE.Vector3(...t.normal).add(new THREE.Vector3(0.12, 0.16, 0.1));
  const a = c.angulosHacia(n);
  c.inercia.theta = c.inercia.phi = 0;
  c.theta = a.theta; c.phi = a.phi; c.zoom = 1; c.encuadrarDistancia(); c.aplicar();
  return j.taller.pantallaDe(id);
}
"""


def esperar_vista(pagina, nombre):
    pagina.wait_for_function("n => Telon.vista === n && !Telon.ocupado && (document.querySelector('canvas') === null || Telon.controlador)", arg=nombre, timeout=20000)


def capturar(pagina, nombre):
    if HACER_CAPTURAS:
        CAPTURAS.mkdir(exist_ok=True)
        pagina.screenshot(path=str(CAPTURAS / f"{nombre}.png"))


def tocar_tornillo(pagina, id_):
    p = pagina.evaluate(JS_FRENTE, id_)
    pagina.wait_for_timeout(60)
    pagina.touchscreen.tap(p["x"], p["y"])
    pagina.wait_for_timeout(40)


def pruebas_interaccion(pagina, contexto, base, errores):
    print("Navegación del framework")
    esperar_vista(pagina, "inicio")
    pagina.wait_for_timeout(1800)
    capturar(pagina, "01-portada")
    comprobar("arranca en la portada", pagina.evaluate("Telon.vista") == "inicio")

    pagina.touchscreen.tap(*centro(pagina, ".navegacion-principal [data-url=laminas]"))
    esperar_vista(pagina, "laminas")
    capturar(pagina, "02-indice")
    comprobar("menú abre Láminas", pagina.evaluate("location.hash") == "#/laminas")
    comprobar("lámina 2 cerrada al empezar", pagina.locator("[data-lamina='02']").is_disabled())

    deslizar(pagina, 330, 500, 60, 500)
    esperar_vista(pagina, "ajustes")
    comprobar("deslizar pasa a la pestaña siguiente", pagina.evaluate("Telon.vista") == "ajustes")
    capturar(pagina, "03-ajustes")
    deslizar(pagina, 60, 500, 330, 500)
    esperar_vista(pagina, "laminas")
    comprobar("deslizar al revés vuelve", pagina.evaluate("Telon.vista") == "laminas")

    pagina.go_back()
    esperar_vista(pagina, "ajustes")
    comprobar("el botón atrás recorre el historial", pagina.evaluate("Telon.vista") == "ajustes")
    pagina.evaluate("Telon.navegar('laminas')")
    esperar_vista(pagina, "laminas")

    pagina.evaluate("Telon.navegar('no-existe')")
    pagina.wait_for_selector(".aviso-error", timeout=8000)
    comprobar("una vista inexistente muestra un error útil", pagina.locator(".aviso-error h1").is_visible())
    errores.clear()  # El 404 de esa vista era lo que se buscaba.
    pagina.evaluate("Telon.navegar('laminas')")
    esperar_vista(pagina, "laminas")

    print("Juego: lámina 1 con toques reales")
    pagina.touchscreen.tap(*centro(pagina, "[data-lamina='01']"))
    esperar_vista(pagina, "juego")
    pagina.wait_for_timeout(500)
    capturar(pagina, "04-mesa-inicio")
    solucion = pagina.evaluate("Niveles.obtener(1).solucion")

    # Un arrastre gira la cámara y no saca nada.
    antes = pagina.evaluate("Telon.controlador.escena.camara.theta")
    arrastrar_lienzo(pagina)
    despues = pagina.evaluate("Telon.controlador.escena.camara.theta")
    comprobar("arrastrar gira el modelo", abs(antes - despues) > 0.05)
    comprobar("arrastrar no saca tornillos", pagina.evaluate("Telon.controlador.partida.orden.length") == 0)

    # El bloqueo se avisa: un tornillo tapado no sale, y se dice por qué.
    bloqueado = pagina.evaluate("""() => {
      const p = Telon.controlador.partida;
      return Telon.controlador.partida.nivel.tornillos.find(t => !p.libre(t.id))?.id ?? null;
    }""")
    if bloqueado is not None:
        r = pagina.evaluate("id => Telon.controlador.jugar(id).motivo", bloqueado)
        comprobar("un tornillo tapado se rechaza", r == "tapado")
        comprobar("se avisa de qué lo tapa", "Lo tapa" in pagina.inner_text("#nota"))

    # Reposo: sin nada que cambiar, el motor no dibuja. Primero se deja acabar la inercia del giro,
    # que depende de los fotogramas por segundo: en las pruebas se dibuja por software, muy despacio.
    pagina.wait_for_function("""() => {
      const e = Telon.controlador.escena;
      return !e.necesitaDibujo() && Math.abs(e.camara.inercia.theta) <= 1e-4 && Math.abs(e.camara.inercia.phi) <= 1e-4;
    }""", timeout=60000)
    pagina.wait_for_timeout(300)
    a = pagina.evaluate("Telon.controlador.motor.estadisticas.dibujos")
    pagina.wait_for_timeout(1000)
    b = pagina.evaluate("Telon.controlador.motor.estadisticas")
    comprobar("en reposo no se dibuja", a == b["dibujos"], f"{b['dibujos'] - a} dibujos en 1 s, {b['fps']} fps de bucle")
    metricas["reposo_dibujos_por_segundo"] = b["dibujos"] - a

    fallos_toque = []
    for indice, id_ in enumerate(solucion):
        tocar_tornillo(pagina, id_)
        if id_ not in pagina.evaluate("[...Telon.controlador.partida.retirados]"):
            fallos_toque.append(id_)
            pagina.evaluate("id => Telon.controlador.jugar(id)", id_)
        if indice == 3:
            pagina.wait_for_timeout(200)
            capturar(pagina, "05-mesa-jugando")
    comprobar("cada toque saca exactamente el tornillo tocado", not fallos_toque, f"fallaron {fallos_toque}")
    comprobar("la partida se gana", pagina.evaluate("Telon.controlador.partida.estado") == "ganada")
    pagina.wait_for_selector("#veredicto:not([hidden])", timeout=8000)
    pagina.wait_for_timeout(900)
    capturar(pagina, "06-despiece-final")
    comprobar("aparece el veredicto", pagina.locator("#veredicto h2").is_visible())
    comprobar("los sellos se guardan", pagina.evaluate("Progreso.sellos(1)") >= 1)

    pagina.locator("#veredicto-acciones .boton-primario").click()
    pagina.wait_for_function("Telon.vista === 'juego' && !Telon.ocupado && Telon.controlador?.partida?.nivel.numero === 2", timeout=15000)
    comprobar("Siguiente abre el nivel 2", True)

    print("Estados de la aplicación")
    orden = pagina.evaluate("Niveles.obtener(2).solucion.slice(0, 4)")
    for id_ in orden:
        pagina.evaluate("id => Telon.controlador.jugar(id)", id_)
    # Se simula que el sistema envía la aplicación a segundo plano.
    pagina.evaluate("""() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    }""")
    pagina.wait_for_timeout(50)
    comprobar("en segundo plano pasa a pausa", pagina.evaluate("Telon.estado") == "pausa")
    a = pagina.evaluate("Telon.controlador.motor.estadisticas.fotogramas")
    pagina.wait_for_timeout(400)
    comprobar("en pausa el bucle se detiene", a == pagina.evaluate("Telon.controlador.motor.estadisticas.fotogramas"))
    pagina.evaluate("""() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    }""")
    pagina.wait_for_timeout(150)
    comprobar("al volver pasa a activo", pagina.evaluate("Telon.estado") == "activo")
    comprobar("al volver el bucle sigue", pagina.evaluate("Telon.controlador.motor.estadisticas.fotogramas") > a)

    pagina.reload()
    pagina.wait_for_function("Telon.vista === 'juego' && !Telon.ocupado && Telon.controlador?.partida", timeout=20000)
    comprobar("tras cerrar la app la partida sigue donde estaba", pagina.evaluate("Telon.controlador.partida.orden") == orden)

    pagina.evaluate("document.querySelector('#deshacer').click()")
    comprobar("deshacer retira la última jugada", len(pagina.evaluate("Telon.controlador.partida.orden")) == len(orden) - 1)
    comprobar("deshacer cuenta como ayuda", pagina.evaluate("Telon.controlador.partida.ayudas") == 1)
    pagina.evaluate("document.querySelector('#pista').click()")
    pagina.wait_for_timeout(700)
    comprobar("la pista marca un tornillo", pagina.evaluate("!!Telon.controlador.taller.marca"))
    pagina.evaluate("document.querySelector('#reiniciar').click()")
    comprobar("empezar de nuevo vacía la partida", pagina.evaluate("Telon.controlador.partida.orden.length") == 0)
    tapados = pagina.evaluate("""() => {
      const j = Telon.controlador;
      return j.partida.nivel.tornillos.filter(t => j.partida.oculto(t.id)).every(t => !j.taller.tornillos.get(t.id).datos.cuerpo.visible);
    }""")
    comprobar("los tornillos tapados no se ven", tapados)
    comprobar("empezar de nuevo devuelve todas las piezas", pagina.evaluate("[...Telon.controlador.taller.piezas.values()].every(a => a.objeto.visible)"))

    print("Atasco")
    pagina.evaluate("for (let n = 1; n < 9; n++) Progreso.completar(n, 1); Telon.reemplazar('juego', { lamina: 9 })")
    pagina.wait_for_function("Telon.vista === 'juego' && !Telon.ocupado && Telon.controlador?.partida?.nivel.numero === 9", timeout=15000)
    atasco = pagina.evaluate("""() => {
      const j = Telon.controlador;
      for (let semilla = 0; semilla < 400; semilla++) {
        const prueba = new Reglas.Partida(j.partida.nivel);
        let x = semilla * 31 + 7;
        const azar = () => (x = (x * 1664525 + 1013904223) >>> 0) / 4294967296;
        while (prueba.estado === 'jugando') {
          const malas = prueba.libres().filter(id => prueba.comprobar(id).ok);
          const fuera = malas.filter(id => !prueba.cajaPara(prueba.tornillos.get(id).color));
          const lista = fuera.length ? fuera : malas;
          prueba.quitar(lista[Math.floor(azar() * lista.length)]);
        }
        if (prueba.estado === 'perdida') return prueba.orden;
      }
      return null;
    }""")
    comprobar("se puede llegar a un atasco", atasco is not None)
    if atasco:
        for id_ in atasco:
            pagina.evaluate("id => Telon.controlador.jugar(id)", id_)
        pagina.wait_for_selector("#veredicto.perdida:not([hidden])", timeout=4000)
        pagina.wait_for_timeout(500)
        capturar(pagina, "07-atasco")
        comprobar("el atasco se explica", "No queda sitio" in pagina.inner_text("#veredicto h2"))
        pagina.locator("#veredicto-acciones .boton-primario").click()
        comprobar("deshacer sale del atasco", pagina.evaluate("Telon.controlador.partida.estado") == "jugando")
        comprobar("el veredicto se cierra", pagina.locator("#veredicto").is_hidden())
        pagina.evaluate("document.querySelector('#reiniciar').click()")

    print("Partidas guardadas")
    comprobar("una partida de una versión anterior del nivel se descarta", pagina.evaluate("Progreso.esValida(9, { orden: [1], ayudas: 0 }) === false && Progreso.esValida(9, { orden: [1], ayudas: 0, huella: 1 }) === false"))
    pagina.evaluate("Progreso.guardarPartida(9, Telon.controlador.partida)")
    comprobar("una partida del nivel actual se conserva", pagina.evaluate("Progreso.partidaGuardada(9) !== null"))

    print("Calidad y ayudas")
    pagina.evaluate("Telon.controlador.motor.bajarCalidad()")
    pagina.wait_for_timeout(250)
    comprobar("bajar la calidad quita las sombras sin romper nada", pagina.evaluate("Telon.controlador.motor.sombras") is False)
    pagina.evaluate("Dispositivo.guardarPreferencia('marcas', true); Telon.reemplazar('juego', { lamina: 8 })")
    pagina.wait_for_function("Telon.vista === 'juego' && !Telon.ocupado && Telon.controlador?.partida?.nivel.numero === 8", timeout=15000)
    pagina.wait_for_timeout(400)
    comprobar("las marcas por color cambian la cabeza", pagina.evaluate("[...new Set(Telon.controlador.partida.nivel.tornillos.map(t => Tinta.marcaDe(t.color)))].length") > 1)
    capturar(pagina, "11-marcas-por-color")
    pagina.evaluate("Dispositivo.guardarPreferencia('marcas', false); Telon.reemplazar('juego', { lamina: 9 })")
    pagina.wait_for_function("Telon.vista === 'juego' && !Telon.ocupado && Telon.controlador?.partida?.nivel.numero === 9", timeout=15000)

    print("Inspector de escena")
    pagina.evaluate("document.querySelector('#inspeccionar').click()")
    pagina.wait_for_timeout(600)
    capturar(pagina, "08-inspector")
    arbol = pagina.locator(".inspector-arbol li").count()
    comprobar("muestra el árbol de escena", arbol > 15, f"{arbol} nodos")
    comprobar("muestra coordenadas", "local" in pagina.inner_text(".inspector-arbol"))
    metricas["inspector_lamina9"] = pagina.evaluate("Telon.controlador.motor.estadisticas")
    pagina.evaluate("document.querySelector('#inspeccionar').click()")

    print("Sensores y hardware, simulados")
    pagina.evaluate("""() => {
      window.__vibraciones = 0;
      Object.defineProperty(navigator, 'vibrate', { configurable: true, value: () => { window.__vibraciones++; return true; } });
    }""")
    libre = pagina.evaluate("Telon.controlador.partida.libres().find(id => Telon.controlador.partida.cajaPara(Telon.controlador.partida.tornillos.get(id).color)) ?? Telon.controlador.partida.libres()[0]")
    pagina.evaluate("id => Telon.controlador.jugar(id)", libre)
    comprobar("sacar un tornillo hace vibrar", pagina.evaluate("window.__vibraciones") >= 1)
    pagina.evaluate("document.querySelector('#reiniciar').click()")
    pagina.evaluate("""() => {
      window.__osciladores = 0;
      const Contexto = window.AudioContext || window.webkitAudioContext;
      const original = Contexto.prototype.createOscillator;
      Contexto.prototype.createOscillator = function () { window.__osciladores++; return original.call(this); };
    }""")
    p_ = pagina.evaluate("(() => { const j = Telon.controlador; const id = j.taller.masVisible(j.partida) ?? j.partida.libres()[0]; const a = j.escena.camara.angulosHacia(new THREE.Vector3(...j.partida.tornillos.get(id).normal).add(new THREE.Vector3(.1,.15,.1))); const c = j.escena.camara; c.inercia.theta = c.inercia.phi = 0; c.theta = a.theta; c.phi = a.phi; c.aplicar(); return j.taller.pantallaDe(id); })()")
    pagina.wait_for_timeout(80)
    pagina.touchscreen.tap(p_["x"], p_["y"])
    pagina.wait_for_timeout(300)
    comprobar("tocar un tornillo genera sonido", pagina.evaluate("window.__osciladores") >= 1, f"{pagina.evaluate('window.__osciladores')} osciladores")
    pagina.evaluate("document.querySelector('#reiniciar').click()")
    pagina.evaluate("Dispositivo.guardarPreferencia('inclinacion', true); Telon.reemplazar('juego', { lamina: 8 })")
    pagina.wait_for_function("Telon.vista === 'juego' && !Telon.ocupado && Telon.controlador?.partida?.nivel.numero === 8", timeout=15000)
    pagina.evaluate("dispatchEvent(new DeviceOrientationEvent('deviceorientation', { beta: 80, gamma: 30 }))")
    comprobar("inclinar el móvil gira la cámara", abs(pagina.evaluate("Telon.controlador.escena.camara.desvio.theta")) > 0.1)
    pagina.evaluate("Dispositivo.guardarPreferencia('inclinacion', false)")
    pagina.evaluate("for (let i = 0; i < 4; i++) Telon.controlador.motor.vigilarRendimiento(10)")
    comprobar("si va lento, el motor quita las sombras solo", pagina.evaluate("Telon.controlador.motor.sombras") is False)
    pagina.evaluate("for (let i = 0; i < 4; i++) Telon.controlador.motor.vigilarRendimiento(10)")
    comprobar("si sigue lento, baja la resolución", pagina.evaluate("Telon.controlador.motor.densidadMaxima") == 1)
    cdp = contexto.new_cdp_session(pagina)
    manifiesto = cdp.send("Page.getAppManifest")
    instalable = cdp.send("Page.getInstallabilityErrors").get("installabilityErrors", [])
    cdp.detach()
    comprobar("el manifiesto no tiene errores", not manifiesto.get("errors"), str(manifiesto.get("errors"))[:160])
    # Las sesiones de prueba son de incógnito, y ahí Chromium nunca ofrece instalar: no cuenta como fallo.
    errores_pwa = [e["errorId"] for e in instalable if e["errorId"] != "in-incognito"]
    comprobar("Chromium la considera instalable", not errores_pwa, ", ".join(errores_pwa))
    metricas["instalabilidad"] = [e["errorId"] for e in instalable]

    print("Framework: otra app, sin juego")
    pagina.evaluate("Telon.navegar('componentes')")
    esperar_vista(pagina, "componentes")
    pagina.wait_for_timeout(200)
    capturar(pagina, "12-kit-componentes")
    comprobar("no queda ningún ui-* sin convertir", pagina.evaluate("[...document.querySelectorAll('.pantalla *')].filter(n => n.localName.startsWith('ui-')).length") == 0)
    comprobar("las tablas conservan filas y cabeceras", pagina.evaluate("document.querySelectorAll('#kit-tabla tbody tr').length === 3 && document.querySelectorAll('#kit-tabla thead th').length === 2"))
    pagina.fill("#kit-nombre", "Serena")
    pagina.evaluate("document.querySelector('#kit-formulario').requestSubmit()")
    comprobar("el formulario responde", "Serena" in pagina.inner_text("#kit-estado"))
    usadas = set(pagina.evaluate("Componentes.pedidas"))
    comprobar("el kit usa las 17 plantillas de clase", {"badge","boton","cabecera","celda","checkbox","fila","formulario","grupo","input","item","lista","menu","select","tabla","tarjeta","textarea","titulo"} <= usadas, str(sorted(usadas)))
    pagina.locator("#abrir-productos").click()
    esperar_vista(pagina, "productos")
    pagina.wait_for_selector("#tabla-productos", timeout=8000)
    pagina.fill("#nombreproducto", "Tornillo de prueba")
    pagina.locator("#anadeproducto").click()
    comprobar("la vista de clase, sin cambios, añade productos", "Tornillo de prueba" in pagina.inner_text("#tabla-productos"))
    capturar(pagina, "13-productos-de-clase")
    pagina.evaluate("Telon.navegar('laminas')")
    esperar_vista(pagina, "laminas")
    pagina.evaluate("Telon.navegar('productos')")
    esperar_vista(pagina, "productos")
    pagina.wait_for_selector("#tabla-productos", timeout=8000)
    comprobar("y al volver siguen guardados", "Tornillo de prueba" in pagina.inner_text("#tabla-productos"))
    pagina.evaluate("localStorage.removeItem('productos')")

    print("Banco de pruebas: el motor sin el juego")
    pagina.evaluate("Telon.reemplazar('banco')")
    esperar_vista(pagina, "banco")
    pagina.wait_for_timeout(700)
    pagina.evaluate("for (let i = 0; i < 5; i++) Telon.controlador.soltarBloque()")
    pagina.wait_for_timeout(900)
    capturar(pagina, "09-banco-motor")
    comprobar("el motor funciona sin el juego", pagina.evaluate("Telon.controlador.escena.buscar('bloque').length") >= 6)
    comprobar("lista los estados de la aplicación", "activo" in pagina.inner_text("#lista-estados"))
    comprobar("detecta el hardware", "Vibrador" in pagina.inner_text("#lista-capacidades"))

    print("Sin conexión")
    pagina.evaluate("Telon.reemplazar('laminas')")
    esperar_vista(pagina, "laminas")
    pagina.evaluate("navigator.serviceWorker.ready")
    pagina.wait_for_function("navigator.serviceWorker.controller !== null", timeout=15000)
    contexto.set_offline(True)
    pagina.reload()
    pagina.wait_for_function("Telon.vista === 'laminas' && !Telon.ocupado", timeout=20000)
    comprobar("arranca sin red", True)
    pagina.evaluate("Telon.navegar('juego', { lamina: 1 })")
    pagina.wait_for_function("Telon.vista === 'juego' && !Telon.ocupado && Telon.controlador?.partida", timeout=20000)
    comprobar("se puede jugar sin red", pagina.evaluate("Telon.controlador.partida.estado") == "jugando")
    contexto.set_offline(False)

    print("Componentes")
    Silencioso.peticiones.clear()
    pagina.evaluate("Telon.navegar('ajustes')")
    esperar_vista(pagina, "ajustes")
    pagina.evaluate("Telon.navegar('laminas')")
    esperar_vista(pagina, "laminas")
    pagina.evaluate("Telon.navegar('ajustes')")
    esperar_vista(pagina, "ajustes")
    plantillas = [p for p in Silencioso.peticiones if "/templates/" in p]
    metricas["plantillas_pedidas_navegando"] = len(plantillas)
    metricas["componentes_peticiones"] = pagina.evaluate("Componentes.peticiones")
    comprobar("cada plantilla se pide una sola vez", len(plantillas) == len(set(plantillas)), f"{plantillas}")


def centro(pagina, selector):
    caja = pagina.locator(selector).first.bounding_box()
    return caja["x"] + caja["width"] / 2, caja["y"] + caja["height"] / 2


def deslizar(pagina, x0, y0, x1, y1):
    cdp = pagina.context.new_cdp_session(pagina)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x0, "y": y0}]})
    for i in range(1, 7):
        cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x0 + (x1 - x0) * i / 6, "y": y0 + (y1 - y0) * i / 6}]})
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    cdp.detach()


def arrastrar_lienzo(pagina):
    caja = pagina.locator("#lienzo").bounding_box()
    x, y = caja["x"] + caja["width"] * 0.8, caja["y"] + caja["height"] * 0.5
    deslizar(pagina, x, y, x - 120, y + 10)
    pagina.wait_for_timeout(100)


# ---- Cada tornillo se puede tocar ------------------------------------------------------------
JS_ALCANCE = """
async () => {
  const j = Telon.controlador;
  return { numero: j.partida.nivel.numero };
}
"""


def pruebas_alcance(pagina):
    print("Alcance: en todas las láminas, cada tornillo libre se puede tocar")
    pagina.evaluate("Progreso.borrarTodo(); for (let n = 1; n < Niveles.total; n++) Progreso.completar(n, 1);")
    total = 0
    fallos = []
    for n in range(1, 16):
        pagina.evaluate("n => { Progreso.olvidarPartida(n); return Telon.reemplazar('juego', { lamina: n }); }", n)
        pagina.wait_for_function("n => Telon.vista === 'juego' && !Telon.ocupado && Telon.controlador?.partida?.nivel.numero === n", arg=n, timeout=20000)
        pagina.wait_for_timeout(120)
        r = pagina.evaluate("""async () => {
          const j = Telon.controlador, nivel = j.partida.nivel;
          const fallos = [];
          const frames = () => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
          for (const id of nivel.solucion) {
            const p = j.partida, c = j.escena.camara;
            const t = p.tornillos.get(id);
            // Las piezas ya caídas no deben estorbar: se termina su caída.
            j.taller.sincronizar(p);
            // Como haría una persona: desde el frente y, si otra pieza estorba, girando un poco.
            const giros = [[.12, .16, .1], [.6, .6, .1], [-.6, .6, .1], [.1, .6, .6], [.1, .6, -.6], [.9, .2, .9], [-.9, .2, .9], [.9, .2, -.9], [-.9, .2, -.9]];
            let alcanzado = false;
            for (const g of giros) {
              const a = c.angulosHacia(new THREE.Vector3(...t.normal).add(new THREE.Vector3(...g)));
              c.inercia.theta = c.inercia.phi = 0; c.theta = a.theta; c.phi = a.phi; c.zoom = 1; c.encuadrarDistancia(); c.aplicar();
              await frames();
              const pos = j.taller.pantallaDe(id);
              const n = j.motor.entrada.aNormalizado(pos.x, pos.y);
              if (j.taller.elegir(n.x, n.y, p) === id) { alcanzado = true; break; }
            }
            if (!alcanzado) fallos.push({ id, pieza: t.pieza });
            j.jugar(id);
          }
          return { fallos, total: nivel.solucion.length, estado: j.partida.estado };
        }""")
        total += r["total"]
        fallos += [dict(f, lamina=n) for f in r["fallos"]]
        comprobar(f"lámina {n:02d} terminada con su solución", r["estado"] == "ganada", f"{len(r['fallos'])} sin alcanzar de {r['total']}")
    metricas["alcance"] = {"total": total, "fallos": len(fallos)}
    comprobar("todos los tornillos alcanzables", not fallos, json.dumps(fallos[:8], ensure_ascii=False))
    pagina.wait_for_selector("#veredicto:not([hidden])", timeout=8000)
    pagina.wait_for_timeout(700)
    capturar(pagina, "10-dinosaurio-desplegado")
    pagina.evaluate("Progreso.borrarTodo()")


# En cada paso de la partida, todo tornillo libre debe verse desde algún ángulo. Un rayo desde la
# cámara hasta la cabeza no puede cruzar ninguna pieza, adornos incluidos. Se comprueba siguiendo
# la solución y dos órdenes al azar: el jugador no tiene por qué seguir ninguno concreto.
JS_VISIBLES = r"""
(semilla) => {
  const j = Telon.controlador, nivel = j.partida.nivel, c = j.escena.camara;
  const giros = [[.12,.16,.1],[.6,.6,.1],[-.6,.6,.1],[.1,.6,.6],[.1,.6,-.6],[.9,.2,.9],[-.9,.2,.9],[.9,.2,-.9],[-.9,.2,-.9],
    [.1,0,.1],[.5,-.5,.1],[-.5,-.5,.1],[.1,-.5,.5],[.1,-.5,-.5]];
  const rayo = new THREE.Raycaster(), cabeza = new THREE.Vector3();
  let x = semilla * 7919 + 13;
  const azar = () => (x = (x * 1664525 + 1013904223) >>> 0) / 4294967296;
  const visible = (p, id) => {
    const t = p.tornillos.get(id), actor = j.taller.tornillos.get(id);
    const mallas = [];
    for (const pieza of j.taller.piezas.values()) {
      if (pieza.objeto.visible) for (const m of pieza.objeto.children) if (m.isMesh && !m.userData.interno) mallas.push(m);
    }
    for (const g of giros) {
      const a = c.angulosHacia(new THREE.Vector3(...t.normal).add(new THREE.Vector3(...g)));
      c.inercia.theta = c.inercia.phi = 0; c.theta = a.theta; c.phi = a.phi; c.zoom = 1; c.encuadrarDistancia(); c.aplicar();
      actor.datos.cuerpo.getWorldPosition(cabeza);
      cabeza.addScaledVector(new THREE.Vector3(...t.normal), actor.datos.tamano * 0.6);
      const origen = c.objeto.position.clone(), direccion = cabeza.clone().sub(origen), distancia = direccion.length();
      rayo.set(origen, direccion.normalize());
      const impacto = rayo.intersectObjects(mallas, false)[0];
      if (!impacto || impacto.distance >= distancia - 0.02) return true;
    }
    return false;
  };
  const p = new Reglas.Partida(nivel);
  const ocultos = new Map();
  for (let paso = 0; paso < nivel.solucion.length && p.estado === "jugando"; paso++) {
    j.taller.sincronizar(p);
    j.escena.grafo.updateMatrixWorld(true);
    for (const id of p.libres()) if (!visible(p, id)) ocultos.set(id, p.tornillos.get(id).pieza);
    const buenas = p.libres().filter(id => p.cajaPara(p.tornillos.get(id).color));
    const siguiente = semilla === 0 ? nivel.solucion[paso] : (buenas.length ? buenas : p.libres())[Math.floor(azar() * (buenas.length || p.libres().length))];
    p.quitar(siguiente);
  }
  j.taller.sincronizar(j.partida);
  return [...ocultos].map(([id, pieza]) => `${id}:${pieza}`);
}
"""


def pruebas_visibles(pagina):
    print("Visibilidad: en cada jugada, todo tornillo libre se ve desde algún ángulo")
    pagina.evaluate("Progreso.borrarTodo(); for (let n = 1; n < Niveles.total; n++) Progreso.completar(n, 1);")
    fallos = {}
    for n in range(1, 16):
        pagina.evaluate("n => Telon.reemplazar('juego', { lamina: n })", n)
        pagina.wait_for_function("n => Telon.vista === 'juego' && !Telon.ocupado && Telon.controlador?.partida?.nivel.numero === n", arg=n, timeout=20000)
        ocultos = set()
        for semilla in (0, 1, 2):
            ocultos |= set(pagina.evaluate(JS_VISIBLES, semilla))
        if ocultos:
            fallos[n] = sorted(ocultos)
        comprobar(f"nivel {n:02d} sin tornillos escondidos", not ocultos, ", ".join(sorted(ocultos))[:160])
    metricas["escondidos"] = fallos
    pagina.evaluate("Progreso.borrarTodo()")


# ---- Móvil ------------------------------------------------------------------------------------
PANTALLAS = [("iPhone SE 1", 320, 568), ("Android pequeño", 360, 640), ("iPhone SE 3", 375, 667), ("iPhone 14", 390, 844),
             ("Pixel 7", 412, 915), ("iPhone Pro Max", 430, 932), ("Plegable", 280, 653), ("Horizontal pequeño", 667, 375),
             ("Horizontal grande", 932, 430), ("Tablet", 768, 1024)]

JS_ENCAJE = r"""
() => {
  const W = innerWidth, H = innerHeight, sale = [], pequenos = [];
  const visible = e => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden') return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  for (const e of document.querySelectorAll('button, input, select, textarea, .hueco, .caja, canvas')) {
    if (!visible(e)) continue;
    const r = e.getBoundingClientRect();
    const hoja = e.closest('.pantalla');
    const conScroll = hoja && hoja.scrollHeight > hoja.clientHeight + 1;
    if (r.left < -1 || r.right > W + 1 || (!conScroll && (r.top < -1 || r.bottom > H + 1))) sale.push((e.id || e.className || e.tagName) + '');
    if (e.matches('button') && (r.width < 44 || r.height < 44)) pequenos.push((e.id || e.dataset.lamina || e.className || 'boton') + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
  }
  const hoja = document.querySelector('.pantalla'), lienzo = document.querySelector('#lienzo');
  return { sale, pequenos, scrollX: hoja ? hoja.scrollWidth - hoja.clientWidth : 0, lienzo: lienzo ? [lienzo.clientWidth, lienzo.clientHeight] : null };
}
"""
JS_TOCAR = """
() => {
  const j = Telon.controlador, c = j.escena.camara;
  const id = j.partida.libres()[0], t = j.partida.tornillos.get(id);
  const a = c.angulosHacia(new THREE.Vector3(...t.normal).add(new THREE.Vector3(.12, .16, .1)));
  c.inercia.theta = c.inercia.phi = 0; c.theta = a.theta; c.phi = a.phi; c.aplicar();
  j.escena.grafo.updateMatrixWorld(true);
  return { id, ...j.taller.pantallaDe(id) };
}
"""


def contexto_movil(navegador, ancho, alto, calidad_auto=False):
    contexto = navegador.new_context(viewport={"width": ancho, "height": alto}, device_scale_factor=2, is_mobile=True, has_touch=True, locale="es-ES")
    contexto.add_init_script("localStorage.getItem('telon.preferencias') || localStorage.setItem('telon.preferencias', JSON.stringify({ calidadAuto: %s }))" % ("true" if calidad_auto else "false"))
    return contexto


def abrir_nivel(pagina, n):
    pagina.evaluate("n => { for (let i = 1; i < n; i++) Progreso.completar(i, 1); return Telon.navegar('juego', { lamina: n }); }", n)
    pagina.wait_for_function("n => Telon.vista === 'juego' && !Telon.ocupado && Telon.controlador?.partida?.nivel.numero === n", arg=n, timeout=30000)
    pagina.wait_for_timeout(300)


def pruebas_movil(navegador, base):
    print("Móvil: diez tamaños de pantalla")
    for nombre, ancho, alto in PANTALLAS:
        contexto = contexto_movil(navegador, ancho, alto)
        pagina = contexto.new_page()
        pagina.goto(base)
        pagina.wait_for_function("typeof Telon !== 'undefined' && Telon.vista === 'inicio' && !Telon.ocupado", timeout=30000)
        comprobar(f"{nombre}: la pantalla de carga desaparece", pagina.locator("#arranque").count() == 0)
        problemas = []
        for vista in ["inicio", "laminas", "ajustes", "banco", "componentes"]:
            pagina.evaluate("v => Telon.navegar(v)", vista)
            pagina.wait_for_function("v => Telon.vista === v && !Telon.ocupado", arg=vista, timeout=15000)
            pagina.wait_for_timeout(150)
            r = pagina.evaluate(JS_ENCAJE)
            problemas += [f"{vista}: {k}={r[k]}" for k in ("sale", "pequenos", "scrollX") if r[k]]
        abrir_nivel(pagina, 15)
        r = pagina.evaluate(JS_ENCAJE)
        problemas += [f"juego: {k}={r[k]}" for k in ("sale", "pequenos", "scrollX") if r[k]]
        comprobar(f"{nombre}: todo cabe y los botones miden 44 px o más", not problemas, "; ".join(problemas)[:300])
        comprobar(f"{nombre}: el juguete tiene sitio", min(r["lienzo"]) >= 240, f"lienzo {r['lienzo']}")
        objetivo = pagina.evaluate(JS_TOCAR)
        pagina.wait_for_timeout(80)
        pagina.touchscreen.tap(objetivo["x"], objetivo["y"])
        pagina.wait_for_timeout(80)
        comprobar(f"{nombre}: un toque saca el tornillo", objetivo["id"] in pagina.evaluate("[...Telon.controlador.partida.retirados]"))
        if HACER_CAPTURAS and (ancho, alto) in ((667, 375), (320, 568), (768, 1024)):
            pagina.wait_for_timeout(500)
            capturar(pagina, f"15-pantalla-{ancho}x{alto}")
        contexto.close()

    print("Móvil: pantallas de atasco y de victoria")
    JS_VEREDICTO = """() => {
      const v = document.querySelector('#veredicto').getBoundingClientRect();
      const botones = [...document.querySelectorAll('#veredicto-acciones button')].map(b => b.getBoundingClientRect());
      const fuera = r => r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1;
      const lienzo = document.querySelector('#lienzo');
      return { fuera: fuera(v) || botones.some(fuera), botones: botones.length, bajos: botones.filter(b => b.height < 44).length, lienzo: [lienzo.clientWidth, lienzo.clientHeight] };
    }"""
    for ancho, alto in ((667, 375), (320, 568), (280, 653)):
        contexto = contexto_movil(navegador, ancho, alto)
        pagina = contexto.new_page()
        pagina.goto(base)
        pagina.wait_for_function("typeof Telon !== 'undefined' && Telon.vista === 'inicio' && !Telon.ocupado", timeout=30000)
        abrir_nivel(pagina, 9)
        pagina.evaluate("""() => {
          const j = Telon.controlador;
          while (j.partida.estado === 'jugando') {
            const libres = j.partida.libres();
            const malos = libres.filter(id => !j.partida.cajaPara(j.partida.tornillos.get(id).color));
            j.jugar((malos.length ? malos : libres)[0]);
          }
        }""")
        pagina.wait_for_selector("#veredicto.perdida:not([hidden])", timeout=8000)
        pagina.wait_for_timeout(600)
        r = pagina.evaluate(JS_VEREDICTO)
        comprobar(f"{ancho}x{alto}: el atasco cabe y se puede pulsar", not r["fuera"] and r["botones"] == 2 and not r["bajos"] and min(r["lienzo"]) >= 120, str(r))
        if ancho == 667:
            capturar(pagina, "16-atasco-horizontal")
        pagina.evaluate("document.querySelector('#veredicto-acciones button:last-child').click()")
        pagina.evaluate("(() => { const j = Telon.controlador; for (const id of j.partida.nivel.solucion) j.jugar(id); })()")
        pagina.wait_for_selector("#veredicto.ganada:not([hidden])", timeout=60000)
        pagina.wait_for_timeout(600)
        r = pagina.evaluate(JS_VEREDICTO)
        comprobar(f"{ancho}x{alto}: la victoria cabe y se puede pulsar", not r["fuera"] and r["botones"] >= 1 and not r["bajos"] and min(r["lienzo"]) >= 120, str(r))
        if ancho == 667:
            capturar(pagina, "17-victoria-horizontal")
        contexto.close()

    print("Móvil: comportamiento real")
    contexto = contexto_movil(navegador, 390, 844)
    pagina = contexto.new_page()
    pagina.add_init_script("""window.__bloqueos = 0; window.__liberados = 0;
      Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: async () => { window.__bloqueos++; return { release: async () => { window.__liberados++; } }; } } });""")
    pagina.goto(base)
    pagina.wait_for_function("typeof Telon !== 'undefined' && Telon.vista === 'inicio' && !Telon.ocupado", timeout=30000)
    estilos = pagina.evaluate("(() => { const b = getComputedStyle(document.body); return [b.userSelect || b.webkitUserSelect, getComputedStyle(document.documentElement).touchAction]; })()")
    comprobar("el texto de la app no se selecciona", estilos[0] == "none")
    abrir_nivel(pagina, 6)
    comprobar("jugando, la pantalla no se apaga", pagina.evaluate("window.__bloqueos") == 1)
    menu = pagina.evaluate("(() => { const e = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); document.querySelector('#lienzo').dispatchEvent(e); return e.defaultPrevented; })()")
    comprobar("mantener pulsado no abre el menú del navegador", menu)

    # Girar el móvil a media partida: el juguete se reencuadra y los toques siguen acertando.
    pagina.set_viewport_size({"width": 844, "height": 390})
    pagina.wait_for_timeout(500)
    objetivo = pagina.evaluate(JS_TOCAR)
    pagina.wait_for_timeout(80)
    pagina.touchscreen.tap(objetivo["x"], objetivo["y"])
    pagina.wait_for_timeout(100)
    comprobar("al girar el móvil, los toques siguen acertando", objetivo["id"] in pagina.evaluate("[...Telon.controlador.partida.retirados]"))
    pagina.set_viewport_size({"width": 390, "height": 844})
    pagina.wait_for_timeout(400)

    # Pellizco con dos dedos reales.
    caja = pagina.locator("#lienzo").bounding_box()
    cx, cy = caja["x"] + caja["width"] / 2, caja["y"] + caja["height"] / 2
    antes = pagina.evaluate("Telon.controlador.escena.camara.zoom")
    retirados = pagina.evaluate("Telon.controlador.partida.orden.length")
    cdp = contexto.new_cdp_session(pagina)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": cx - 30, "y": cy, "id": 1}, {"x": cx + 30, "y": cy, "id": 2}]})
    for i in range(1, 8):
        cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": cx - 30 - i * 12, "y": cy, "id": 1}, {"x": cx + 30 + i * 12, "y": cy, "id": 2}]})
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    cdp.detach()
    pagina.wait_for_timeout(150)
    comprobar("pellizcar acerca el juguete", pagina.evaluate("Telon.controlador.escena.camara.zoom") < antes)
    comprobar("pellizcar no saca tornillos", pagina.evaluate("Telon.controlador.partida.orden.length") == retirados)

    # El sistema le quita la tarjeta gráfica a la app, como al cambiar de aplicación.
    pagina.evaluate("window.__extension = Telon.controlador.motor.renderizador.getContext().getExtension('WEBGL_lose_context'); window.__extension.loseContext()")
    pagina.wait_for_timeout(300)
    comprobar("si pierde la tarjeta gráfica, se detiene sin fallar", pagina.evaluate("Telon.controlador.motor.corriendo") is False)
    entorno_antes = pagina.evaluate("Telon.controlador.escena.grafo.environment.uuid")
    pagina.evaluate("window.__extension.restoreContext()")
    pagina.wait_for_function("Telon.controlador.motor.corriendo === true", timeout=8000)
    pagina.wait_for_timeout(500)
    comprobar("al recuperarla, rehace los reflejos", pagina.evaluate("Telon.controlador.escena.grafo.environment.uuid") != entorno_antes)
    pintado = pagina.evaluate("""(() => {
      const m = Telon.controlador.motor, gl = m.renderizador.getContext();
      m.escena.dibujar(m.renderizador);
      const c = gl.canvas, pixeles = new Uint8Array(c.width * c.height * 4);
      gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, pixeles);
      let n = 0; for (let i = 3; i < pixeles.length; i += 4) if (pixeles[i]) n++;
      return n;
    })()""")
    comprobar("y vuelve a dibujar el juguete", pintado > 1000, f"{pintado} píxeles")

    # En segundo plano se libera la pantalla; al volver, se recupera.
    pagina.evaluate("""() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }""")
    pagina.wait_for_timeout(100)
    comprobar("en segundo plano libera la pantalla", pagina.evaluate("window.__liberados") == 1)
    pagina.evaluate("""() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); }""")
    pagina.wait_for_timeout(100)
    comprobar("al volver la recupera", pagina.evaluate("window.__bloqueos") == 2)

    # Instalar: se simula el aviso que da Android.
    pagina.evaluate("Telon.navegar('ajustes')")
    pagina.wait_for_function("Telon.vista === 'ajustes' && !Telon.ocupado", timeout=15000)
    comprobar("sin aviso del navegador, explica cómo instalar", "Añadir a pantalla de inicio" in pagina.inner_text("#texto-instalar"))
    pagina.evaluate("""() => {
      const aviso = new Event('beforeinstallprompt', { cancelable: true });
      aviso.prompt = () => { window.__instalar = true; };
      aviso.userChoice = Promise.resolve({ outcome: 'accepted' });
      dispatchEvent(aviso);
    }""")
    comprobar("en Android aparece el botón de instalar", pagina.locator("#instalar").is_visible())
    pagina.locator("#instalar").click()
    pagina.wait_for_timeout(100)
    comprobar("el botón lanza la instalación", pagina.evaluate("window.__instalar") is True)
    contexto.close()

    # Un móvil lento: la calidad baja sola, se recuerda, y no se mide durante el reposo.
    contexto = contexto_movil(navegador, 390, 844, calidad_auto=True)
    pagina = contexto.new_page()
    pagina.goto(base)
    pagina.wait_for_function("typeof Telon !== 'undefined' && Telon.vista === 'inicio' && !Telon.ocupado", timeout=30000)
    pagina.evaluate("Telon.navegar('ajustes')")
    pagina.wait_for_function("Telon.vista === 'ajustes' && !Telon.ocupado", timeout=15000)
    abrir_nivel(pagina, 2)
    # Fotogramas lentos y seguidos, los que se darían al girar el juguete en un móvil modesto.
    pagina.evaluate("for (let i = 0; i < 60; i++) Telon.controlador.motor.medirCoste(0.06)")
    comprobar("en un móvil lento quita las sombras al dibujar a tirones", pagina.evaluate("Telon.controlador.motor.sombras") is False)
    pagina.evaluate("Telon.reemplazar('laminas')")
    pagina.wait_for_function("Telon.vista === 'laminas' && !Telon.ocupado", timeout=15000)
    abrir_nivel(pagina, 3)
    comprobar("y lo recuerda en la pantalla siguiente", pagina.evaluate("Telon.controlador.motor.sombras") is False)
    contexto.close()


def main():
    pruebas_estaticas()
    servidor = servir()
    base = f"http://127.0.0.1:{servidor.server_port}/"
    with sync_playwright() as p:
        navegador = p.chromium.launch(args=ARGUMENTOS)
        movil = dict(p.devices["Pixel 5"], device_scale_factor=2)
        contexto = navegador.new_context(**movil, locale="es-ES")
        # El dibujo por software de las pruebas es lento: sin esto, el motor quitaría las sombras.
        contexto.add_init_script("localStorage.getItem('telon.preferencias') || localStorage.setItem('telon.preferencias', JSON.stringify({ calidadAuto: false }))")
        pagina = contexto.new_page()
        errores = []
        pagina.on("pageerror", lambda e: errores.append(f"excepción: {e}"))
        pagina.on("console", lambda m: errores.append(f"consola: {m.text}") if m.type == "error" else None)
        pagina.goto(base)
        pagina.wait_for_function("typeof Telon !== 'undefined' && Telon.vista === 'inicio'", timeout=30000)

        try:
            pruebas_reglas(pagina)
            pruebas_interaccion(pagina, contexto, base, errores)
            pruebas_visibles(pagina)
            pruebas_alcance(pagina)
        except Exception:
            # Si se agota una espera, el motivo suele estar en la consola del navegador.
            print("Estado:", pagina.evaluate("({ vista: Telon.vista, ocupado: Telon.ocupado, ruta: location.hash, controlador: !!Telon.controlador })"))
            print("Consola:", *errores[-6:], sep="\n  ")
            raise

        pruebas_movil(navegador, base)

        print("Limpieza")
        comprobar("consola sin errores", not errores, " | ".join(errores[:5]))
        desbordes = {}
        for ancho, alto in [(360, 640), (390, 844), (430, 932), (1280, 800)]:
            pagina.set_viewport_size({"width": ancho, "height": alto})
            for vista in ["inicio", "laminas", "ajustes", "banco", "componentes", "productos"]:
                pagina.evaluate("v => Telon.navegar(v)", vista)
                esperar_vista(pagina, vista)
                pagina.wait_for_timeout(60)
                d = pagina.evaluate("""() => {
                  const hoja = document.querySelector('.pantalla');
                  return hoja.scrollWidth - hoja.clientWidth;
                }""")
                if d > 0:
                    desbordes[f"{vista}@{ancho}"] = d
        comprobar("sin desbordes horizontales de 360 a 1280", not desbordes, json.dumps(desbordes))
        pagina.set_viewport_size({"width": 360, "height": 640})
        pagina.evaluate("Telon.navegar('juego', { lamina: 1 })")
        pagina.wait_for_function("Telon.vista === 'juego' && !Telon.ocupado && Telon.controlador?.partida", timeout=20000)
        mesa = pagina.evaluate("""() => {
          const m = document.querySelector('.mesa');
          return { sobra: m.scrollHeight - m.clientHeight, lienzo: document.querySelector('#lienzo').clientHeight };
        }""")
        comprobar("la mesa cabe en una pantalla de 360x640", mesa["sobra"] <= 0 and mesa["lienzo"] >= 180, f"lienzo de {mesa['lienzo']} px")
        navegador.close()
    servidor.shutdown()

    if ESCRIBIR_METRICAS:
        (RAIZ / "pruebas/metricas.json").write_text(json.dumps(metricas, ensure_ascii=False, indent=1))

    fallidas = [r for r in resultados if not r[1]]
    print(f"\n{len(resultados) - len(fallidas)} de {len(resultados)} comprobaciones correctas")
    sys.exit(1 if fallidas else 0)


if __name__ == "__main__":
    main()
