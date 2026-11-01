/**
 * Inspector: muestra en directo la representación lógica y espacial de una escena:
 * el árbol de objetos con sus coordenadas, y lo que cuesta dibujarla.
 * Funciona con cualquier escena del motor.
 */
class Inspector {
  constructor(motor,contenedor){
    this.motor=motor;
    this.elemento=document.createElement("aside");
    this.elemento.className="inspector";
    this.elemento.setAttribute("aria-label","Inspector de escena");
    this.elemento.innerHTML=`<h2>Inspector de escena</h2><dl class="inspector-cifras"></dl><ol class="inspector-arbol"></ol>`;
    this.cifras=this.elemento.querySelector(".inspector-cifras");
    this.arbol=this.elemento.querySelector(".inspector-arbol");
    this.elemento.hidden=true;
    this.seleccion=null;
    this.marca=null;
    this.temporizador=null;
    this.elemento.addEventListener("click",e=>{
      const fila=e.target.closest("[data-uuid]");
      if(fila) this.seleccionar(fila.dataset.uuid);
    });
    contenedor.append(this.elemento);
  }

  get visible(){ return !this.elemento.hidden; }

  alternar(){
    this.elemento.hidden=!this.elemento.hidden;
    clearInterval(this.temporizador);
    if(this.visible){ this.pintar(); this.temporizador=setInterval(()=>this.pintar(),400); }
    else this.quitarMarca();
    return this.visible;
  }

  static formato(v){ return `${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}`; }

  // Recorre el grafo sin los detalles internos de dibujo (contornos, aristas).
  filas(){
    const lista=[], mundo=new THREE.Vector3();
    const visitar=(objeto,nivel)=>{
      if(objeto.userData.interno) return;
      objeto.getWorldPosition(mundo);
      lista.push({uuid:objeto.uuid,nombre:objeto.name||objeto.type,tipo:objeto.type,nivel,visible:objeto.visible,local:Inspector.formato(objeto.position),mundo:Inspector.formato(mundo)});
      for(const hijo of objeto.children) visitar(hijo,nivel+1);
    };
    if(this.motor.escena) visitar(this.motor.escena.grafo,0);
    return lista;
  }

  pintar(){
    const e=this.motor.estadisticas, escena=this.motor.escena;
    const filas=this.filas();
    const cifras={
      "Fotogramas/s":e.fps,
      "Dibujados":e.dibujos,
      "Llamadas de dibujo":e.llamadas,
      "Triángulos":e.triangulos,
      "Actores":escena?.actores.length??0,
      "Nodos del grafo":filas.length,
    };
    this.cifras.innerHTML=Object.entries(cifras).map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
    const firma=filas.map(f=>`${f.uuid}${f.visible}${f.local}`).join();
    if(firma===this.firma) return;
    this.firma=firma;
    const desplazamiento=this.arbol.scrollTop;
    this.arbol.innerHTML=filas.map(f=>`<li data-uuid="${f.uuid}" class="${f.visible?"":"oculto"} ${f.uuid===this.seleccion?"elegido":""}" style="--nivel:${f.nivel}">
      <span class="inspector-nombre">${Componentes.escapar(f.nombre)}</span>
      <span class="inspector-pos">local ${f.local}</span>
      <span class="inspector-pos">mundo ${f.mundo}</span></li>`).join("");
    this.arbol.scrollTop=desplazamiento;
  }

  seleccionar(uuid){
    this.quitarMarca();
    this.seleccion=uuid;
    const escena=this.motor.escena;
    const objeto=escena?.grafo.getObjectByProperty("uuid",uuid);
    if(objeto&&objeto!==escena.grafo){
      this.marca=new THREE.BoxHelper(objeto,0xc23b22);
      this.marca.userData.interno=true;
      escena.grafo.add(this.marca);
    }
    this.motor.pedirDibujo();
    this.firma=null;
    this.pintar();
  }

  quitarMarca(){
    if(!this.marca) return;
    this.marca.removeFromParent();
    this.marca.geometry.dispose();
    this.marca.material.dispose();
    this.marca=null;
    this.motor.pedirDibujo();
  }

  destruir(){ clearInterval(this.temporizador); this.elemento.remove(); }
}
