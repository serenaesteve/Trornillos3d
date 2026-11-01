/**
 * Entrada: traduce punteros, dedos y teclas a acciones del juego.
 * Distingue un toque de un arrastre por la distancia recorrida, porque en una pantalla táctil
 * el dedo siempre se mueve unos píxeles aunque quieras solo tocar.
 */
class Entrada {
  constructor(elemento){
    this.elemento=elemento;
    this.teclas=new Set();
    this.oyentes={};
    this.punteros=new Map();
    this.inclinacion={beta:0,gamma:0,activa:false};
    this.umbralToque=10;
    this.controlador=new AbortController();
    const opciones={signal:this.controlador.signal};

    elemento.style.touchAction="none";
    elemento.addEventListener("pointerdown",e=>this.alBajar(e),opciones);
    elemento.addEventListener("pointermove",e=>this.alMover(e),opciones);
    elemento.addEventListener("pointerup",e=>this.alSubir(e),opciones);
    elemento.addEventListener("pointercancel",e=>this.alCancelar(e),opciones);
    elemento.addEventListener("wheel",e=>{ e.preventDefault(); this.emitir("pellizco",{factor:e.deltaY>0?1.08:0.92}); },{...opciones,passive:false});
    addEventListener("keydown",e=>{ this.teclas.add(e.code); this.emitir("tecla",{codigo:e.code}); },opciones);
    addEventListener("keyup",e=>this.teclas.delete(e.code),opciones);
  }

  al(evento,funcion){ (this.oyentes[evento]??=[]).push(funcion); return this; }
  emitir(evento,datos){ for(const funcion of this.oyentes[evento]??[]) funcion(datos); }
  pulsada(codigo){ return this.teclas.has(codigo); }

  aNormalizado(x,y){
    const caja=this.elemento.getBoundingClientRect();
    return {x:(x-caja.left)/caja.width*2-1, y:-((y-caja.top)/caja.height)*2+1};
  }

  alBajar(e){
    this.elemento.setPointerCapture?.(e.pointerId);
    this.punteros.set(e.pointerId,{x:e.clientX,y:e.clientY,inicioX:e.clientX,inicioY:e.clientY,arrastrando:false,tiempo:performance.now()});
    this.distanciaPellizco=null;
  }

  alMover(e){
    const puntero=this.punteros.get(e.pointerId);
    if(!puntero) return;
    const dx=e.clientX-puntero.x, dy=e.clientY-puntero.y;
    puntero.x=e.clientX; puntero.y=e.clientY;

    if(this.punteros.size>=2){ this.actualizarPellizco(); return; }

    if(!puntero.arrastrando && Math.hypot(e.clientX-puntero.inicioX,e.clientY-puntero.inicioY)>=this.umbralToque) puntero.arrastrando=true;
    if(puntero.arrastrando){
      const ahora=performance.now();
      const pasado=Math.max(ahora-(puntero.ultimo??ahora-16),1);
      puntero.vx=dx/pasado; puntero.vy=dy/pasado; puntero.ultimo=ahora;
      this.emitir("arrastre",{dx,dy,x:e.clientX,y:e.clientY});
    }
  }

  actualizarPellizco(){
    const [a,b]=[...this.punteros.values()];
    a.arrastrando=b.arrastrando=true;
    const distancia=Math.hypot(a.x-b.x,a.y-b.y);
    if(this.distanciaPellizco) this.emitir("pellizco",{factor:this.distanciaPellizco/distancia});
    this.distanciaPellizco=distancia;
  }

  alSubir(e){
    const puntero=this.punteros.get(e.pointerId);
    if(!puntero) return;
    const multitactil=this.punteros.size>1;
    this.punteros.delete(e.pointerId);
    if(multitactil) return;
    if(puntero.arrastrando) this.emitir("fin-arrastre",{vx:puntero.vx??0,vy:puntero.vy??0});
    else this.emitir("toque",{x:e.clientX,y:e.clientY,...this.aNormalizado(e.clientX,e.clientY),pantalla:{x:e.clientX,y:e.clientY}});
  }

  alCancelar(e){ this.punteros.delete(e.pointerId); }

  activarInclinacion(){
    this.inclinacion.activa=true;
    addEventListener("deviceorientation",e=>{
      this.inclinacion.beta=e.beta??0;
      this.inclinacion.gamma=e.gamma??0;
      this.emitir("inclinacion",this.inclinacion);
    },{signal:this.controlador.signal});
  }

  destruir(){ this.controlador.abort(); this.oyentes={}; this.punteros.clear(); }
}
