/**
 * Actor: la unidad genérica del motor. No sabe qué es un tornillo ni una pieza.
 * Une un objeto del grafo de escena de Three.js con posición, velocidad, etiquetas y comportamientos.
 */
class Actor {
  constructor(config={}){
    this.objeto=config.objeto??new THREE.Group();
    this.objeto.name=config.nombre??this.objeto.name??"actor";
    this.objeto.userData.actor=this;
    if(config.posicion) this.objeto.position.set(...config.posicion);
    this.velocidad=new THREE.Vector3(...(config.velocidad??[0,0,0]));
    this.radio=config.radio??0.5;
    this.activo=true;
    this.escena=null;
    this.etiquetas=new Set(config.etiquetas??[]);
    this.datos={...(config.datos??{})};
    this.comportamientos=[];
    this.alActualizar=config.alActualizar??null;
    this.alColisionar=config.alColisionar??null;
    this.alCrear=config.alCrear??null;
    this.alDestruir=config.alDestruir??null;
  }

  // Un comportamiento que devuelve false se elimina: ya ha terminado su trabajo.
  agregarComportamiento(funcion){ this.comportamientos.push(funcion); return this; }

  actualizar(dt,escena){
    if(this.velocidad.lengthSq()>0) this.objeto.position.addScaledVector(this.velocidad,dt);
    this.comportamientos=this.comportamientos.filter(funcion=>funcion(this,dt,escena)!==false);
    this.alActualizar?.(this,dt,escena);
  }

  // Le dice al motor si este actor cambiará la imagen en el próximo fotograma.
  animando(){ return this.comportamientos.length>0 || this.velocidad.lengthSq()>0; }

  colisionar(otro,escena){ this.alColisionar?.(this,otro,escena); }
  tiene(etiqueta){ return this.etiquetas.has(etiqueta); }

  destruir(escena=this.escena){
    if(!this.activo) return;
    this.activo=false;
    this.objeto.removeFromParent();
    this.alDestruir?.(this,escena);
  }
}
