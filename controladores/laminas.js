// Índice: cada nivel es un juguete. Se abre al terminar el anterior, y las estrellas se pueden
// mejorar repitiéndolo. Los grupos avisan de la dificultad, que sube de nivel en nivel.
const capitulos = contenedor.querySelector("#capitulos");
const GRUPOS = [
  { nombre: "Para empezar", desde: 1, hasta: 6 },
  { nombre: "Más difícil", desde: 7, hasta: 12 },
  { nombre: "Para expertos", desde: 13, hasta: 15 },
];

let conseguidas = 0;
const secciones = GRUPOS.map(grupo => {
  const filas = [];
  for (let n = grupo.desde; n <= grupo.hasta; n++) {
    const modelo = Modelos.obtener(Niveles.definicion(n).modelo);
    const sellos = Progreso.sellos(n);
    conseguidas += sellos;
    const abierta = Progreso.desbloqueada(n);
    const numero = String(n).padStart(2, "0");
    const estado = !abierta ? "cerrado" : sellos ? `completado con ${sellos} de 3 estrellas` : "por empezar";
    filas.push(`<ui-lamina class="${abierta ? "" : "cerrada"} ${n === Progreso.siguiente() ? "actual" : ""}"
      numero="${numero}" texto="${n}" nombre="${modelo.nombre}" imagen="iconos/niveles/${numero}.png" data-sellos="${sellos}"
      etiqueta="Nivel ${n}: ${modelo.nombre}, ${estado}" bloqueo="${abierta ? "" : "disabled"}"></ui-lamina>`);
  }
  return `<section class="capitulo">
    <h2>${grupo.nombre}</h2>
    <div class="capitulo-laminas">${filas.join("")}</div>
  </section>`;
});

contenedor.querySelector("#resumen-sellos").textContent = `${conseguidas} de ${Niveles.total * 3} estrellas`;

// Se monta aparte y se muestra entero: así ningún botón cambia de sitio mientras se pinta.
const borrador = document.createElement("div");
borrador.innerHTML = secciones.join("");
Componentes.renderizar(borrador).then(() => {
  for (const lamina of borrador.querySelectorAll("[data-lamina]")) {
    const sellos = Number(lamina.dataset.sellos);
    if (lamina.disabled) continue;
    lamina.querySelector(".lamina-estrellas").innerHTML = [0, 1, 2].map(i => Tinta.estrella(i < sellos)).join("");
  }
  capitulos.replaceChildren(...borrador.children);
});

capitulos.addEventListener("click", e => {
  const lamina = e.target.closest("[data-lamina]");
  if (lamina && !lamina.disabled) Telon.navegar("juego", { lamina: Number(lamina.dataset.lamina) });
});
