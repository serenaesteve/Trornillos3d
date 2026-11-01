// Banco de pruebas: una escena con el motor solo, para demostrar que no depende del juego.
// Física sencilla, colisiones, partículas, inspector y datos del dispositivo.
const lienzo = contenedor.querySelector("#lienzo-banco");
const listaEstados = contenedor.querySelector("#lista-estados");
const listaCapacidades = contenedor.querySelector("#lista-capacidades");

listaCapacidades.innerHTML = Dispositivo.capacidades()
  .map(c => `<li><span>${c.nombre}</span><strong>${c.disponible ? "sí" : "no"}</strong></li>`)
  .join("");
Dispositivo.bateria().then(b => {
  if (!b || !listaCapacidades.isConnected) return;
  listaCapacidades.insertAdjacentHTML("beforeend", `<li><span>Nivel de batería</span><strong>${b.nivel} %${b.cargando ? ", cargando" : ""}</strong></li>`);
});

function pintarEstados() {
  listaEstados.innerHTML = Telon.estados.slice(-6).reverse()
    .map(e => `<li><span>${e.cuando} · ${e.ambito} ${e.ambito === "vista" ? e.nombre : ""}</span><strong>${e.estado}</strong></li>`)
    .join("");
}
pintarEstados();
const refresco = setInterval(pintarEstados, 1000);

let motor;
try {
  motor = new Motor(lienzo, { adaptativo: Dispositivo.preferencias.calidadAuto });
} catch (e) {
  lienzo.parentElement.textContent = "Este dispositivo no tiene gráficos 3D (WebGL).";
  return () => clearInterval(refresco);
}

const SUELO = -1.4;
const COLORES = [0xf0373d, 0x2c6df2, 0xffcb1f, 0x46c837];
const recursos = new Recursos();
const escena = new Escena({ nombre: "banco" });
motor.cargar(escena);
escena.camara.encuadrar(3);
escena.camara.phi = 1.25;

Estudio.montar(motor, escena, { radio: 3 });
const particulas = escena.agregar(new Particulas({ capacidad: 80, tamano: 0.1 }));

const suelo = new THREE.Mesh(
  Geometrias.cajaRedondeada(5, 0.14, 5, 0.06, 2),
  new THREE.MeshStandardMaterial({ color: 0xf7f3ec, roughness: 0.6 })
);
suelo.receiveShadow = true;
suelo.position.y = SUELO - 0.05;
escena.agregar(new Actor({ objeto: suelo, nombre: "suelo" }));

function caida(actor, dt) {
  actor.velocidad.y -= 9 * dt;
  const y = actor.objeto.position;
  if (y.y - actor.radio > SUELO) return true;
  y.y = SUELO + actor.radio;
  actor.velocidad.y *= -0.45;
  actor.velocidad.x *= 0.8;
  actor.velocidad.z *= 0.8;
  if (Math.abs(actor.velocidad.y) >= 0.6) return true;
  // En reposo no se le pide nada al motor: deja de dibujar.
  actor.velocidad.set(0, 0, 0);
  return false;
}

let cuenta = 0;
function soltarBloque() {
  if (escena.buscar("bloque").length >= 12) escena.buscar("bloque")[0].destruir();
  const color = COLORES[cuenta % COLORES.length];
  const malla = new THREE.Mesh(
    recursos.obtener("bloque", () => Geometrias.cajaRedondeada(0.6, 0.6, 0.6, 0.1, 2)),
    recursos.obtener(`bloque:${color}`, () => new THREE.MeshStandardMaterial({ color, roughness: 0.4 }))
  );
  malla.castShadow = true;
  malla.receiveShadow = true;
  const bloque = new Actor({
    objeto: malla,
    nombre: `bloque:${++cuenta}`,
    posicion: [(Math.random() - 0.5) * 2.4, 3, (Math.random() - 0.5) * 2.4],
    radio: 0.34,
    etiquetas: ["bloque"],
    alColisionar: (actor, otro) => {
      if (!otro.tiene("bloque") || !actor.comportamientos.length) return;
      particulas.emitir(actor.objeto.position, color, 4, 2);
      actor.velocidad.x += actor.objeto.position.x - otro.objeto.position.x;
      actor.velocidad.z += actor.objeto.position.z - otro.objeto.position.z;
    },
  });
  bloque.agregarComportamiento(caida);
  escena.agregar(bloque);
}

motor.entrada.al("toque", soltarBloque);
motor.entrada.al("arrastre", ({ dx, dy }) => escena.camara.arrastrar(dx, dy));
motor.entrada.al("fin-arrastre", ({ vx, vy }) => escena.camara.soltar(vx, vy));
soltarBloque();
motor.iniciar();

const inspector = new Inspector(motor, contenedor.querySelector("#banco-inspector"));
inspector.alternar();

return {
  motor,
  escena,
  inspector,
  soltarBloque,
  alPausar: () => motor.pausar(),
  alReanudar: () => motor.reanudar(),
  alDestruir: () => {
    clearInterval(refresco);
    inspector.destruir();
    motor.destruir();
    recursos.liberar();
  },
};
