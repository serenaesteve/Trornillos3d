/**
 * Escena: contiene los actores y el grafo de escena; actualiza, dibuja, busca por etiquetas
 * y resuelve colisiones. Es la representación lógica (actores) y espacial (grafo) del juego.
 */
class Escena {
  constructor({nombre="escena"}={}){
    this.grafo=new THREE.Scene();
    this.grafo.name=nombre;
    this.camara=new Camara();
    this.actores=[];
    this.animaciones=[];
    this.motor=null;
    this.iniciada=false;
    this.alIniciar=null;
    this.alActualizar=null;
    this.rayo=new THREE.Raycaster();
    this.movida=true;
  }

  agregar(actor,padre=null){
    this.actores.push(actor);
    actor.escena=this;
    (padre?.objeto??this.grafo).add(actor.objeto);
    actor.alCrear?.(actor,this);
    return actor;
  }

  buscar(etiqueta){ return this.actores.filter(a=>a.activo&&a.tiene(etiqueta)); }

  // Interpola un valor durante un tiempo. Es la base de todo movimiento que no sea físico.
  animar({duracion=0.3,retardo=0,suavizado=Escena.salidaSuave,alPaso,alTerminar}){
    const animacion={t:-retardo,duracion,suavizado,alPaso,alTerminar};
    this.animaciones.push(animacion);
    return animacion;
  }

  cancelarAnimaciones(){ this.animaciones=[]; }

  actualizar(dt){
    this.alActualizar?.(this,dt);
    for(const a of [...this.actores]) if(a.activo) a.actualizar(dt,this);
    this.resolverColisiones();
    this.actores=this.actores.filter(a=>a.activo);

    // Una animación puede lanzar otra al terminar: las nuevas caen en la lista vacía y se conservan.
    const vigentes=this.animaciones, seguir=[];
    this.animaciones=[];
    for(const animacion of vigentes){
      animacion.t+=dt;
      if(animacion.t<0){ seguir.push(animacion); continue; }
      const avance=Math.min(animacion.t/animacion.duracion,1);
      animacion.alPaso?.(animacion.suavizado(avance));
      if(avance<1) seguir.push(animacion);
      else animacion.alTerminar?.();
    }
    this.animaciones=seguir.concat(this.animaciones);
    this.movida=this.camara.actualizar(dt)||this.movida;
  }

  // Solo las parejas con alColisionar: comparar todos contra todos no se lo puede permitir un móvil.
  resolverColisiones(){
    const reactivos=this.actores.filter(a=>a.alColisionar&&a.activo);
    if(!reactivos.length) return;
    const posicionA=new THREE.Vector3(), posicionB=new THREE.Vector3();
    for(let i=0;i<reactivos.length;i++) for(let j=i+1;j<reactivos.length;j++){
      const a=reactivos[i], b=reactivos[j];
      a.objeto.getWorldPosition(posicionA);
      b.objeto.getWorldPosition(posicionB);
      const r=a.radio+b.radio;
      if(posicionA.distanceToSquared(posicionB)<=r*r){ a.colisionar(b,this); b.colisionar(a,this); }
    }
  }

  necesitaDibujo(){
    return this.movida || this.animaciones.length>0 || this.actores.some(a=>a.activo&&a.animando());
  }

  dibujar(renderizador){
    renderizador.render(this.grafo,this.camara.objeto);
    this.movida=false;
  }

  // Lanza un rayo desde la pantalla (coordenadas -1..1) y devuelve lo que atraviesa.
  lanzarRayo(x,y,actores=this.actores){
    this.rayo.setFromCamera({x,y},this.camara.objeto);
    const objetos=actores.filter(a=>a.activo).map(a=>a.objeto);
    // Three.js también atraviesa lo oculto: se filtra a mano mirando toda la cadena de padres.
    return this.rayo.intersectObjects(objetos,true)
      .filter(impacto=>Escena.visibleDeVerdad(impacto.object))
      .map(impacto=>({...impacto,actor:Escena.actorDe(impacto.object)}))
      .filter(i=>i.actor);
  }

  static visibleDeVerdad(objeto){
    for(let o=objeto;o;o=o.parent) if(!o.visible) return false;
    return true;
  }

  static actorDe(objeto){
    for(let o=objeto;o;o=o.parent) if(o.userData.actor) return o.userData.actor;
    return null;
  }

  // Pasa un punto del mundo a píxeles de pantalla.
  aPantalla(punto){
    const lienzo=this.motor.canvas.getBoundingClientRect();
    const proyectado=punto.clone().project(this.camara.objeto);
    return {x:lienzo.left+(proyectado.x+1)/2*lienzo.width,y:lienzo.top+(1-proyectado.y)/2*lienzo.height};
  }

  liberar(){
    this.grafo.traverse(objeto=>{
      objeto.geometry?.dispose();
      for(const material of [objeto.material].flat()){
        material?.map?.dispose();
        material?.dispose();
      }
    });
    this.animaciones=[];
    this.actores=[];
  }

  static salidaSuave(t){ return 1-(1-t)*(1-t)*(1-t); }
  static entradaSalida(t){ return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; }
}
