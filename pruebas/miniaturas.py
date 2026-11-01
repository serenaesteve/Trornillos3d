#!/usr/bin/env python3
"""
Genera iconos/niveles/NN.png: el dibujo de cada nivel que se ve en el índice.

    python3 pruebas/miniaturas.py

Hay que volver a lanzarlo si cambia un modelo o la tabla de niveles.
"""
import base64
import functools
import http.server
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parent.parent
DESTINO = RAIZ / "iconos/niveles"

DIBUJAR = """
async (n) => {
  const lienzo = document.createElement("canvas");
  lienzo.style.cssText = "position:fixed;left:0;top:0;width:150px;height:150px;z-index:-1";
  document.body.append(lienzo);
  const motor = new Motor(lienzo, { adaptativo: false });
  const recursos = new Recursos();
  const escena = new Escena({ nombre: "miniatura" });
  motor.cargar(escena);
  const nivel = Niveles.obtener(n);
  const taller = new Taller(escena, Modelos.obtener(nivel.modelo), nivel.tornillos, recursos);
  taller.sincronizar(new Reglas.Partida(nivel));
  taller.sombra.visible = false;
  escena.camara.theta = 0.55;
  escena.camara.phi = 1.2;
  escena.camara.zoom = 1.14;
  escena.camara.encuadrarDistancia();
  escena.camara.aplicar();
  Estudio.apuntar(escena);
  escena.dibujar(motor.renderizador);
  const png = lienzo.toDataURL("image/png");
  motor.destruir();
  recursos.liberar();
  lienzo.remove();
  return png.split(",")[1];
}
"""


class Silencioso(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    servidor = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Silencioso, directory=str(RAIZ)))
    threading.Thread(target=servidor.serve_forever, daemon=True).start()
    DESTINO.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        navegador = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        pagina = navegador.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2).new_page()
        pagina.goto(f"http://127.0.0.1:{servidor.server_port}/")
        pagina.wait_for_function("typeof Telon !== 'undefined' && Telon.vista === 'inicio'", timeout=30000)
        pagina.evaluate("Telon.navegar('ajustes')")
        pagina.wait_for_function("Telon.vista === 'ajustes' && !Telon.ocupado", timeout=15000)
        for n in range(1, 16):
            (DESTINO / f"{n:02d}.png").write_bytes(base64.b64decode(pagina.evaluate(DIBUJAR, n)))
            print("nivel", n)
        navegador.close()
    servidor.shutdown()


if __name__ == "__main__":
    main()
