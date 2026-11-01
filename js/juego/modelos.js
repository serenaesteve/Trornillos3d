// Modelos del juego, descritos solo con datos: piezas (formas alineadas con los ejes) y
// anclajes (sitios posibles para un tornillo). Las dependencias entre piezas no se escriben
// a mano: se calculan a partir de esta geometría en reglas.js.
//
// Un anclaje { pieza, pos, normal } sujeta esa pieza; su cabeza sale hacia `normal`.
// Las formas con decor: true son adornos: se dibujan, pero no tapan ningún tornillo.
const Modelos = (() => {
  const caja = (pos, tam, extra = {}) => ({ tipo: "caja", pos, tam, ...extra });
  const cilindro = (pos, tam, eje = "y", extra = {}) => ({ tipo: "cilindro", pos, tam, eje, ...extra });
  const cono = (pos, tam, extra = {}) => ({ tipo: "cono", pos, tam, ...extra });

  const NORMALES = { "+x": [1, 0, 0], "-x": [-1, 0, 0], "+y": [0, 1, 0], "-y": [0, -1, 0], "+z": [0, 0, 1], "-z": [0, 0, -1] };
  const a = (pieza, pos, normal) => ({ pieza, pos, normal: NORMALES[normal] });

  // ---- Pingüino: la bufanda, la barriga y la cara tapan lo que hay debajo ------------------
  const pinguino = {
    id: "pinguino",
    nombre: "Pingüino",
    radio: 2.65,
    centro: [0, 0.5, 0],
    piezas: [
      {
        id: "cuerpo", nombre: "Cuerpo", tinte: "noche", salida: [0, -0.1, -0.5],
        formas: [caja([0, -0.1, 0], [1.9, 2, 1.5]), caja([0, -0.82, -0.84], [0.5, 0.32, 0.22], { decor: true })],
      },
      { id: "barriga", nombre: "Barriga", tinte: "nieve", salida: [0, -0.1, 1], formas: [caja([0, -0.25, 0.82], [1.3, 1.4, 0.14])] },
      { id: "cabeza", nombre: "Cabeza", tinte: "noche", salida: [0, 0.8, -0.3], formas: [caja([0, 1.5, 0], [1.7, 1.1, 1.4])] },
      {
        id: "cara", nombre: "Cara", tinte: "nieve", salida: [0, 0.3, 1.1],
        formas: [caja([0, 1.4, 0.76], [1.25, 0.75, 0.12]),
          cilindro([-0.33, 1.55, 0.83], [0.25, 0.25, 0.05], "z", { decor: true, tinte: "noche" }),
          cilindro([0.33, 1.55, 0.83], [0.25, 0.25, 0.05], "z", { decor: true, tinte: "noche" }),
          cilindro([-0.28, 1.6, 0.86], [0.07, 0.07, 0.02], "z", { decor: true, tinte: "nieve" }),
          cilindro([0.38, 1.6, 0.86], [0.07, 0.07, 0.02], "z", { decor: true, tinte: "nieve" }),
          cilindro([-0.5, 1.4, 0.825], [0.18, 0.18, 0.02], "z", { decor: true, tinte: "rosa" }),
          cilindro([0.5, 1.4, 0.825], [0.18, 0.18, 0.02], "z", { decor: true, tinte: "rosa" })],
      },
      { id: "pico", nombre: "Pico", tinte: "naranja", salida: [0, 0, 1.7], formas: [caja([0, 1.32, 0.93], [0.42, 0.2, 0.26])] },
      { id: "ala-der", nombre: "Ala derecha", tinte: "noche", salida: [1, 0.1, 0], formas: [caja([1.09, 0, 0], [0.28, 1.35, 0.9]), caja([1.09, -0.6, 0], [0.31, 0.2, 0.93], { decor: true, tinte: "azul" })] },
      { id: "ala-izq", nombre: "Ala izquierda", tinte: "noche", salida: [-1, 0.1, 0], formas: [caja([-1.09, 0, 0], [0.28, 1.35, 0.9]), caja([-1.09, -0.6, 0], [0.31, 0.2, 0.93], { decor: true, tinte: "azul" })] },
      { id: "pie-der", nombre: "Pie derecho", tinte: "naranja", salida: [0.5, -1, 0.3], formas: [caja([0.5, -1.21, 0.35], [0.75, 0.22, 1.3]), caja([0.25, -1.23, 1.03], [0.2, 0.18, 0.2], { decor: true }), caja([0.50, -1.23, 1.03], [0.2, 0.18, 0.2], { decor: true }), caja([0.75, -1.23, 1.03], [0.2, 0.18, 0.2], { decor: true })] },
      { id: "pie-izq", nombre: "Pie izquierdo", tinte: "naranja", salida: [-0.5, -1, 0.3], formas: [caja([-0.5, -1.21, 0.35], [0.75, 0.22, 1.3]), caja([-0.75, -1.23, 1.03], [0.2, 0.18, 0.2], { decor: true }), caja([-0.50, -1.23, 1.03], [0.2, 0.18, 0.2], { decor: true }), caja([-0.25, -1.23, 1.03], [0.2, 0.18, 0.2], { decor: true })] },
      {
        id: "bufanda", nombre: "Bufanda", tinte: "rojo", salida: [0.9, 0.2, 0.9],
        formas: [caja([0, 0.92, 0], [1.95, 0.22, 1.55]), caja([0.55, 0.45, 0.82], [0.34, 0.8, 0.1])],
      },
      {
        id: "gorro", nombre: "Gorro", tinte: "azul", salida: [0, 1, 0],
        formas: [caja([0, 2.2, 0], [1.1, 0.3, 0.95]), caja([0, 2.09, 0], [1.16, 0.09, 1.01], { decor: true, tinte: "nieve" }),
          cilindro([0, 2.47, 0], [0.26, 0.24, 0.26], "y", { decor: true, tinte: "amarillo" })],
      },
    ],
    anclajes: [
      a("gorro", [0.36, 2.35, 0], "+y"), a("gorro", [-0.36, 2.35, 0], "+y"), a("gorro", [0, 2.2, 0.475], "+z"),
      a("cara", [0.52, 1.17, 0.82], "+z"), a("cara", [-0.52, 1.17, 0.82], "+z"), a("cara", [0, 1.7, 0.82], "+z"),
      a("pico", [0, 1.42, 0.93], "+y"),
      a("barriga", [0.45, 0.25, 0.89], "+z"), a("barriga", [-0.45, 0.25, 0.89], "+z"),
      a("barriga", [0.45, -0.75, 0.89], "+z"), a("barriga", [-0.45, -0.75, 0.89], "+z"), a("barriga", [0, -0.25, 0.89], "+z"),
      a("ala-der", [1.23, 0.35, 0], "+x"), a("ala-der", [1.23, -0.35, 0], "+x"),
      a("ala-izq", [-1.23, 0.35, 0], "-x"), a("ala-izq", [-1.23, -0.35, 0], "-x"),
      a("bufanda", [-0.6, 0.92, 0.775], "+z"), a("bufanda", [0, 0.92, 0.775], "+z"), a("bufanda", [0, 0.92, -0.775], "-z"),
      a("bufanda", [0.975, 0.92, 0], "+x"), a("bufanda", [-0.975, 0.92, 0], "-x"),
      a("pie-der", [0.5, -1.1, 0.88], "+y"), a("pie-izq", [-0.5, -1.1, 0.88], "+y"),
      a("pie-der", [0.5, -1.32, 0.1], "-y"), a("pie-izq", [-0.5, -1.32, 0.1], "-y"),
      // Bajo la cara, el gorro y por detrás.
      a("cabeza", [0.35, 1.35, 0.7], "+z"), a("cabeza", [-0.35, 1.35, 0.7], "+z"),
      a("cabeza", [0.85, 1.6, 0], "+x"), a("cabeza", [-0.85, 1.6, 0], "-x"),
      a("cabeza", [0, 1.5, -0.7], "-z"), a("cabeza", [0, 2.05, 0], "+y"),
      // Bajo la barriga, las alas y los pies.
      a("cuerpo", [0.4, -0.25, 0.75], "+z"), a("cuerpo", [-0.4, -0.25, 0.75], "+z"),
      a("cuerpo", [0.95, 0, 0], "+x"), a("cuerpo", [-0.95, 0, 0], "-x"),
      a("cuerpo", [0.5, -0.1, -0.75], "-z"), a("cuerpo", [-0.5, -0.1, -0.75], "-z"),
      a("cuerpo", [0.5, -1.1, 0.1], "-y"), a("cuerpo", [-0.5, -1.1, 0.1], "-y"),
    ],
  };

  // ---- Radio: paneles sobre paneles y una carcasa que solo se libera al final ----------
  const radio = {
    id: "radio",
    nombre: "Radio",
    radio: 2.7,
    centro: [0, 0.35, 0],
    piezas: [
      { id: "carcasa", nombre: "Carcasa", tinte: "turquesa", salida: [0, 0, 0], formas: [caja([0, 0, 0], [3.2, 2, 1.2])] },
      {
        id: "frontal", nombre: "Panel frontal", tinte: "nieve", salida: [0, 0, 1],
        formas: [caja([0, 0, 0.65], [3, 1.8, 0.1]), caja([0.82, 0.02, 0.705], [0.95, 0.1, 0.02], { decor: true, tinte: "rojo" })],
      },
      {
        id: "trasera", nombre: "Tapa trasera", tinte: "gris", salida: [0, 0, -1],
        formas: [caja([0, 0, -0.65], [3, 1.8, 0.1]), ...[-0.35, 0, 0.35].map(y => caja([0, y, -0.705], [1.7, 0.08, 0.02], { decor: true, tinte: "noche" }))],
      },
      { id: "lateral-der", nombre: "Lateral derecho", tinte: "naranja", salida: [1, 0, 0], formas: [caja([1.65, 0, 0], [0.1, 1.8, 1]), caja([1.705, 0, 0], [0.02, 0.16, 0.8], { decor: true, tinte: "amarillo" })] },
      { id: "lateral-izq", nombre: "Lateral izquierdo", tinte: "naranja", salida: [-1, 0, 0], formas: [caja([-1.65, 0, 0], [0.1, 1.8, 1]), caja([-1.705, 0, 0], [0.02, 0.16, 0.8], { decor: true, tinte: "amarillo" })] },
      {
        id: "rejilla", nombre: "Rejilla del altavoz", tinte: "rojo", salida: [-0.4, 0, 1.6],
        formas: [caja([-0.72, 0, 0.74], [1.3, 1.4, 0.08]),
          ...[-0.42, -0.14, 0.14, 0.42].map(y => caja([-0.72, y, 0.785], [0.8, 0.07, 0.02], { decor: true, tinte: "noche" }))],
      },
      {
        id: "dial", nombre: "Dial", tinte: "amarillo", salida: [0.4, 0.4, 1.6],
        formas: [caja([0.82, 0.42, 0.74], [1.1, 0.6, 0.08]), cilindro([0.82, 0.42, 0.82], [0.32, 0.32, 0.1], "z", { decor: true, tinte: "noche" }),
          caja([0.82, 0.5, 0.875], [0.04, 0.14, 0.02], { decor: true, tinte: "rojo" }), caja([0.82, 0.64, 0.785], [0.62, 0.04, 0.02], { decor: true, tinte: "noche" })],
      },
      {
        id: "teclado", nombre: "Botonera", tinte: "azul", salida: [0.4, -0.4, 1.6],
        formas: [caja([0.82, -0.42, 0.74], [1.1, 0.5, 0.08]),
          ...[0.68, 0.82, 0.96].map(x => cilindro([x, -0.42, 0.81], [0.1, 0.1, 0.05], "z", { decor: true, tinte: "nieve" }))],
      },
      {
        id: "asa", nombre: "Asa", tinte: "rosa", salida: [0, 1, 0],
        formas: [caja([0, 1.42, 0], [2.2, 0.14, 0.3]), caja([1, 1.17, 0], [0.16, 0.34, 0.24]), caja([-1, 1.17, 0], [0.16, 0.34, 0.24])],
      },
      {
        id: "antena", nombre: "Antena", tinte: "gris", salida: [0.6, 1, -0.3],
        formas: [caja([1.3, 1.06, -0.35], [0.3, 0.12, 0.3]), cilindro([1.3, 1.6, -0.35], [0.07, 1, 0.07]),
          cilindro([1.3, 2.13, -0.35], [0.16, 0.14, 0.16], "y", { decor: true, tinte: "rojo" })],
      },
      { id: "peana", nombre: "Peana", tinte: "noche", salida: [0, -1, 0], formas: [caja([0, -1.1, 0], [2.8, 0.2, 0.9])] },
    ],
    anclajes: [
      a("rejilla", [-1.24, 0.58, 0.78], "+z"), a("rejilla", [-0.2, 0.58, 0.78], "+z"),
      a("rejilla", [-1.24, -0.58, 0.78], "+z"), a("rejilla", [-0.2, -0.58, 0.78], "+z"),
      a("dial", [0.4, 0.42, 0.78], "+z"), a("dial", [1.24, 0.42, 0.78], "+z"),
      a("teclado", [0.4, -0.42, 0.78], "+z"), a("teclado", [1.24, -0.42, 0.78], "+z"),
      a("frontal", [1.4, 0.8, 0.7], "+z"), a("frontal", [-1.4, 0.8, 0.7], "+z"),
      a("frontal", [1.4, -0.8, 0.7], "+z"), a("frontal", [-1.4, -0.8, 0.7], "+z"),
      a("frontal", [-0.72, 0.3, 0.7], "+z"), a("frontal", [-0.72, -0.3, 0.7], "+z"),
      a("frontal", [0.82, 0.42, 0.7], "+z"), a("frontal", [0.82, -0.42, 0.7], "+z"),
      a("trasera", [1.35, 0.75, -0.7], "-z"), a("trasera", [-1.35, 0.75, -0.7], "-z"),
      a("trasera", [1.35, -0.75, -0.7], "-z"), a("trasera", [-1.35, -0.75, -0.7], "-z"),
      a("lateral-der", [1.7, 0.5, 0], "+x"), a("lateral-der", [1.7, -0.5, 0], "+x"),
      a("lateral-izq", [-1.7, 0.5, 0], "-x"), a("lateral-izq", [-1.7, -0.5, 0], "-x"),
      a("asa", [0.6, 1.49, 0], "+y"), a("asa", [-0.6, 1.49, 0], "+y"),
      a("antena", [1.38, 1.12, -0.27], "+y"),
      a("peana", [1, -1.2, 0], "-y"), a("peana", [-1, -1.2, 0], "-y"),
      // La carcasa: todos sus tornillos quedan tapados por algún panel.
      a("carcasa", [1, 0, 0.6], "+z"), a("carcasa", [-1, 0, 0.6], "+z"),
      a("carcasa", [0.8, 0.3, -0.6], "-z"), a("carcasa", [-0.8, 0.3, -0.6], "-z"),
      a("carcasa", [1.6, 0, 0], "+x"), a("carcasa", [-1.6, 0, 0], "-x"),
      a("carcasa", [0, 1, 0], "+y"), a("carcasa", [0, -1, 0], "-y"),
    ],
  };

  // ---- Molino: el más complejo, con tornillos en todas las caras ------------------------
  const molino = {
    id: "molino",
    nombre: "Molino",
    radio: 3.0,
    centro: [0, 0.27, 0],
    piezas: [
      {
        id: "zocalo", nombre: "Césped", tinte: "verde", salida: [0, -1, 0],
        formas: [caja([0, -2.1, 0], [2.6, 0.3, 2.6]),
          cilindro([1.08, -1.91, 0.1], [0.2, 0.08, 0.2], "y", { decor: true, tinte: "rosa" }),
          cilindro([-1.08, -1.91, -0.2], [0.2, 0.08, 0.2], "y", { decor: true, tinte: "amarillo" }),
          cilindro([0.3, -1.91, 1.1], [0.2, 0.08, 0.2], "y", { decor: true, tinte: "amarillo" }),
          cilindro([-0.3, -1.91, -1.1], [0.2, 0.08, 0.2], "y", { decor: true, tinte: "rosa" })],
      },
      {
        id: "torre", nombre: "Torre", tinte: "nieve", salida: [0, 0, 0],
        formas: [caja([0, -0.75, 0], [1.8, 2.4, 1.8]),
          caja([0.905, 0.02, 0], [0.02, 0.42, 0.42], { decor: true, tinte: "turquesa" }),
          caja([-0.905, 0.02, 0], [0.02, 0.42, 0.42], { decor: true, tinte: "turquesa" }),
          caja([0.58, -0.3, 0.91], [0.34, 0.18, 0.03], { decor: true, tinte: "gris" }),
          caja([-0.56, -0.68, 0.91], [0.34, 0.18, 0.03], { decor: true, tinte: "gris" }),
          caja([0.6, -1.5, 0.91], [0.34, 0.18, 0.03], { decor: true, tinte: "gris" })],
      },
      { id: "cornisa", nombre: "Cornisa", tinte: "azul", salida: [1, 0.3, -1], formas: [caja([0, 0.52, 0], [2.2, 0.14, 2.2])] },
      { id: "atico", nombre: "Ático", tinte: "nieve", salida: [-1, 0.6, -1], formas: [caja([0, 1, 0], [1.5, 0.82, 1.5])] },
      {
        id: "tejado", nombre: "Tejado", tinte: "rojo", salida: [0, 1, -0.3],
        formas: [caja([0, 1.47, 0], [1.7, 0.14, 1.7]), cono([0, 2.04, 0], [1.7, 1, 1.7]), caja([0.42, 2.12, -0.3], [0.2, 0.46, 0.2], { decor: true, tinte: "gris" })],
      },
      { id: "eje", nombre: "Eje", tinte: "gris", salida: [0, -0.2, 1], formas: [caja([0, 1, 0.85], [0.4, 0.4, 0.2])] },
      { id: "aspa-arriba", nombre: "Aspa superior", tinte: "amarillo", salida: [0, 1, 0.8], formas: [caja([0, 2, 1], [0.42, 1.6, 0.08]), caja([0, 1.72, 1.045], [0.36, 0.06, 0.02], { decor: true, tinte: "naranja" }), caja([0, 2.05, 1.045], [0.36, 0.06, 0.02], { decor: true, tinte: "naranja" })] },
      { id: "aspa-abajo", nombre: "Aspa inferior", tinte: "amarillo", salida: [0, -1, 0.8], formas: [caja([0, 0, 1], [0.42, 1.6, 0.08]), caja([0, 0.28, 1.045], [0.36, 0.06, 0.02], { decor: true, tinte: "naranja" }), caja([0, -0.05, 1.045], [0.36, 0.06, 0.02], { decor: true, tinte: "naranja" })] },
      { id: "aspa-der", nombre: "Aspa derecha", tinte: "amarillo", salida: [1, 0, 0.8], formas: [caja([1, 1, 1], [1.6, 0.42, 0.08]), caja([0.72, 1, 1.045], [0.06, 0.36, 0.02], { decor: true, tinte: "naranja" }), caja([1.05, 1, 1.045], [0.06, 0.36, 0.02], { decor: true, tinte: "naranja" })] },
      { id: "aspa-izq", nombre: "Aspa izquierda", tinte: "amarillo", salida: [-1, 0, 0.8], formas: [caja([-1, 1, 1], [1.6, 0.42, 0.08]), caja([-0.72, 1, 1.045], [0.06, 0.36, 0.02], { decor: true, tinte: "naranja" }), caja([-1.05, 1, 1.045], [0.06, 0.36, 0.02], { decor: true, tinte: "naranja" })] },
      { id: "tapa", nombre: "Tapa del eje", tinte: "naranja", salida: [0, 0, 1], formas: [caja([0, 1, 1.09], [0.8, 0.8, 0.08])] },
      { id: "puerta", nombre: "Puerta", tinte: "madera", salida: [0, -0.3, 1], formas: [caja([0, -1.4, 0.94], [0.7, 1.1, 0.08]), cilindro([0.22, -1.72, 0.99], [0.09, 0.09, 0.03], "z", { decor: true, tinte: "amarillo" })] },
      { id: "ventana", nombre: "Ventana", tinte: "turquesa", salida: [0, 0, -1], formas: [caja([0, -0.6, -0.94], [0.6, 0.6, 0.08]), caja([0, -0.6, -0.985], [0.05, 0.5, 0.02], { decor: true, tinte: "nieve" })] },
    ],
    anclajes: [
      a("tapa", [-0.26, 1.26, 1.13], "+z"), a("tapa", [0.26, 1.26, 1.13], "+z"), a("tapa", [0, 0.72, 1.13], "+z"),
      a("aspa-arriba", [0, 2.45, 1.04], "+z"), a("aspa-arriba", [0, 1.3, 1.04], "+z"),
      a("aspa-abajo", [0, -0.45, 1.04], "+z"), a("aspa-abajo", [0, 0.7, 1.04], "+z"),
      a("aspa-der", [1.45, 1, 1.04], "+z"), a("aspa-der", [0.3, 1, 1.04], "+z"),
      a("aspa-izq", [-1.45, 1, 1.04], "+z"), a("aspa-izq", [-0.3, 1, 1.04], "+z"),
      a("eje", [0, 1, 0.95], "+z"), a("eje", [0.2, 1, 0.85], "+x"), a("eje", [-0.2, 1, 0.85], "-x"),
      a("atico", [0, 1, -0.75], "-z"), a("atico", [-0.75, 1, 0], "-x"), a("atico", [0.75, 1, 0], "+x"), a("atico", [0, 1, 0.75], "+z"),
      a("tejado", [0.85, 1.47, 0], "+x"), a("tejado", [-0.85, 1.47, 0], "-x"), a("tejado", [0, 1.47, 0.85], "+z"), a("tejado", [0, 1.47, -0.85], "-z"),
      a("cornisa", [0.93, 0.59, 0.93], "+y"), a("cornisa", [-0.93, 0.59, 0.93], "+y"),
      a("cornisa", [0.93, 0.59, -0.93], "+y"), a("cornisa", [-0.93, 0.59, -0.93], "+y"),
      a("cornisa", [0, 0.59, 0], "+y"),
      a("torre", [0, -1.4, 0.9], "+z"), a("torre", [0, -0.6, -0.9], "-z"),
      a("torre", [0.9, -0.6, 0.4], "+x"), a("torre", [0.9, -0.6, -0.4], "+x"),
      a("torre", [-0.9, -0.6, 0.4], "-x"), a("torre", [-0.9, -0.6, -0.4], "-x"),
      a("torre", [0.6, 0.45, 0.6], "+y"),
      a("puerta", [0.25, -1.4, 0.98], "+z"), a("puerta", [-0.25, -1.4, 0.98], "+z"),
      a("ventana", [0.2, -0.6, -0.98], "-z"), a("ventana", [-0.2, -0.6, -0.98], "-z"),
      a("zocalo", [1.15, -1.95, 1.15], "+y"), a("zocalo", [-1.15, -1.95, 1.15], "+y"),
      a("zocalo", [1.15, -1.95, -1.15], "+y"), a("zocalo", [-1.15, -1.95, -1.15], "+y"),
      a("zocalo", [0, -2.25, 0], "-y"),
    ],
  };

  // ---- Los demás juguetes solo describen sus piezas, de dentro hacia fuera ------------------
  // Los tornillos se colocan solos sobre las caras (ver generarAnclajes).
  const p = (id, nombre, tinte, ...formas) => ({ id, nombre, tinte, formas });
  const d = (pos, tam, tinte) => caja(pos, tam, { decor: true, tinte });
  const ojo = (x, y, z, r = 0.24) => [
    cilindro([x, y, z], [r, r, 0.04], "z", { decor: true, tinte: "noche" }),
    cilindro([x + r * 0.2, y + r * 0.2, z + 0.025], [r * 0.3, r * 0.3, 0.02], "z", { decor: true, tinte: "nieve" }),
  ];
  const rueda = (id, nombre, x, y, z, r) => p(id, nombre, "noche", cilindro([x, y, z], [r, r, 0.3], "z"));

  const seta = {
    id: "seta", nombre: "Seta", radio: 2.3, centro: [0, 0.1, 0],
    piezas: [
      p("cesped", "Césped", "verde", caja([0, -1.5, 0], [2.6, 0.26, 2.6]), d([0.9, -1.35, 0.8], [0.2, 0.06, 0.2], "amarillo"), d([-0.9, -1.35, -0.7], [0.2, 0.06, 0.2], "rosa")),
      p("tallo", "Tallo", "nieve", caja([0, -0.55, 0], [1.2, 1.65, 1.2]), ...ojo(-0.25, -0.5, 0.61), ...ojo(0.25, -0.5, 0.61)),
      p("faldilla", "Faldilla", "amarillo", caja([0, 0.02, 0], [1.5, 0.14, 1.5])),
      p("copa", "Sombrero", "rojo", caja([0, 0.62, 0], [2.7, 0.7, 2.7])),
      p("gorro", "Copa", "rojo", caja([0, 1.22, 0], [1.7, 0.5, 1.7]), d([0.5, 1.48, 0.4], [0.32, 0.03, 0.32], "nieve"), d([-0.55, 1.48, -0.3], [0.3, 0.03, 0.3], "nieve")),
    ],
  };

  const casita = {
    id: "casita", nombre: "Casita", radio: 2.6, centro: [0, 0.2, 0],
    piezas: [
      p("jardin", "Jardín", "verde", caja([0, -1.3, 0], [3.2, 0.26, 3])),
      p("muros", "Muros", "nieve", caja([0, -0.3, 0], [2.4, 1.75, 2])),
      p("puerta", "Puerta", "madera", caja([0, -0.68, 1.04], [0.7, 1, 0.09]), cilindro([0.22, -0.68, 1.1], [0.1, 0.1, 0.03], "z", { decor: true, tinte: "amarillo" })),
      p("ventana-a", "Ventana izquierda", "turquesa", caja([-0.78, 0.05, 1.04], [0.55, 0.55, 0.09])),
      p("ventana-b", "Ventana derecha", "turquesa", caja([0.78, 0.05, 1.04], [0.55, 0.55, 0.09])),
      p("alero", "Alero", "naranja", caja([0, 0.66, 0], [2.9, 0.18, 2.5])),
      p("tejado", "Tejado", "rojo", caja([0, 0.92, 0], [2.65, 0.34, 2.25]), cono([0, 1.5, 0], [2.6, 1.1, 2.2], { decor: true })),
      p("chimenea", "Chimenea", "gris", caja([0.7, 1.5, -0.45], [0.42, 0.9, 0.42])),
    ],
  };

  const coche = {
    id: "coche", nombre: "Coche", radio: 2.45, centro: [0, 0.15, 0],
    piezas: [
      p("chasis", "Chasis", "rojo", caja([0, -0.2, 0], [3.3, 0.7, 1.6])),
      p("cabina", "Cabina", "turquesa", caja([-0.25, 0.55, 0], [1.7, 0.8, 1.35])),
      p("techo", "Techo", "rojo", caja([-0.25, 1.02, 0], [1.9, 0.14, 1.5])),
      p("capo", "Capó", "naranja", caja([1.05, 0.2, 0], [1.05, 0.12, 1.35])),
      p("parachoques-a", "Parachoques delantero", "gris", caja([1.72, -0.35, 0], [0.16, 0.3, 1.7]), d([1.81, -0.05, 0.5], [0.04, 0.2, 0.3], "amarillo"), d([1.81, -0.05, -0.5], [0.04, 0.2, 0.3], "amarillo")),
      p("parachoques-b", "Parachoques trasero", "gris", caja([-1.72, -0.35, 0], [0.16, 0.3, 1.7])),
      rueda("rueda-a", "Rueda delantera", 1, -0.55, 0.95, 0.78),
      rueda("rueda-b", "Rueda trasera", -1, -0.55, 0.95, 0.78),
      rueda("rueda-c", "Rueda delantera", 1, -0.55, -0.95, 0.78),
      rueda("rueda-d", "Rueda trasera", -1, -0.55, -0.95, 0.78),
    ],
  };

  const pez = {
    id: "pez", nombre: "Pez", radio: 2.5, centro: [-0.2, 0, 0],
    piezas: [
      p("cuerpo", "Cuerpo", "naranja", caja([0.15, 0, 0], [2.5, 1.5, 1.1]), ...ojo(1, 0.25, 0.57, 0.34), ...ojo(1, 0.25, -0.57, 0.34)),
      p("cabeza", "Morro", "amarillo", caja([1.55, -0.05, 0], [0.45, 0.8, 0.8])),
      p("franja-a", "Franja", "nieve", caja([0.2, 0, 0.59], [0.5, 1.45, 0.07])),
      p("franja-b", "Franja", "nieve", caja([0.2, 0, -0.59], [0.5, 1.45, 0.07])),
      p("franja-c", "Franja trasera", "nieve", caja([-0.55, 0, 0.59], [0.32, 1.3, 0.07])),
      p("franja-d", "Franja trasera", "nieve", caja([-0.55, 0, -0.59], [0.32, 1.3, 0.07])),
      p("aleta-alta", "Aleta superior", "rojo", caja([-0.1, 0.98, 0], [1.3, 0.48, 0.2])),
      p("aleta-baja", "Aleta inferior", "rojo", caja([0, -0.92, 0], [0.8, 0.36, 0.2])),
      p("lateral-a", "Aleta lateral", "rojo", caja([0.55, -0.42, 0.68], [0.6, 0.42, 0.14])),
      p("lateral-b", "Aleta lateral", "rojo", caja([0.55, -0.42, -0.68], [0.6, 0.42, 0.14])),
      p("cola", "Cola", "rojo", caja([-1.45, 0, 0], [0.5, 1.5, 0.28])),
    ],
  };

  const barco = {
    id: "barco", nombre: "Barco", radio: 2.9, centro: [0, 0.55, 0],
    piezas: [
      p("casco", "Casco", "azul", caja([0, -0.65, 0], [3.8, 0.95, 1.7])),
      p("franja", "Franja", "nieve", caja([0, -0.12, 0], [3.9, 0.16, 1.8])),
      p("cubierta", "Cubierta", "madera", caja([0, 0.05, 0], [3.6, 0.14, 1.55])),
      p("proa", "Proa", "rojo", caja([2.1, -0.45, 0], [0.5, 0.7, 1.1])),
      p("cabina", "Cabina", "nieve", caja([-0.8, 0.6, 0], [1.5, 0.95, 1.2]), cilindro([-0.8, 0.7, 0.61], [0.3, 0.3, 0.03], "z", { decor: true, tinte: "turquesa" })),
      p("techo", "Techo", "rojo", caja([-0.8, 1.14, 0], [1.75, 0.12, 1.4])),
      p("chimenea", "Chimenea", "rojo", caja([-1.15, 1.55, 0], [0.5, 0.75, 0.5]), d([-1.15, 1.75, 0], [0.54, 0.14, 0.54], "noche")),
      p("mastil", "Mástil", "madera", caja([0.75, 1.5, 0], [0.18, 2.8, 0.18])),
      p("vela", "Vela", "nieve", caja([1.28, 1.75, 0], [0.9, 1.7, 0.1])),
      p("bandera", "Bandera", "amarillo", caja([0.28, 2.65, 0], [0.75, 0.42, 0.08])),
    ],
  };

  const tortuga = {
    id: "tortuga", nombre: "Tortuga", radio: 2.6, centro: [0.1, 0, 0],
    piezas: [
      p("cuerpo", "Cuerpo", "lima", caja([0, -0.45, 0], [2.5, 0.65, 2])),
      p("caparazon", "Caparazón", "verde", caja([0, 0.3, 0], [2.7, 0.9, 2.2])),
      p("techo", "Lomo", "verde", caja([0, 0.98, 0], [1.9, 0.46, 1.5])),
      p("placa-a", "Placa", "amarillo", caja([-0.8, 0.3, 1.14], [0.7, 0.55, 0.08])),
      p("placa-b", "Placa", "amarillo", caja([0.8, 0.3, 1.14], [0.7, 0.55, 0.08])),
      p("placa-c", "Placa", "amarillo", caja([-0.8, 0.3, -1.14], [0.7, 0.55, 0.08])),
      p("placa-d", "Placa", "amarillo", caja([0.8, 0.3, -1.14], [0.7, 0.55, 0.08])),
      p("cuello", "Cuello", "lima", caja([1.55, -0.1, 0], [0.55, 0.55, 0.65])),
      p("cabeza", "Cabeza", "lima", caja([2.05, 0.15, 0], [0.8, 0.8, 0.95]), ...ojo(2.3, 0.3, 0.49), ...ojo(2.3, 0.3, -0.49)),
      p("pata-a", "Pata", "lima", caja([0.9, -0.95, 0.85], [0.7, 0.55, 0.7])),
      p("pata-b", "Pata", "lima", caja([-0.9, -0.95, 0.85], [0.7, 0.55, 0.7])),
      p("pata-c", "Pata", "lima", caja([0.9, -0.95, -0.85], [0.7, 0.55, 0.7])),
      p("pata-d", "Pata", "lima", caja([-0.9, -0.95, -0.85], [0.7, 0.55, 0.7])),
      p("cola", "Cola", "lima", caja([-1.5, -0.3, 0], [0.45, 0.3, 0.32])),
    ],
  };

  const cohete = {
    id: "cohete", nombre: "Cohete", radio: 3, centro: [0, 0.2, 0],
    piezas: [
      p("cuerpo", "Cuerpo", "nieve", caja([0, 0, 0], [1.6, 3, 1.6])),
      p("nariz", "Nariz", "rojo", caja([0, 1.68, 0], [1.55, 0.36, 1.55]), cono([0, 2.35, 0], [1.5, 1.1, 1.5])),
      p("anillo-alto", "Anillo superior", "azul", caja([0, 1.2, 0], [1.75, 0.22, 1.75])),
      p("anillo-bajo", "Anillo inferior", "azul", caja([0, -0.95, 0], [1.75, 0.22, 1.75])),
      p("ventana", "Ojo de buey", "gris", caja([0, 0.45, 0.83], [0.8, 0.8, 0.08]), cilindro([0, 0.45, 0.88], [0.5, 0.5, 0.03], "z", { decor: true, tinte: "turquesa" })),
      p("placa", "Placa trasera", "gris", caja([0, 0.1, -0.83], [1, 1.5, 0.08])),
      p("aleta-a", "Aleta", "rojo", caja([1.15, -1.25, 0], [0.75, 1.1, 0.22])),
      p("aleta-b", "Aleta", "rojo", caja([-1.15, -1.25, 0], [0.75, 1.1, 0.22])),
      p("aleta-c", "Aleta", "rojo", caja([0, -1.25, 1.15], [0.22, 1.1, 0.75])),
      p("aleta-d", "Aleta", "rojo", caja([0, -1.25, -1.15], [0.22, 1.1, 0.75])),
      p("tobera", "Tobera", "noche", caja([0, -1.82, 0], [1.05, 0.65, 1.05]), d([0, -2.2, 0], [0.55, 0.14, 0.55], "naranja")),
    ],
  };

  const castillo = {
    id: "castillo", nombre: "Castillo", radio: 3.1, centro: [0, 0.35, 0],
    piezas: [
      p("base", "Base", "verde", caja([0, -1.5, 0], [4.1, 0.26, 3.5])),
      p("muralla", "Muralla", "gris", caja([0, -0.55, 0], [3, 1.65, 2.3])),
      p("patio", "Torre central", "nieve", caja([0, 0.85, 0], [1.3, 1.2, 1.3])),
      p("techo", "Tejado central", "azul", caja([0, 1.62, 0], [1.5, 0.36, 1.5]), cono([0, 2.25, 0], [1.5, 0.95, 1.5])),
      p("puerta", "Puerta", "madera", caja([0, -0.85, 1.2], [0.9, 1.05, 0.1])),
      p("torre-a", "Torre", "gris", caja([1.5, -0.2, 1.15], [0.9, 2.35, 0.9])),
      p("torre-b", "Torre", "gris", caja([-1.5, -0.2, 1.15], [0.9, 2.35, 0.9])),
      p("torre-c", "Torre", "gris", caja([1.5, -0.2, -1.15], [0.9, 2.35, 0.9])),
      p("torre-d", "Torre", "gris", caja([-1.5, -0.2, -1.15], [0.9, 2.35, 0.9])),
      p("punta-a", "Tejado de torre", "rojo", caja([1.5, 1.15, 1.15], [1.08, 0.36, 1.08]), cono([1.5, 1.75, 1.15], [1.05, 0.85, 1.05])),
      p("punta-b", "Tejado de torre", "rojo", caja([-1.5, 1.15, 1.15], [1.08, 0.36, 1.08]), cono([-1.5, 1.75, 1.15], [1.05, 0.85, 1.05])),
      p("punta-c", "Tejado de torre", "rojo", caja([1.5, 1.15, -1.15], [1.08, 0.36, 1.08]), cono([1.5, 1.75, -1.15], [1.05, 0.85, 1.05])),
      p("punta-d", "Tejado de torre", "rojo", caja([-1.5, 1.15, -1.15], [1.08, 0.36, 1.08]), cono([-1.5, 1.75, -1.15], [1.05, 0.85, 1.05])),
      p("escudo", "Escudo", "amarillo", caja([0, 0.1, 1.2], [0.75, 0.42, 0.1])),
      p("bandera", "Bandera", "rosa", caja([0, 3.05, 0], [0.09, 0.75, 0.09]), d([0.26, 3.25, 0], [0.45, 0.28, 0.05], "rosa")),
    ],
  };

  const conejo = {
    id: "conejo", nombre: "Conejo", radio: 3, centro: [0, 0.55, 0],
    piezas: [
      p("cuerpo", "Cuerpo", "rosa", caja([0, -0.55, 0], [1.9, 1.75, 1.6])),
      p("barriga", "Barriga", "nieve", caja([0, -0.65, 0.84], [1.25, 1.25, 0.1])),
      p("cabeza", "Cabeza", "rosa", caja([0, 1, 0], [1.8, 1.35, 1.5])),
      p("cara", "Cara", "nieve", caja([0, 0.85, 0.79], [1.25, 0.72, 0.08]), ...ojo(-0.36, 1.03, 0.84), ...ojo(0.36, 1.03, 0.84), cilindro([0, 0.78, 0.85], [0.17, 0.12, 0.03], "z", { decor: true, tinte: "rojo" })),
      p("oreja-a", "Oreja", "rosa", caja([-0.5, 2.3, 0], [0.5, 1.5, 0.36]), d([-0.5, 2.3, 0.19], [0.24, 1.15, 0.03], "nieve")),
      p("oreja-b", "Oreja", "rosa", caja([0.5, 2.3, 0], [0.5, 1.5, 0.36]), d([0.5, 2.3, 0.19], [0.24, 1.15, 0.03], "nieve")),
      p("brazo-a", "Brazo", "rosa", caja([-1.2, -0.3, 0.3], [0.5, 1, 0.5])),
      p("brazo-b", "Brazo", "rosa", caja([1.2, -0.3, 0.3], [0.5, 1, 0.5])),
      p("pie-a", "Pie", "nieve", caja([-0.42, -1.6, 0.3], [0.84, 0.36, 1.25])),
      p("pie-b", "Pie", "nieve", caja([0.42, -1.6, 0.3], [0.84, 0.36, 1.25])),
      p("cola", "Cola", "nieve", caja([0, -0.9, -1], [0.55, 0.55, 0.42])),
      p("zanahoria", "Zanahoria", "naranja", caja([1.6, 0.1, 0.55], [0.3, 1, 0.3]), d([1.6, 0.68, 0.55], [0.2, 0.2, 0.2], "verde")),
    ],
  };

  const camion = {
    id: "camion", nombre: "Camión", radio: 3.25, centro: [0, 0.2, 0],
    piezas: [
      p("chasis", "Chasis", "noche", caja([0, -0.7, 0], [5, 0.34, 1.6])),
      p("cabina", "Cabina", "amarillo", caja([1.75, 0.2, 0], [1.4, 1.5, 1.7])),
      p("parabrisas", "Parabrisas", "turquesa", caja([2.48, 0.5, 0], [0.08, 0.72, 1.4])),
      p("rejilla", "Rejilla", "gris", caja([2.48, -0.25, 0], [0.08, 0.55, 1.4]), d([2.54, -0.25, 0.55], [0.03, 0.26, 0.26], "amarillo"), d([2.54, -0.25, -0.55], [0.03, 0.26, 0.26], "amarillo")),
      p("techo", "Techo", "naranja", caja([1.75, 1.02, 0], [1.55, 0.14, 1.85])),
      p("remolque", "Remolque", "azul", caja([-0.75, 0.42, 0], [3.3, 1.9, 1.85])),
      p("lona-a", "Panel lateral", "nieve", caja([-1.5, 0.42, 0.97], [1.3, 1.25, 0.08])),
      p("lona-b", "Panel lateral", "nieve", caja([0, 0.42, 0.97], [1.3, 1.25, 0.08])),
      p("lona-c", "Panel lateral", "nieve", caja([-1.5, 0.42, -0.97], [1.3, 1.25, 0.08])),
      p("lona-d", "Panel lateral", "nieve", caja([0, 0.42, -0.97], [1.3, 1.25, 0.08])),
      p("portón", "Portón", "gris", caja([-2.44, 0.42, 0], [0.08, 1.6, 1.5])),
      rueda("rueda-a", "Rueda", 1.75, -0.9, 0.95, 0.8),
      rueda("rueda-b", "Rueda", 1.75, -0.9, -0.95, 0.8),
      rueda("rueda-c", "Rueda", -0.5, -0.9, 0.95, 0.8),
      rueda("rueda-d", "Rueda", -0.5, -0.9, -0.95, 0.8),
      rueda("rueda-e", "Rueda", -1.75, -0.9, 0.95, 0.8),
      rueda("rueda-f", "Rueda", -1.75, -0.9, -0.95, 0.8),
    ],
  };

  const elefante = {
    id: "elefante", nombre: "Elefante", radio: 3.2, centro: [0.3, 0.15, 0],
    piezas: [
      p("cuerpo", "Cuerpo", "gris", caja([-0.4, 0.15, 0], [3, 2, 2])),
      p("manta", "Manta", "rosa", caja([-0.4, 1.2, 0], [1.9, 0.14, 2.2]), d([-0.4, 0.75, 1.1], [1.75, 0.9, 0.03], "rosa"), d([-0.4, 0.75, -1.1], [1.75, 0.9, 0.03], "rosa")),
      p("silla", "Silla", "amarillo", caja([-0.4, 1.55, 0], [1.2, 0.56, 1.2])),
      p("cabeza", "Cabeza", "gris", caja([1.55, 0.65, 0], [1.3, 1.5, 1.6]), ...ojo(2.21, 0.9, 0.5), ...ojo(2.21, 0.9, -0.5)),
      p("oreja-a", "Oreja", "rosa", caja([1.35, 0.75, 1.02], [0.9, 1.25, 0.14])),
      p("oreja-b", "Oreja", "rosa", caja([1.35, 0.75, -1.02], [0.9, 1.25, 0.14])),
      p("trompa-a", "Trompa", "gris", caja([2.42, 0.25, 0], [0.55, 0.6, 0.6])),
      p("trompa-b", "Trompa", "gris", caja([2.55, -0.35, 0], [0.48, 0.6, 0.52])),
      p("trompa-c", "Punta de la trompa", "gris", caja([2.72, -0.9, 0], [0.42, 0.5, 0.46])),
      p("colmillo-a", "Colmillo", "nieve", caja([2.25, -0.25, 0.48], [0.2, 0.6, 0.2])),
      p("colmillo-b", "Colmillo", "nieve", caja([2.25, -0.25, -0.48], [0.2, 0.6, 0.2])),
      p("pata-a", "Pata", "gris", caja([0.55, -1.35, 0.65], [0.8, 1.05, 0.72])),
      p("pata-b", "Pata", "gris", caja([-1.4, -1.35, 0.65], [0.8, 1.05, 0.72])),
      p("pata-c", "Pata", "gris", caja([0.55, -1.35, -0.65], [0.8, 1.05, 0.72])),
      p("pata-d", "Pata", "gris", caja([-1.4, -1.35, -0.65], [0.8, 1.05, 0.72])),
      p("cola", "Cola", "gris", caja([-2.05, 0.15, 0], [0.32, 0.9, 0.24])),
    ],
  };

  const dinosaurio = {
    id: "dinosaurio", nombre: "Dinosaurio", radio: 3.4, centro: [0, 0.35, 0],
    piezas: [
      p("cuerpo", "Cuerpo", "verde", caja([-0.2, -0.05, 0], [2.3, 1.9, 1.65])),
      p("barriga", "Barriga", "amarillo", caja([0.42, -0.25, 0], [1.2, 1.3, 1.72])),
      p("cuello", "Cuello", "verde", caja([1.05, 1.05, 0], [0.95, 1.15, 1])),
      p("cabeza", "Cabeza", "verde", caja([1.5, 2.05, 0], [1.75, 0.95, 1.2]), ...ojo(1.75, 2.28, 0.61), ...ojo(1.75, 2.28, -0.61)),
      p("mandibula", "Mandíbula", "lima", caja([1.72, 1.42, 0], [1.3, 0.3, 1.05]), d([2.2, 1.6, 0.3], [0.12, 0.14, 0.12], "nieve"), d([2.2, 1.6, -0.3], [0.12, 0.14, 0.12], "nieve")),
      p("cola-a", "Cola", "verde", caja([-1.8, -0.1, 0], [1, 1.2, 1.15])),
      p("cola-b", "Cola", "verde", caja([-2.6, -0.2, 0], [0.75, 0.82, 0.82])),
      p("cola-c", "Punta de la cola", "lima", caja([-3.2, -0.3, 0], [0.55, 0.52, 0.52])),
      p("pata-a", "Pata", "verde", caja([-0.45, -1.45, 0.65], [0.9, 1, 0.65])),
      p("pata-b", "Pata", "verde", caja([-0.45, -1.45, -0.65], [0.9, 1, 0.65])),
      p("pie-a", "Pie", "lima", caja([-0.25, -2.05, 0.65], [1.35, 0.26, 0.8])),
      p("pie-b", "Pie", "lima", caja([-0.25, -2.05, -0.65], [1.35, 0.26, 0.8])),
      p("brazo-a", "Brazo", "lima", caja([0.75, 0.15, 1.03], [0.55, 0.28, 0.3])),
      p("brazo-b", "Brazo", "lima", caja([0.75, 0.15, -1.03], [0.55, 0.28, 0.3])),
      p("placa-a", "Placa", "naranja", caja([0.1, 1.2, 0], [0.6, 0.5, 0.16])),
      p("placa-b", "Placa", "naranja", caja([-0.75, 1.2, 0], [0.6, 0.5, 0.16])),
      p("placa-c", "Placa", "naranja", caja([-1.8, 0.75, 0], [0.5, 0.42, 0.16])),
      p("placa-d", "Placa", "naranja", caja([-2.6, 0.4, 0], [0.42, 0.36, 0.14])),
    ],
  };

  // Coloca tornillos en una rejilla sobre las caras de cada pieza. Solo los acepta si los tapan
  // piezas de más fuera: como la lista va de dentro hacia fuera, dos piezas nunca se bloquean
  // mutuamente y siempre existe un orden para desmontar el juguete.
  function generarAnclajes(modelo) {
    const tam = modelo.radio * 0.068, paso = tam * 2.9, margen = tam * 1.05;
    const orden = new Map(modelo.piezas.map((pieza, i) => [pieza.id, i]));
    const adornos = modelo.piezas.flatMap(pieza => pieza.formas.filter(f => f.decor && f.tipo !== "cono"));
    const rejilla = lado => {
      const cabe = Math.floor(Math.max(lado - margen * 2, 0) / paso);
      return Array.from({ length: cabe + 1 }, (_, i) => (i - cabe / 2) * paso);
    };
    const dentro = (punto, forma, holgura = 0) => forma.pos.every((v, i) => Math.abs(punto[i] - v) < forma.tam[i] / 2 + holgura);
    const puedeTapar = (pieza, a) => Reglas.calcularBloqueos(modelo, a).bloqueadoPor.every(otra => orden.get(otra) > orden.get(pieza.id));
    const caras = pieza => pieza.formas.filter(f => !f.decor && f.tipo !== "cono").flatMap(forma =>
      (forma.tipo === "cilindro" ? [forma.eje === "z" ? 2 : 1] : [0, 1, 2]).flatMap(eje => [1, -1]
        // Un cilindro (una rueda) solo lleva tornillo por fuera: por dentro no llegaría el dedo.
        .filter(signo => forma.tipo !== "cilindro" || !forma.pos[eje] || signo === Math.sign(forma.pos[eje]))
        .map(signo => ({ forma, eje, signo }))));
    // Un cono es una pirámide: se estrecha al subir. Un tornillo dentro de ella no se vería.
    const conos = modelo.piezas.flatMap(pieza => pieza.formas.filter(f => f.tipo === "cono"));
    const dentroDeCono = ({ pos, normal }, cono) => {
      const cabeza = pos.map((v, i) => v + normal[i] * tam * 0.6);
      const altura = (cabeza[1] - (cono.pos[1] - cono.tam[1] / 2)) / cono.tam[1];
      if (altura < 0 || altura > 1) return false;
      const mitad = (1 - altura) * cono.tam[0] / 2 + tam * 0.5;
      return Math.abs(cabeza[0] - cono.pos[0]) < mitad && Math.abs(cabeza[2] - cono.pos[2]) < mitad;
    };
    const anclajes = [];
    // De fuera hacia dentro: los tornillos a la vista eligen sitio antes que los ocultos.
    for (const pieza of [...modelo.piezas].reverse()) {
      const solidas = pieza.formas.filter(f => !f.decor && f.tipo !== "cono");
      const propios = [];
      for (const { forma, eje, signo } of caras(pieza)) {
        const [u, v] = [0, 1, 2].filter(i => i !== eje);
        if (Math.min(forma.tam[u], forma.tam[v]) < tam * 1.5) continue;
        for (const du of rejilla(forma.tam[u])) for (const dv of rejilla(forma.tam[v])) {
          const pos = [...forma.pos];
          pos[eje] += signo * forma.tam[eje] / 2;
          pos[u] += du;
          pos[v] += dv;
          const normal = [0, 0, 0];
          normal[eje] = signo;
          const candidato = { pieza: pieza.id, pos, normal };
          if (solidas.some(f => f !== forma && dentro(pos, f, -0.001))) continue;
          if (adornos.some(f => dentro(pos, f, tam))) continue;
          if (conos.some(c => dentroDeCono({ pos, normal }, c))) continue;
          if (!puedeTapar(pieza, candidato)) continue;
          // Dos tornillos no pueden solaparse, salvo que uno esté escondido bajo la pieza del otro.
          const { tapadoPor } = Reglas.calcularBloqueos(modelo, candidato);
          const estorba = [...anclajes, ...propios].some(a => !tapadoPor.includes(a.pieza) && Math.hypot(...a.pos.map((c, i) => c - pos[i])) < tam * 2.2);
          if (!estorba) propios.push(candidato);
        }
      }
      // Una pieza muy pequeña también necesita su tornillo: el del centro de la cara mayor libre.
      if (!propios.length) {
        const opciones = caras(pieza).map(({ forma, eje, signo }) => {
          const pos = [...forma.pos];
          pos[eje] += signo * forma.tam[eje] / 2;
          const normal = [0, 0, 0];
          normal[eje] = signo;
          const area = forma.tam.reduce((m, t, i) => (i === eje ? m : m * t), 1);
          return { candidato: { pieza: pieza.id, pos, normal }, area };
        }).filter(o => puedeTapar(pieza, o.candidato) && !conos.some(c => dentroDeCono(o.candidato, c))).sort((x, y) => y.area - x.area);
        if (opciones.length) propios.push(opciones[0].candidato);
      }
      anclajes.push(...propios);
    }
    return anclajes;
  }

  const todos = { pinguino, seta, casita, coche, pez, radio, barco, tortuga, cohete, castillo, conejo, camion, molino, elefante, dinosaurio };

  return {
    todos,
    obtener(id) {
      const modelo = todos[id];
      if (modelo && !modelo.anclajes) modelo.anclajes = generarAnclajes(modelo);
      return modelo;
    },
  };
})();
