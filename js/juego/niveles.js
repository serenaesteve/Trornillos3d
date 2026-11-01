// Generador de niveles. Un nivel no se comprueba después de hacerlo: se construye a partir de
// una forma de resolverlo, así que siempre tiene solución. Es determinista por su semilla.
const Niveles = (() => {
  // n: tornillos, colores: tintas distintas, bandeja: huecos, mezcla: tornillos cambiados de caja,
  // capas: probabilidad de preferir tornillos tapados por otras piezas (de 0 a 1).
  // Cada nivel es un juguete distinto. Las semillas se eligieron midiendo partidas simuladas:
  // cada nivel debe ser más difícil que el anterior.
  const TABLA = [
    { modelo: "pinguino", n: 12, colores: 4, bandeja: 5, mezcla: 0, capas: 0, semilla: 1001 },
    { modelo: "seta", n: 12, colores: 4, bandeja: 5, mezcla: 1, capas: 0.2, semilla: 2001 },
    { modelo: "casita", n: 15, colores: 6, bandeja: 5, mezcla: 5, capas: 0.6, semilla: 3001 },
    { modelo: "coche", n: 21, colores: 6, bandeja: 5, mezcla: 7, capas: 0.7, semilla: 4079 },
    { modelo: "pez", n: 24, colores: 7, bandeja: 5, mezcla: 9, capas: 0.8, semilla: 5079 },
    { modelo: "radio", n: 27, colores: 7, bandeja: 5, mezcla: 11, capas: 1, semilla: 6030 },
    { modelo: "barco", n: 27, colores: 7, bandeja: 4, mezcla: 11, capas: 0.9, semilla: 7043 },
    { modelo: "tortuga", n: 30, colores: 8, bandeja: 4, mezcla: 12, capas: 1, semilla: 8021 },
    { modelo: "cohete", n: 30, colores: 7, bandeja: 4, mezcla: 12, capas: 1, semilla: 9020 },
    { modelo: "castillo", n: 33, colores: 8, bandeja: 4, mezcla: 12, capas: 1, semilla: 10053 },
    { modelo: "conejo", n: 33, colores: 8, bandeja: 4, mezcla: 14, capas: 1, semilla: 11035 },
    { modelo: "camion", n: 36, colores: 8, bandeja: 4, mezcla: 20, capas: 1, semilla: 12008 },
    { modelo: "molino", n: 39, colores: 8, bandeja: 4, mezcla: 22, capas: 1, semilla: 13056 },
    { modelo: "elefante", n: 42, colores: 8, bandeja: 3, mezcla: 14, capas: 1, semilla: 14044 },
    { modelo: "dinosaurio", n: 48, colores: 8, bandeja: 3, mezcla: 18, capas: 1, semilla: 15046 },
  ];

  function azar(semilla) {
    let a = semilla >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function barajar(lista, r) {
    for (let i = lista.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [lista[i], lista[j]] = [lista[j], lista[i]];
    }
    return lista;
  }

  // Cada pieza necesita al menos un tornillo; el resto se reparte, con preferencia por los
  // tapados según `capas`: cuantos más haya, menos tornillos a la vista para elegir.
  function elegirAnclajes(modelo, n, capas, r) {
    const candidatos = modelo.anclajes.map((a, indice) => ({ ...a, indice, ...Reglas.calcularBloqueos(modelo, a) }));
    const elegidos = [];
    for (const pieza of modelo.piezas) {
      const propios = barajar(candidatos.filter(c => c.pieza === pieza.id), r);
      elegidos.push(propios[0]);
    }
    const resto = barajar(candidatos.filter(c => !elegidos.includes(c)), r)
      .map(c => ({ c, peso: c.bloqueadoPor.length && r() < capas ? 0 : 1 }))
      .sort((x, y) => x.peso - y.peso)
      .map(x => x.c);
    return elegidos.concat(resto.slice(0, n - elegidos.length));
  }

  // Orden válido de retirada: en cada paso, un tornillo cualquiera de los que estén libres.
  function ordenDeRetirada(tornillos, r) {
    const restantes = new Map();
    for (const t of tornillos) restantes.set(t.pieza, (restantes.get(t.pieza) || 0) + 1);
    const pendientes = new Set(tornillos);
    const orden = [];
    while (pendientes.size) {
      const libres = [...pendientes].filter(t => t.bloqueadoPor.every(p => !restantes.get(p)));
      if (!libres.length) return null;   // Dos piezas se tapan mutuamente: este reparto no sirve.
      const t = libres[Math.floor(r() * libres.length)];
      pendientes.delete(t);
      restantes.set(t.pieza, restantes.get(t.pieza) - 1);
      orden.push(t);
    }
    return orden;
  }

  function construir(numero) {
    const def = TABLA[numero - 1];
    if (!def) return null;
    const modelo = Modelos.obtener(def.modelo);
    const r = azar(def.semilla);

    for (let intento = 0; intento < 500; intento++) {
      const anclajes = elegirAnclajes(modelo, def.n, def.capas, r);
      const tornillos = anclajes.map((a, id) => ({ ...a, id }));
      const orden = ordenDeRetirada(tornillos, r);
      if (!orden) continue;

      // Cada tres tornillos del orden forman una caja...
      const grupos = [];
      for (let i = 0; i < orden.length; i += Reglas.CAPACIDAD_CAJA) grupos.push(orden.slice(i, i + Reglas.CAPACIDAD_CAJA));
      // ...y algunos se cambian por los de una caja que aún no está abierta: si se retiran
      // por orden hay que usar la bandeja, y ahí está la dificultad.
      for (let m = 0; m < def.mezcla; m++) {
        const a = Math.floor(r() * grupos.length);
        const b = a + Reglas.CAJAS_VISIBLES + Math.floor(r() * 2);
        if (b >= grupos.length) continue;
        const i = Math.floor(r() * Reglas.CAPACIDAD_CAJA), j = Math.floor(r() * Reglas.CAPACIDAD_CAJA);
        [grupos[a][i], grupos[b][j]] = [grupos[b][j], grupos[a][i]];
      }

      // Las cajas abiertas a la vez no repiten color si hay tintas de sobra.
      // Se elige entre las menos usadas, para que aparezcan todas las del nivel.
      const cajas = [];
      const usos = Array(def.colores).fill(0);
      for (const grupo of grupos) {
        const recientes = cajas.slice(-(Reglas.CAJAS_VISIBLES - 1));
        let opciones = usos.map((_, c) => c).filter(c => !recientes.includes(c));
        if (!opciones.length) opciones = usos.map((_, c) => c).filter(c => c !== cajas[cajas.length - 1]);
        const minimo = Math.min(...opciones.map(c => usos[c]));
        const validas = opciones.filter(c => usos[c] === minimo);
        const color = validas[Math.floor(r() * validas.length)];
        usos[color]++;
        cajas.push(color);
        for (const t of grupo) t.color = color;
      }

      const nivel = {
        numero,
        modelo: def.modelo,
        bandeja: def.bandeja,
        tornillos,
        cajas,
        solucion: orden.map(t => t.id),
      };

      // La solución de construcción debe caber en la bandeja, con un hueco de margen.
      const prueba = new Reglas.Partida(nivel, nivel.solucion);
      if (prueba.estado === "ganada" && prueba.picoBandeja <= def.bandeja - 1) return nivel;
    }
    throw new Error(`No se ha podido generar el nivel ${numero}`);
  }

  const memoria = new Map();
  function obtener(numero) {
    if (!memoria.has(numero)) memoria.set(numero, construir(numero));
    return memoria.get(numero);
  }

  return {
    obtener,
    total: TABLA.length,
    definicion: numero => TABLA[numero - 1],
  };
})();
