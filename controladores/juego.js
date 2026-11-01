// La mesa de trabajo: une las reglas (qué pasa), el taller (cómo se ve) y la interfaz DOM.
const numero = Number(parametros.lamina) || 1;
const nivel = Niveles.obtener(numero);
if (!nivel || !Progreso.desbloqueada(numero)) {
  Telon.reemplazar("laminas");
  return;
}

const $ = selector => contenedor.querySelector(selector);
const modelo = Modelos.obtener(nivel.modelo);
const mesa = $(".mesa");
const nota = $("#nota");
const zonaCajas = $("#cajas");
const zonaBandeja = $("#bandeja");
const veredicto = $("#veredicto");
const textoNumero = String(numero).padStart(2, "0");
const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;

$("#titulo-numero").textContent = `Nivel ${numero}`;

let motor;
try {
  motor = new Motor($("#lienzo"), { adaptativo: Dispositivo.preferencias.calidadAuto });
} catch (e) {
  nota.textContent = "Este dispositivo no tiene gráficos 3D (WebGL), necesarios para jugar.";
  return;
}

const recursos = new Recursos();
const sonido = new Sonido();
sonido.activado = Dispositivo.preferencias.sonido;
const escena = new Escena({ nombre: `lamina:${textoNumero}` });
motor.cargar(escena);
const taller = new Taller(escena, modelo, nivel.tornillos, recursos);
const camara = escena.camara;
camara.theta = 0.5;
camara.phi = 1.22;
const inspector = new Inspector(motor, $("#mesa-lienzo"));

// Reanudar justo donde se dejó, aunque el sistema haya cerrado la aplicación.
const guardada = Progreso.partidaGuardada(numero);
let partida = new Reglas.Partida(nivel, guardada?.orden ?? []);
partida.ayudas = guardada?.ayudas ?? 0;
let ranuras = [];
let destruida = false;
const temporizadores = new Set();

function esperar(ms, funcion) {
  const id = setTimeout(() => { temporizadores.delete(id); if (!destruida) funcion(); }, ms);
  temporizadores.add(id);
}

// ---- Interfaz: cajas y bandeja -------------------------------------------------------------
function ficha(id) {
  const color = partida.tornillos.get(id).color;
  return `<span class="token" data-id="${id}">${Tinta.icono(color)}</span>`;
}

function htmlCaja(caja, clase = "") {
  const tipo = Tinta.TIPOS[caja.color];
  const huecos = Array.from({ length: Reglas.CAPACIDAD_CAJA }, (_, i) =>
    `<span class="hueco">${caja.tornillos[i] !== undefined ? ficha(caja.tornillos[i]) : ""}</span>`).join("");
  return `<div class="caja ${clase}" style="--c:${tipo.color};--c-claro:${Tinta.claro(tipo.color, 0.28)};--c-oscuro:${Tinta.oscuro(tipo.color, 0.3)};--c-hondo:${Tinta.oscuro(tipo.color, 0.55)}" aria-label="Caja ${tipo.nombre}, ${caja.tornillos.length} de ${Reglas.CAPACIDAD_CAJA}">
    <div class="caja-huecos">${huecos}</div>
  </div>`;
}

// Cada caja se queda en su sitio; la nueva entra donde estaba la que se ha llenado.
function actualizarRanuras() {
  const abiertas = partida.activas.map(c => c.indice);
  ranuras = Array.from({ length: Reglas.CAJAS_VISIBLES }, (_, i) => (abiertas.includes(ranuras[i]) ? ranuras[i] : null));
  for (const indice of abiertas) {
    if (ranuras.includes(indice)) continue;
    ranuras[ranuras.indexOf(null)] = indice;
  }
}

function pintar(eventos = [], origen = null) {
  const antes = new Map([...mesa.querySelectorAll(".token[data-id]")].map(t => [Number(t.dataset.id), t.getBoundingClientRect()]));
  const anteriores = [...ranuras];
  actualizarRanuras();

  zonaCajas.innerHTML = ranuras.map((indice, i) => {
    const entra = indice !== null && anteriores[i] !== indice && anteriores.length > 0;
    return `<div class="ranura-caja" data-ranura="${i}">${indice === null ? "" : htmlCaja(partida.cajas[indice], entra ? "entra" : "")}</div>`;
  }).join("");
  const llenas = partida.cajas.filter(c => c.completa).length;
  $("#titulo-modelo").textContent = `${modelo.nombre} · ${llenas} de ${partida.cajas.length} cajas`;

  // La caja que se acaba de llenar se sella encima de la nueva y sale después.
  for (const evento of eventos) {
    if (evento.tipo !== "caja-completa") continue;
    const sitio = zonaCajas.querySelector(`[data-ranura="${anteriores.indexOf(evento.caja)}"]`);
    if (!sitio) continue;
    sitio.insertAdjacentHTML("beforeend", htmlCaja(partida.cajas[evento.caja], "saliente"));
    const saliente = sitio.lastElementChild;
    saliente.addEventListener("animationend", () => saliente.remove());
  }

  const llena = partida.bandeja.length >= nivel.bandeja;
  const casi = partida.bandeja.length === nivel.bandeja - 1;
  const huecos = Array.from({ length: nivel.bandeja }, (_, i) =>
    `<span class="hueco">${partida.bandeja[i] !== undefined ? ficha(partida.bandeja[i]) : ""}</span>`).join("");
  zonaBandeja.className = `bandeja ${llena ? "llena" : casi ? "casi" : ""}`;
  zonaBandeja.innerHTML = `<div class="bandeja-huecos">${huecos}</div>`;
  zonaBandeja.setAttribute("aria-label", `Bandeja, ${partida.bandeja.length} de ${nivel.bandeja}`);

  volarFichas(antes, origen);
  $("#deshacer").disabled = partida.orden.length === 0;
  $("#reiniciar").disabled = partida.orden.length === 0;
}

// Cada ficha parte de donde estaba: el tornillo sacado, del modelo; las demás, de su hueco anterior.
function volarFichas(antes, origen) {
  if (quieto) return;
  for (const token of mesa.querySelectorAll(".token[data-id]")) {
    const id = Number(token.dataset.id);
    const destino = token.getBoundingClientRect();
    const desde = origen?.id === id
      ? { x: origen.x, y: origen.y }
      : antes.has(id) ? { x: antes.get(id).left + antes.get(id).width / 2, y: antes.get(id).top + antes.get(id).height / 2 } : null;
    if (!desde) continue;
    const dx = desde.x - (destino.left + destino.width / 2);
    const dy = desde.y - (destino.top + destino.height / 2);
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    token.animate(
      [{ transform: `translate(${dx}px,${dy}px) scale(1.25)` }, { transform: "none" }],
      { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
    token.style.zIndex = 5;
  }
}

function avisar(texto) { nota.textContent = texto; }

function consejoInicial() {
  if (numero === 1 && partida.orden.length === 0) return "Toca un tornillo para sacarlo. Arrastra para girar el juguete.";
  if (numero === 1 && partida.bandeja.length > 0) return "Lo que no tiene caja espera aquí arriba. Si llenas los cinco huecos, te atascas.";
  if (numero === 2 && partida.orden.length === 0) return "Busca primero los colores de las cajas abiertas.";
  return "";
}

// La mano del primer nivel señala un tornillo hasta la primera jugada.
const mano = $("#mano");
let vigiaMano = null;
function guiarConLaMano() {
  clearInterval(vigiaMano);
  if (numero !== 1 || partida.orden.length > 0 || quieto) { mano.hidden = true; return; }
  const colocar = () => {
    if (partida.orden.length > 0) { mano.hidden = true; clearInterval(vigiaMano); return; }
    const id = taller.masVisible(partida);
    if (id === null) { mano.hidden = true; return; }
    const punto = taller.pantallaDe(id);
    const caja = $("#mesa-lienzo").getBoundingClientRect();
    mano.style.left = `${punto.x - caja.left}px`;
    mano.style.top = `${punto.y - caja.top}px`;
    mano.hidden = false;
  };
  colocar();
  vigiaMano = setInterval(colocar, 250);
}

// ---- Jugadas -------------------------------------------------------------------------------
function jugar(id) {
  const posicion = taller.pantallaDe(id);
  const resultado = partida.quitar(id);
  if (!resultado.ok) {
    rechazar(id, resultado);
    return resultado;
  }
  taller.sacar(id);
  taller.mostrarDescubiertos(partida);
  sonarCarraca(posicion.x);
  Dispositivo.vibrar(12);
  for (const evento of resultado.eventos) {
    if (evento.tipo === "pieza-cae") {
      taller.caer(evento.pieza);
      sonido.tono({ frecuencia: 170, hasta: 60, duracion: 0.22, tipo: "sine", volumen: 0.14, retardo: 0.12 });
    }
    if (evento.tipo === "caja-completa") {
      sonido.tono({ frecuencia: 660, duracion: 0.12, volumen: 0.07, retardo: 0.18 });
      sonido.tono({ frecuencia: 990, duracion: 0.18, volumen: 0.07, retardo: 0.27 });
    }
  }
  pintar(resultado.eventos, { id, ...posicion });
  avisar(consejoInicial());
  mano.hidden = true;
  Progreso.guardarPartida(numero, partida);
  if (partida.estado === "ganada") ganar();
  if (partida.estado === "perdida") perder();
  return resultado;
}

function rechazar(id, resultado) {
  if (resultado.motivo === "tapado") {
    const nombres = resultado.tapadoPor.map(p => modelo.piezas.find(x => x.id === p).nombre);
    taller.rechazar(id, resultado.tapadoPor);
    avisar(`Lo tapa: ${nombres.join(", ")}.`);
  }
  sonido.tono({ frecuencia: 150, duracion: 0.09, tipo: "square", volumen: 0.05 });
  Dispositivo.vibrar([18, 30, 18]);
}

function sonarCarraca(x) {
  const panorama = Math.max(-1, Math.min(1, (x / innerWidth) * 2 - 1)) * 0.6;
  for (let i = 0; i < 3; i++) {
    sonido.tono({ frecuencia: 1500 - i * 200, hasta: 500, duracion: 0.035, tipo: "square", volumen: 0.035, retardo: i * 0.055, panorama });
  }
}

function deshacer() {
  if (!partida.orden.length) return;
  const ayudas = partida.ayudas + 1;
  const estabaPerdida = partida.estado === "perdida";
  partida = new Reglas.Partida(nivel, partida.orden.slice(0, -1));
  partida.ayudas = ayudas;
  taller.sincronizar(partida);
  ranuras = [];
  pintar();
  if (estabaPerdida) cerrarVeredicto();
  avisar("");
  Progreso.guardarPartida(numero, partida);
}

function reiniciar() {
  partida = new Reglas.Partida(nivel);
  taller.sincronizar(partida);
  ranuras = [];
  pintar();
  cerrarVeredicto();
  avisar(consejoInicial());
  guiarConLaMano();
  Progreso.olvidarPartida(numero);
}

function pedirPista() {
  if (partida.estado !== "jugando") return;
  const id = Reglas.pista(partida);
  if (id === null) {
    avisar("Desde aquí no encuentro salida. Deshaz alguna jugada o empieza de nuevo.");
    return;
  }
  partida.ayudas++;
  taller.marcar(id);
  avisar("Empieza por el tornillo marcado. Las pistas dejan el nivel en una estrella.");
  Progreso.guardarPartida(numero, partida);
}

// ---- Final de la lámina --------------------------------------------------------------------
function cerrarVeredicto() {
  veredicto.hidden = true;
  mesa.classList.remove("terminada", "atascada");
}

function acciones(lista) {
  const zona = $("#veredicto-acciones");
  zona.replaceChildren(...lista.map(({ texto, primaria, accion }) => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = `boton ${primaria ? "boton-primario" : ""}`;
    boton.textContent = texto;
    boton.onclick = accion;
    return boton;
  }));
}

function mostrarVeredicto({ titulo, detalle, sellos = null, botones, clase }) {
  $("#veredicto-titulo").textContent = titulo;
  $("#veredicto-detalle").textContent = detalle;
  const zona = $("#veredicto-sellos");
  zona.hidden = sellos === null;
  zona.innerHTML = sellos === null ? "" : [0, 1, 2].map(i =>
    `<span class="sello ${i < sellos ? "ganado" : ""}" style="--orden:${i}">${Tinta.estrella(i < sellos)}</span>`).join("");
  acciones(botones);
  veredicto.className = `veredicto ${clase}`;
  veredicto.hidden = false;
}

function ganar() {
  const sellos = Reglas.sellos(partida);
  Progreso.completar(numero, sellos);
  Dispositivo.vibrar([30, 50, 70]);
  avisar("");
  [523, 659, 784, 1047].forEach((frecuencia, i) => sonido.tono({ frecuencia, duracion: 0.28, volumen: 0.07, retardo: 0.25 + i * 0.13 }));
  mesa.classList.add("terminada");
  // La última pieza termina de caer y el juguete reaparece abierto: la recompensa es verlo.
  esperar(quieto ? 0 : 650, () => {
    taller.desplegar({
      duracion: quieto ? 0.01 : 1.6,
      alTerminar: () => {
        const hay = numero < Niveles.total;
        mostrarVeredicto({
          clase: "ganada",
          titulo: hay ? `¡Nivel ${numero} completo!` : "¡Lo has desmontado todo!",
          sellos,
          detalle: partida.ayudas
            ? "Con ayudas, una estrella. Repítelo sin pistas ni deshacer para llevarte más."
            : `Llegaste a ocupar ${partida.picoBandeja} de ${nivel.bandeja} huecos. Con ${Math.max(1, nivel.bandeja - 2)} o menos son tres estrellas.`,
          botones: [
            ...(hay ? [{ texto: `Nivel ${numero + 1}`, primaria: true, accion: () => Telon.reemplazar("juego", { lamina: numero + 1 }) }] : []),
            { texto: "Niveles", primaria: !hay, accion: () => Telon.reemplazar("laminas") },
          ],
        });
      },
    });
  });
}

function perder() {
  Dispositivo.vibrar([60, 40, 60]);
  sonido.tono({ frecuencia: 220, hasta: 90, duracion: 0.4, tipo: "sawtooth", volumen: 0.05 });
  mesa.classList.add("atascada");
  mostrarVeredicto({
    clase: "perdida",
    titulo: "¡No queda sitio!",
    detalle: "Se han llenado los huecos. Busca antes los colores de las cajas abiertas.",
    botones: [
      { texto: "Deshacer", primaria: true, accion: deshacer },
      { texto: "Reiniciar", accion: reiniciar },
    ],
  });
}

// ---- Entrada ---------------------------------------------------------------------------------
const entrada = motor.entrada;
entrada.al("toque", ({ x, y }) => {
  sonido.desbloquear();
  if (partida.estado !== "jugando") return;
  const id = taller.elegir(x, y, partida);
  if (id !== null) jugar(id);
});
entrada.al("arrastre", ({ dx, dy }) => { sonido.desbloquear(); camara.arrastrar(dx, dy); });
entrada.al("fin-arrastre", ({ vx, vy }) => camara.soltar(vx, vy));
entrada.al("pellizco", ({ factor }) => camara.acercar(factor));
entrada.al("tecla", ({ codigo }) => {
  const paso = 0.14;
  if (codigo === "ArrowLeft") camara.girar(-paso, 0);
  if (codigo === "ArrowRight") camara.girar(paso, 0);
  if (codigo === "ArrowUp") camara.girar(0, -paso);
  if (codigo === "ArrowDown") camara.girar(0, paso);
});
if (Dispositivo.preferencias.inclinacion) {
  entrada.activarInclinacion();
  entrada.al("inclinacion", ({ beta, gamma }) => {
    camara.desvio.theta = THREE.MathUtils.clamp(gamma / 45, -1, 1) * 0.35;
    camara.desvio.phi = THREE.MathUtils.clamp((beta - 45) / 45, -1, 1) * 0.2;
  });
}

$("#volver").onclick = () => Telon.volver("laminas");
$("#pista").onclick = () => { sonido.desbloquear(); pedirPista(); };
$("#deshacer").onclick = deshacer;
$("#reiniciar").onclick = reiniciar;
$("#inspeccionar").onclick = e => e.currentTarget.setAttribute("aria-pressed", inspector.alternar());

// ---- Arranque --------------------------------------------------------------------------------
taller.sincronizar(partida);
pintar();
avisar(consejoInicial());
if (partida.estado === "perdida") perder();
motor.iniciar();
guiarConLaMano();
Dispositivo.mantenerPantalla(true);

return {
  motor,
  escena,
  taller,
  inspector,
  jugar,
  get partida() { return partida; },
  alPausar: () => { motor.pausar(); sonido.pausar(); Dispositivo.mantenerPantalla(false); Progreso.guardarPartida(numero, partida); },
  alReanudar: () => { motor.reanudar(); sonido.reanudar(); Dispositivo.mantenerPantalla(true); },
  alDestruir: () => {
    destruida = true;
    Dispositivo.mantenerPantalla(false);
    clearInterval(vigiaMano);
    for (const id of temporizadores) clearTimeout(id);
    inspector.destruir();
    motor.destruir();
    recursos.liberar();
    sonido.destruir();
  },
};
