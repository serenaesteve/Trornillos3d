// Portada: un juguete que se desmonta y se vuelve a montar. Es la promesa del juego.
const siguiente = Progreso.siguiente();
const abrir = contenedor.querySelector("#abrir");
abrir.textContent = `Jugar nivel ${siguiente}`;
abrir.onclick = () => Telon.navegar("juego", { lamina: siguiente });

const lienzo = contenedor.querySelector("#lienzo-portada");
let motor;
try {
  motor = new Motor(lienzo, { adaptativo: Dispositivo.preferencias.calidadAuto });
} catch (e) {
  // Sin WebGL la portada sigue sirviendo: desaparece la ilustración, no el botón.
  lienzo.parentElement.hidden = true;
  return;
}

const recursos = new Recursos();
const escena = new Escena({ nombre: "portada" });
motor.cargar(escena);

// El juguete del nivel que toca jugar.
const nivel = Niveles.obtener(siguiente);
const modelo = Modelos.obtener(nivel.modelo);
const taller = new Taller(escena, modelo, nivel.tornillos, recursos);
const camara = escena.camara;
camara.zoom = 1.4;
camara.theta = 0.45;
camara.phi = 1.25;
camara.encuadrarDistancia();

const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (quieto) {
  taller.fijarDespiece(0.8);
} else {
  // Montado, se abre, pausa, se cierra: el gesto del juego en bucle.
  let tiempo = 0;
  const CICLO = 7;
  taller.raiz.agregarComportamiento((actor, dt) => {
    tiempo = (tiempo + dt) % CICLO;
    const fase = tiempo / CICLO;
    const abierto = fase < 0.15 ? 0 : fase < 0.4 ? (fase - 0.15) / 0.25 : fase < 0.75 ? 1 : fase < 1 ? 1 - (fase - 0.75) / 0.25 : 0;
    const k = Escena.entradaSalida(abierto);
    taller.fijarDespiece(k);
    camara.zoom = 1.02 + k * 0.5;
    camara.encuadrarDistancia();
    camara.theta += dt * 0.14;
  });
}

motor.entrada.al("arrastre", ({ dx, dy }) => camara.arrastrar(dx, dy));
motor.entrada.al("fin-arrastre", ({ vx, vy }) => camara.soltar(vx, vy));
motor.iniciar();

return {
  motor,
  alPausar: () => motor.pausar(),
  alReanudar: () => motor.reanudar(),
  alDestruir: () => { motor.destruir(); recursos.liberar(); },
};
