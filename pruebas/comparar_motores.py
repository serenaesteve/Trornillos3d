#!/usr/bin/env python3
"""
Prueba cinco motores con la misma escena: un bloque que gira y cambia de color al tocarlo.
Mide, en el mismo móvil emulado, cuánto pesan, cuánto código propio piden y cuánto tardan.

    python3 pruebas/comparar_motores.py     # escribe pruebas/comparativa/resultados.json

Necesita internet: los motores se descargan del CDN, como los descargaría un móvil.
"""
import functools
import gzip
import http.server
import json
import statistics
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parent.parent
CARPETA = RAIZ / "pruebas/comparativa"
MOTORES = {"telon": "Telón", "three": "Three.js", "aframe": "A-Frame", "babylon": "Babylon.js", "phaser": "Phaser"}
REPETICIONES = 3
ARGUMENTOS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]


class Silencioso(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def lineas_propias(motor):
    texto = (CARPETA / f"{motor}.html").read_text()
    cuerpo = texto.split("<body>", 1)[1].split("</body>", 1)[0]
    return sum(1 for linea in cuerpo.splitlines() if linea.strip() and "<script" not in linea and "</script" not in linea)


def medir(navegador, dispositivo, url):
    contexto = navegador.new_context(**dispositivo)
    pagina = contexto.new_page()
    respuestas, errores = [], []
    pagina.on("response", lambda r: respuestas.append(r))
    pagina.on("pageerror", lambda e: errores.append(str(e)[:200]))
    pagina.goto(url)
    pagina.wait_for_function("window.__listo !== undefined", timeout=60000)
    pagina.wait_for_timeout(500)
    arranque = pagina.evaluate("window.__listo")
    caja = pagina.viewport_size
    pagina.touchscreen.tap(caja["width"] / 2, caja["height"] / 2)
    pagina.wait_for_timeout(700)
    toques = pagina.evaluate("window.__toques")
    bytes_js = gzip_js = 0
    for r in respuestas:
        if "javascript" in (r.headers.get("content-type") or "") or r.url.endswith(".js"):
            cuerpo = r.body()
            bytes_js += len(cuerpo)
            gzip_js += len(gzip.compress(cuerpo))
    contexto.close()
    return {"arranque_ms": arranque, "js_kb": bytes_js / 1024, "js_gzip_kb": gzip_js / 1024, "toques": toques, "errores": errores}


def main():
    servidor = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Silencioso, directory=str(RAIZ)))
    threading.Thread(target=servidor.serve_forever, daemon=True).start()
    resultados = {}
    with sync_playwright() as p:
        navegador = p.chromium.launch(args=ARGUMENTOS)
        dispositivo = dict(p.devices["Pixel 5"])
        for motor, nombre in MOTORES.items():
            url = f"http://127.0.0.1:{servidor.server_port}/pruebas/comparativa/{motor}.html"
            medidas = [medir(navegador, dispositivo, url) for _ in range(REPETICIONES)]
            resultados[motor] = {
                "nombre": nombre,
                "lineas": lineas_propias(motor),
                "js_kb": round(medidas[0]["js_kb"]),
                "js_gzip_kb": round(medidas[0]["js_gzip_kb"]),
                "arranque_ms": round(statistics.median(m["arranque_ms"] for m in medidas)),
                "responde_al_toque": all(m["toques"] >= 1 for m in medidas),
                "errores": sum((m["errores"] for m in medidas), []),
            }
            print(motor, resultados[motor])
        navegador.close()
    servidor.shutdown()
    (CARPETA / "resultados.json").write_text(json.dumps(resultados, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
