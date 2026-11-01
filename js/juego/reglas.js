// Reglas de Despiece. Lógica pura: no usa Three.js ni el DOM, así se puede probar sin dibujar nada.
//
// Condición de inicio: modelo montado, bandeja vacía y cuatro cajas abiertas.
// Condición de ganar:  todos los tornillos en sus cajas.
// Condición de perder: la bandeja se llena.
const Reglas = (() => {
  const CAPACIDAD_CAJA = 3;
  const CAJAS_VISIBLES = 4;
  const ALCANCE_BLOQUEO = 0.9;   // Lo que hay que sacar el tornillo para retirarlo.
  const ALTURA_CABEZA = 0.09;    // Si algo está más cerca, la cabeza queda escondida dentro.

  function limites(forma) {
    return {
      min: forma.pos.map((v, i) => v - forma.tam[i] / 2),
      max: forma.pos.map((v, i) => v + forma.tam[i] / 2),
    };
  }

  // Corte de un rayo con una caja por el método de las láminas. Devuelve la distancia o null.
  function cortaRayo(origen, direccion, caja) {
    let entrada = 0, salida = ALCANCE_BLOQUEO;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(direccion[i]) < 1e-9) {
        if (origen[i] < caja.min[i] || origen[i] > caja.max[i]) return null;
        continue;
      }
      let a = (caja.min[i] - origen[i]) / direccion[i];
      let b = (caja.max[i] - origen[i]) / direccion[i];
      if (a > b) [a, b] = [b, a];
      entrada = Math.max(entrada, a);
      salida = Math.min(salida, b);
      if (entrada > salida) return null;
    }
    return entrada;
  }

  // Qué piezas impiden sacar cada tornillo, deducido de la geometría del modelo.
  function calcularBloqueos(modelo, anclaje) {
    const bloqueadoPor = [], tapadoPor = [];
    const origen = anclaje.pos.map((v, i) => v + anclaje.normal[i] * 0.001);
    for (const pieza of modelo.piezas) {
      if (pieza.id === anclaje.pieza) continue;
      let cercania = null;
      for (const forma of pieza.formas) {
        if (forma.decor) continue;
        const t = cortaRayo(origen, anclaje.normal, limites(forma));
        if (t !== null && (cercania === null || t < cercania)) cercania = t;
      }
      if (cercania === null) continue;
      bloqueadoPor.push(pieza.id);
      if (cercania < ALTURA_CABEZA) tapadoPor.push(pieza.id);
    }
    return { bloqueadoPor, tapadoPor };
  }

  class Partida {
    constructor(nivel, orden = []) {
      this.nivel = nivel;
      this.tornillos = new Map(nivel.tornillos.map(t => [t.id, t]));
      this.retirados = new Set();
      this.restantes = new Map();
      for (const t of nivel.tornillos) this.restantes.set(t.pieza, (this.restantes.get(t.pieza) || 0) + 1);
      this.cajas = nivel.cajas.map(color => ({ color, tornillos: [] }));
      this.bandeja = [];
      this.orden = [];
      this.picoBandeja = 0;
      this.ayudas = 0;
      this.estado = "jugando";
      for (const id of orden) this.quitar(id);
    }

    get activas() {
      return this.cajas.map((c, i) => ({ ...c, indice: i }))
        .filter(c => c.tornillos.length < CAPACIDAD_CAJA)
        .slice(0, CAJAS_VISIBLES);
    }

    presente(pieza) { return this.restantes.get(pieza) > 0; }
    bloqueadores(id) { return this.tornillos.get(id).bloqueadoPor.filter(p => this.presente(p)); }
    oculto(id) { return this.tornillos.get(id).tapadoPor.some(p => this.presente(p)); }
    libre(id) { return !this.retirados.has(id) && this.bloqueadores(id).length === 0; }
    libres() { return this.nivel.tornillos.filter(t => this.libre(t.id)).map(t => t.id); }

    cajaPara(color) { return this.activas.find(c => c.color === color) ?? null; }

    comprobar(id) {
      if (this.estado !== "jugando") return { ok: false, motivo: "terminada" };
      if (!this.tornillos.has(id)) return { ok: false, motivo: "desconocido" };
      if (this.retirados.has(id)) return { ok: false, motivo: "retirado" };
      const tapan = this.bloqueadores(id);
      if (tapan.length) return { ok: false, motivo: "tapado", tapadoPor: tapan };
      return { ok: true };
    }

    quitar(id) {
      const comprobacion = this.comprobar(id);
      if (!comprobacion.ok) return comprobacion;
      const eventos = [];
      const tornillo = this.tornillos.get(id);
      this.retirados.add(id);
      this.orden.push(id);

      const caja = this.cajaPara(tornillo.color);
      if (caja) {
        this.cajas[caja.indice].tornillos.push(id);
        eventos.push({ tipo: "a-caja", id, caja: caja.indice });
      } else {
        this.bandeja.push(id);
        this.picoBandeja = Math.max(this.picoBandeja, this.bandeja.length);
        eventos.push({ tipo: "a-bandeja", id });
      }

      this.restantes.set(tornillo.pieza, this.restantes.get(tornillo.pieza) - 1);
      if (this.restantes.get(tornillo.pieza) === 0) eventos.push({ tipo: "pieza-cae", pieza: tornillo.pieza });

      this.asentar(eventos);
      this.evaluar();
      return { ok: true, eventos };
    }

    // Al abrirse una caja nueva, los tornillos de su color saltan solos desde la bandeja.
    asentar(eventos) {
      for (let cambio = true; cambio;) {
        cambio = false;
        for (const c of this.cajas) {
          if (c.tornillos.length === CAPACIDAD_CAJA && !c.completa) {
            c.completa = true;
            eventos.push({ tipo: "caja-completa", caja: this.cajas.indexOf(c) });
            cambio = true;
          }
        }
        for (const id of [...this.bandeja]) {
          const caja = this.cajaPara(this.tornillos.get(id).color);
          if (!caja) continue;
          this.bandeja.splice(this.bandeja.indexOf(id), 1);
          this.cajas[caja.indice].tornillos.push(id);
          eventos.push({ tipo: "bandeja-a-caja", id, caja: caja.indice });
          cambio = true;
        }
      }
    }

    evaluar() {
      if (this.cajas.every(c => c.completa)) { this.estado = "ganada"; return; }
      if (this.bandeja.length >= this.nivel.bandeja) this.estado = "perdida";
    }

    copia() { return new Partida(this.nivel, this.orden); }
  }

  // Busca una forma de terminar desde el estado actual. El resultado de una partida solo depende
  // de qué tornillos se han retirado, no de en qué orden; por eso basta con recordar ese conjunto.
  function resolver(partida, { presupuesto = 40000 } = {}) {
    const vistos = new Set();
    let nodos = 0;
    const buscar = p => {
      if (p.estado === "ganada") return [];
      if (p.estado === "perdida" || ++nodos > presupuesto) return null;
      const clave = [...p.retirados].sort((a, b) => a - b).join();
      if (vistos.has(clave)) return null;
      vistos.add(clave);
      // Primero los que caben en una caja: es lo que haría una persona.
      const jugadas = p.libres().filter(id => p.comprobar(id).ok)
        .sort((a, b) => (p.cajaPara(p.tornillos.get(b).color) ? 1 : 0) - (p.cajaPara(p.tornillos.get(a).color) ? 1 : 0));
      for (const id of jugadas) {
        const siguiente = p.copia();
        siguiente.ayudas = p.ayudas;
        siguiente.quitar(id);
        const resto = buscar(siguiente);
        if (resto) return [id, ...resto];
      }
      return null;
    };
    return buscar(partida);
  }

  function pista(partida) {
    const solucion = resolver(partida);
    if (solucion?.length) return solucion[0];
    return null;
  }

  // Sellos de la lámina. No terminar a la primera no se castiga con perder la lámina:
  // se puede repetir sin coste, solo cambia cuántos sellos se llevan.
  function sellos(partida) {
    if (partida.ayudas > 0) return 1;
    return partida.picoBandeja <= Math.max(1, partida.nivel.bandeja - 2) ? 3 : 2;
  }

  return { Partida, calcularBloqueos, resolver, pista, sellos, CAPACIDAD_CAJA, CAJAS_VISIBLES };
})();
