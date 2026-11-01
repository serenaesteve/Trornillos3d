/**
 * Recursos: guarda geometrías, materiales y texturas para no repetirlos en memoria.
 * En un móvil la memoria es escasa: dos objetos iguales deben compartir la misma geometría.
 */
class Recursos {
  constructor(){ this.almacen=new Map(); }

  obtener(clave, fabrica){
    if(!this.almacen.has(clave)) this.almacen.set(clave, fabrica());
    return this.almacen.get(clave);
  }

  get cantidad(){ return this.almacen.size; }

  liberar(){
    for(const recurso of this.almacen.values()) recurso.dispose?.();
    this.almacen.clear();
  }
}
