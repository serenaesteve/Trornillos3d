// Taller: construye el juguete en 3D con actores del motor y anima lo que dictan las reglas.
// No decide nada del juego: las reglas dicen qué pasa y el taller lo enseña.
class Taller {
  constructor(escena, modelo, tornillos, recursos) {
    this.escena = escena;
    this.modelo = modelo;
    this.recursos = recursos;
    this.piezas = new Map();
    this.tornillos = new Map();
    this.marca = null;
    this.tamano = modelo.radio * 0.068;
    this.raiz = new Actor({ nombre: `modelo:${modelo.id}` });
    escena.agregar(this.raiz);
    this.particulas = escena.agregar(new Particulas({ tamano: modelo.radio * 0.05 }));

    escena.camara.objetivo.set(...modelo.centro);
    escena.camara.margen = 0.92;
    escena.camara.encuadrar(modelo.radio);
    Estudio.montar(escena.motor, escena, { radio: modelo.radio });

    this.crearSombra();
    for (const pieza of modelo.piezas) this.crearPieza(pieza);
    for (const tornillo of tornillos) this.crearTornillo(tornillo);
    for (const pieza of modelo.piezas) this.crearAgujeros(pieza, tornillos.filter(t => t.pieza === pieza.id));
  }

  interno(objeto) {
    objeto.userData.interno = true;
    objeto.raycast = () => {};
    return objeto;
  }

  // Sombra suave bajo el juguete: lo asienta sin necesidad de dibujar un suelo.
  crearSombra() {
    const lienzo = document.createElement("canvas");
    lienzo.width = lienzo.height = 128;
    const c = lienzo.getContext("2d");
    const degradado = c.createRadialGradient(64, 64, 6, 64, 64, 64);
    degradado.addColorStop(0, "rgba(20,70,120,.34)");
    degradado.addColorStop(.6, "rgba(20,70,120,.13)");
    degradado.addColorStop(1, "rgba(20,70,120,0)");
    c.fillStyle = degradado;
    c.fillRect(0, 0, 128, 128);
    const r = this.modelo.radio * 0.6;
    const sombra = new THREE.Mesh(
      new THREE.PlaneGeometry(r * 2, r * 2),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(lienzo), transparent: true, depthWrite: false, toneMapped: false })
    );
    sombra.rotation.x = -Math.PI / 2;
    sombra.position.y = Math.min(...this.modelo.piezas.flatMap(p => p.formas.map(f => f.pos[1] - f.tam[1] / 2))) - 0.22;
    this.raiz.objeto.add(this.interno(sombra));
    this.sombra = sombra;
  }

  geometriaForma(forma) {
    const [x, y, z] = forma.tam;
    const clave = `forma:${forma.tipo}:${x}:${y}:${z}:${forma.eje ?? ""}`;
    return this.recursos.obtener(clave, () => {
      if (forma.tipo === "cono") {
        const g = new THREE.ConeGeometry((x / 2) * Math.SQRT2, y, 4, 1).toNonIndexed();
        g.rotateY(Math.PI / 4);
        g.computeVertexNormals();
        return g;
      }
      if (forma.tipo === "cilindro") {
        const g = new THREE.CylinderGeometry(x / 2, x / 2, forma.eje === "z" ? z : y, 20);
        if (forma.eje === "z") g.rotateX(Math.PI / 2);
        return g;
      }
      const grosor = Math.min(x, y, z);
      return Geometrias.cajaRedondeada(x, y, z, Math.min(grosor * 0.32, 0.13), 2);
    });
  }

  // Cada pieza tiene sus materiales propios, para poder destellar sin afectar a las demás.
  materialDe(actor, tinte) {
    const materiales = actor.datos.materiales;
    if (!materiales.has(tinte)) {
      materiales.set(tinte, new THREE.MeshStandardMaterial({
        color: Tinta.TINTES[tinte] ?? Tinta.TINTES.nieve,
        roughness: 0.46,
        metalness: 0,
        emissive: "#ff2a1a",
        emissiveIntensity: 0,
      }));
    }
    return materiales.get(tinte);
  }

  crearPieza(pieza) {
    const actor = new Actor({ nombre: `pieza:${pieza.id}`, etiquetas: ["pieza"], datos: { def: pieza, materiales: new Map() } });
    this.escena.agregar(actor, this.raiz);
    for (const forma of pieza.formas) {
      const malla = new THREE.Mesh(this.geometriaForma(forma), this.materialDe(actor, forma.tinte ?? pieza.tinte));
      malla.position.set(...forma.pos);
      malla.name = pieza.nombre;
      malla.castShadow = true;
      malla.receiveShadow = true;
      actor.objeto.add(malla);
    }
    actor.datos.salida = this.vectorSalida(pieza);
    this.crearGuia(actor);
    this.piezas.set(pieza.id, actor);
  }

  centroide(pieza) {
    const formas = pieza.formas.filter(f => !f.decor);
    const c = [0, 1, 2].map(i => formas.reduce((s, f) => s + f.pos[i], 0) / formas.length);
    return new THREE.Vector3(...c);
  }

  vectorSalida(pieza) {
    if (pieza.salida) return new THREE.Vector3(...pieza.salida).multiplyScalar(this.modelo.radio * 0.5);
    return this.centroide(pieza).sub(new THREE.Vector3(...this.modelo.centro)).multiplyScalar(0.6);
  }

  materialGuia() {
    return this.recursos.obtener("guia", () => new THREE.LineDashedMaterial({ color: "#ffffff", dashSize: 0.1, gapSize: 0.08, transparent: true, opacity: 0.85, toneMapped: false }));
  }

  // Línea discontinua que une cada pieza con su sitio cuando el modelo está desplegado.
  crearGuia(actor) {
    const centro = this.centroide(actor.datos.def);
    const geometria = new THREE.BufferGeometry().setFromPoints([centro.clone(), centro.clone().sub(actor.datos.salida)]);
    const guia = this.interno(new THREE.Line(geometria, this.materialGuia()));
    guia.computeLineDistances();
    guia.visible = false;
    actor.objeto.add(guia);
    actor.datos.guia = guia;
  }

  // Cabeza: abombada, con la marca hundida. Todo en una geometría, una sola llamada de dibujo.
  geometriaCabeza(marca) {
    return this.recursos.obtener(`cabeza:${marca}`, () => {
      const r = this.tamano, h = r * 0.6;
      const perfil = [[r * 0.92, 0], [r, h * 0.3], [r, h * 0.62], [r * 0.9, h * 0.9], [r * 0.7, h], [0, h]].map(([x, y]) => new THREE.Vector2(x, y));
      const partes = [{ geometria: new THREE.LatheGeometry(perfil, 24), tono: 1 }];
      for (const puntos of Tinta.MARCAS[marca]) {
        partes.push({ geometria: Geometrias.placa(puntos.map(([x, y]) => [x * r * 0.86, y * r * 0.86]), h + 0.003), tono: 0.22 });
      }
      return Geometrias.fusionar(partes);
    });
  }

  crearTornillo(def) {
    const r = this.recursos, tamano = this.tamano;
    const marca = Tinta.marcaDe(def.color);
    const materialCabeza = r.obtener(`material-cabeza:${def.color}`, () => new THREE.MeshStandardMaterial({
      color: Tinta.TIPOS[def.color].color, vertexColors: true, roughness: 0.28, metalness: 0,
    }));
    const rosca = r.obtener("rosca", () => {
      // Dientes de sierra en el perfil: se lee como una rosca aunque no sea una hélice real.
      const puntos = [];
      const vueltas = 6, largo = tamano * 2.5;
      for (let i = 0; i < vueltas; i++) {
        const y = -largo + (i / vueltas) * largo;
        puntos.push(new THREE.Vector2(tamano * 0.26, y), new THREE.Vector2(tamano * 0.42, y + largo / vueltas / 2));
      }
      puntos.push(new THREE.Vector2(tamano * 0.26, 0));
      return new THREE.LatheGeometry(puntos, 10);
    });
    const materialRosca = r.obtener("material-rosca", () => new THREE.MeshStandardMaterial({ color: "#c7ced8", roughness: 0.3, metalness: 0.75 }));
    const blanco = r.obtener("proxy", () => new THREE.SphereGeometry(this.modelo.radio * 0.135, 8, 6));
    const materialProxy = r.obtener("proxy-material", () => new THREE.MeshBasicMaterial({ visible: false }));
    const geometriaGuia = r.obtener("guia-tornillo", () => new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]));

    const anclaje = new THREE.Group();
    anclaje.position.set(...def.pos);
    anclaje.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...def.normal));

    const cuerpo = this.interno(new THREE.Group());
    const cabeza = this.interno(new THREE.Mesh(this.geometriaCabeza(marca), materialCabeza));
    cabeza.castShadow = true;
    const filete = this.interno(new THREE.Mesh(rosca, materialRosca));
    filete.visible = false;
    cuerpo.add(cabeza, filete);

    const proxy = new THREE.Mesh(blanco, materialProxy);
    proxy.position.y = tamano * 0.3;
    proxy.userData.interno = true;

    const linea = this.interno(new THREE.Line(geometriaGuia, this.materialGuia()));
    linea.computeLineDistances();
    linea.visible = false;

    anclaje.add(cuerpo, proxy, linea);
    const actor = new Actor({ objeto: anclaje, nombre: `tornillo:${def.id}`, etiquetas: ["tornillo"], datos: { def, cuerpo, filete, linea, blanco: proxy, tamano } });
    this.escena.agregar(actor, this.piezas.get(def.pieza));
    this.tornillos.set(def.id, actor);
  }

  // El agujero queda al sacar el tornillo. Todos los de una pieza son una sola llamada de dibujo.
  crearAgujeros(pieza, tornillos) {
    if (!tornillos.length) return;
    const circulo = this.recursos.obtener("agujero", () => new THREE.CircleGeometry(this.tamano * 0.55, 16));
    const material = this.recursos.obtener("agujero-material", () => new THREE.MeshBasicMaterial({ color: "#1b2233", toneMapped: false }));
    const agujeros = this.interno(new THREE.InstancedMesh(circulo, material, tornillos.length));
    const matriz = new THREE.Matrix4(), giro = new THREE.Quaternion(), escala = new THREE.Vector3(1, 1, 1);
    tornillos.forEach((t, i) => {
      const normal = new THREE.Vector3(...t.normal);
      giro.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      const posicion = new THREE.Vector3(...t.pos).addScaledVector(normal, 0.006);
      agujeros.setMatrixAt(i, matriz.compose(posicion, giro, escala));
    });
    this.piezas.get(pieza.id).objeto.add(agujeros);
  }

  // ---- Selección ------------------------------------------------------------------------
  // El tornillo más cercano al dedo, con una zona de toque mayor que su tamaño real.
  // Solo cuenta lo que se ve: un tornillo no se elige a través de una pieza.
  elegir(x, y, partida) {
    // Una pieza que ya está cayendo no estorba: se juega a través de ella.
    const quietas = [...this.piezas.values()].filter(p => p.comportamientos.length === 0);
    const impactos = this.escena.lanzarRayo(x, y, quietas);
    const primeraPieza = impactos.find(i => i.actor.tiene("pieza"));
    const limite = (primeraPieza?.distance ?? Infinity) + this.modelo.radio * 0.28;
    const rayo = this.escena.rayo.ray;
    const centro = new THREE.Vector3();
    let mejor = null, mejorDistancia = Infinity;
    const vistos = new Set();
    for (const impacto of impactos) {
      if (!impacto.actor.tiene("tornillo") || impacto.distance > limite) continue;
      const id = impacto.actor.datos.def.id;
      if (vistos.has(id) || partida.retirados.has(id) || partida.oculto(id)) continue;
      vistos.add(id);
      impacto.actor.datos.blanco.getWorldPosition(centro);
      const distancia = rayo.distanceToPoint(centro);
      if (distancia < mejorDistancia) { mejor = id; mejorDistancia = distancia; }
    }
    return mejor;
  }

  pantallaDe(id) {
    const centro = new THREE.Vector3();
    this.tornillos.get(id).datos.cuerpo.getWorldPosition(centro);
    return this.escena.aPantalla(centro);
  }

  // El tornillo libre que mejor se ve ahora mismo: para enseñar dónde tocar.
  masVisible(partida) {
    const hacia = this.escena.camara.objeto.position.clone().sub(this.escena.camara.objetivo).normalize();
    let mejor = null, mejorValor = 0.5;
    for (const id of partida.libres()) {
      const valor = new THREE.Vector3(...partida.tornillos.get(id).normal).dot(hacia);
      if (valor > mejorValor) { mejor = id; mejorValor = valor; }
    }
    return mejor;
  }

  // ---- Animaciones de juego ---------------------------------------------------------------
  sacar(id) {
    const actor = this.tornillos.get(id);
    const { cuerpo, filete, tamano, def } = actor.datos;
    const color = Tinta.TIPOS[def.color].color;
    const posicion = new THREE.Vector3();
    cuerpo.getWorldPosition(posicion);
    this.particulas.emitir(posicion, "#ffffff", 8, this.modelo.radio * 1.1);
    this.particulas.emitir(posicion, color, 6, this.modelo.radio * 0.9);
    filete.visible = true;
    this.escena.animar({
      duracion: 0.34,
      alPaso: t => {
        cuerpo.position.y = t * tamano * 7;
        cuerpo.rotation.y = t * Math.PI * 5;
        cuerpo.scale.setScalar(t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3);
      },
      alTerminar: () => {
        actor.objeto.visible = false;
        cuerpo.position.y = 0;
        cuerpo.rotation.y = 0;
        cuerpo.scale.setScalar(1);
        filete.visible = false;
      },
    });
    this.quitarMarca();
  }

  caer(piezaId) {
    const actor = this.piezas.get(piezaId);
    const fuera = actor.datos.salida.clone().multiplyScalar(0.9);
    actor.velocidad.set(fuera.x, Math.max(fuera.y, 0) + 2, fuera.z);
    const giro = (Math.random() < 0.5 ? -1 : 1) * 1.6;
    actor.comportamientos = [];
    actor.agregarComportamiento((a, dt) => {
      a.velocidad.y -= 16 * dt;
      a.objeto.rotation.x += giro * dt * 0.7;
      a.objeto.rotation.z += giro * dt;
      if (a.objeto.position.y > -this.modelo.radio * 5) return true;
      a.velocidad.set(0, 0, 0);
      a.objeto.visible = false;
      return false;
    });
  }

  rechazar(id, tapadoPor = []) {
    const { cuerpo } = this.tornillos.get(id).datos;
    this.escena.animar({
      duracion: 0.3,
      suavizado: t => t,
      alPaso: t => { cuerpo.rotation.y = Math.sin(t * Math.PI * 5) * 0.6 * (1 - t); },
      alTerminar: () => { cuerpo.rotation.y = 0; },
    });
    for (const pieza of tapadoPor) this.destellar(pieza);
  }

  fijarDestello(actor, valor) {
    for (const material of actor.datos.materiales.values()) material.emissiveIntensity = valor;
  }

  destellar(piezaId) {
    const actor = this.piezas.get(piezaId);
    this.escena.animar({
      duracion: 0.55,
      suavizado: t => t,
      alPaso: t => this.fijarDestello(actor, Math.sin(t * Math.PI) * 0.65),
      alTerminar: () => this.fijarDestello(actor, 0),
    });
  }

  // Pista: gira la cámara hacia el tornillo y lo rodea con un aro que late.
  marcar(id) {
    this.quitarMarca();
    const actor = this.tornillos.get(id);
    const { tamano, def } = actor.datos;
    const geometria = this.recursos.obtener("aro-pista", () => new THREE.RingGeometry(tamano * 1.3, tamano * 1.7, 32));
    const material = this.recursos.obtener("aro-pista-material", () => new THREE.MeshBasicMaterial({ color: "#ffe14a", side: THREE.DoubleSide, toneMapped: false }));
    const aro = this.interno(new THREE.Mesh(geometria, material));
    aro.rotation.x = -Math.PI / 2;
    aro.position.y = tamano * 0.7;
    const portador = new Actor({ objeto: aro, nombre: "pista" });
    this.escena.agregar(portador, actor);
    let tiempo = 0;
    portador.agregarComportamiento((a, dt) => { tiempo += dt; aro.scale.setScalar(1 + Math.sin(tiempo * 6) * 0.14); });
    this.marca = portador;

    const camara = this.escena.camara;
    const destino = camara.angulosHacia(new THREE.Vector3(...def.normal).add(new THREE.Vector3(0.25, 0.25, 0.25)));
    const inicio = { theta: camara.theta, phi: camara.phi };
    let delta = (destino.theta - inicio.theta) % (Math.PI * 2);
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    camara.inercia.theta = camara.inercia.phi = 0;
    this.escena.animar({
      duracion: 0.6,
      suavizado: Escena.entradaSalida,
      alPaso: t => { camara.theta = inicio.theta + delta * t; camara.phi = inicio.phi + (destino.phi - inicio.phi) * t; },
    });
  }

  quitarMarca() {
    if (!this.marca) return;
    this.marca.destruir();
    this.marca = null;
    this.escena.motor?.pedirDibujo();
  }

  // Deja la escena exactamente como dice la partida, sin animar: reiniciar, deshacer, reanudar.
  sincronizar(partida) {
    this.escena.cancelarAnimaciones();
    this.quitarMarca();
    this.sombra.visible = true;
    for (const [id, actor] of this.piezas) {
      actor.comportamientos = [];
      actor.velocidad.set(0, 0, 0);
      actor.objeto.position.set(0, 0, 0);
      actor.objeto.rotation.set(0, 0, 0);
      actor.objeto.visible = partida.presente(id);
      this.fijarDestello(actor, 0);
      actor.datos.guia.visible = false;
    }
    for (const [id, actor] of this.tornillos) {
      const { cuerpo, filete, linea } = actor.datos;
      actor.objeto.visible = !partida.retirados.has(id);
      cuerpo.position.y = 0;
      cuerpo.rotation.y = 0;
      cuerpo.scale.setScalar(1);
      filete.visible = false;
      linea.visible = false;
    }
    this.mostrarDescubiertos(partida);
  }

  // Un tornillo tapado no se ve: asomaría a través de la pieza y delataría lo que hay debajo.
  mostrarDescubiertos(partida) {
    for (const [id, actor] of this.tornillos) actor.datos.cuerpo.visible = !partida.oculto(id);
    this.escena.motor?.pedirDibujo();
  }

  // ---- Vista de despiece -----------------------------------------------------------------
  // k = 0 es el modelo montado; k = 1, cada pieza separada y cada tornillo fuera de su agujero.
  fijarDespiece(k) {
    const guias = k > 0.02;
    for (const actor of this.piezas.values()) {
      actor.objeto.position.copy(actor.datos.salida).multiplyScalar(k);
      actor.datos.guia.visible = guias;
      const centro = this.centroide(actor.datos.def);
      const fin = centro.clone().sub(actor.datos.salida.clone().multiplyScalar(k));
      const posiciones = actor.datos.guia.geometry.attributes.position;
      posiciones.setXYZ(1, fin.x, fin.y, fin.z);
      posiciones.needsUpdate = true;
      actor.datos.guia.computeLineDistances();
    }
    for (const actor of this.tornillos.values()) {
      const { cuerpo, filete, linea, tamano } = actor.datos;
      const salida = k * tamano * 5;
      cuerpo.position.y = salida;
      filete.visible = guias;
      linea.visible = guias;
      linea.scale.y = Math.max(salida, 0.001);
      linea.computeLineDistances();
    }
  }

  // Confeti: la lluvia de colores de cada victoria.
  confeti() {
    const r = this.modelo.radio;
    const posicion = new THREE.Vector3(...this.modelo.centro).setY(this.modelo.centro[1] + r * 0.6);
    for (const tipo of Tinta.TIPOS) this.particulas.emitir(posicion, tipo.color, 14, r * 3.2, 1.5);
  }

  // El final de cada nivel: el juguete reaparece montado y se abre pieza a pieza.
  desplegar({ duracion = 1.6, alTerminar } = {}) {
    this.escena.cancelarAnimaciones();
    this.quitarMarca();
    this.sombra.visible = false;
    for (const actor of this.piezas.values()) {
      actor.comportamientos = [];
      actor.velocidad.set(0, 0, 0);
      actor.objeto.visible = true;
      actor.objeto.rotation.set(0, 0, 0);
    }
    for (const actor of this.tornillos.values()) {
      actor.objeto.visible = true;
      actor.datos.cuerpo.visible = true;
    }
    const camara = this.escena.camara;
    const zoom = camara.zoom;
    const inicio = { theta: camara.theta, phi: camara.phi };
    camara.inercia.theta = camara.inercia.phi = 0;
    let giro = (0.6 - inicio.theta) % (Math.PI * 2);
    if (giro > Math.PI) giro -= Math.PI * 2;
    if (giro < -Math.PI) giro += Math.PI * 2;
    this.confeti();
    this.escena.animar({
      duracion,
      suavizado: Escena.entradaSalida,
      alPaso: t => {
        this.fijarDespiece(t);
        camara.theta = inicio.theta + giro * t;
        camara.phi = inicio.phi + (1.2 - inicio.phi) * t;
        camara.zoom = zoom + (1.7 - zoom) * t;
        camara.encuadrarDistancia();
      },
      alTerminar,
    });
  }
}
