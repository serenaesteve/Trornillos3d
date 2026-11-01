/**
 * Sonido: fuente de audio sintetizada con Web Audio. No descarga ningún archivo.
 * Los navegadores móviles exigen un gesto del usuario para arrancar el audio: se reanuda al primer toque.
 */
class Sonido {
  constructor(){ this.activado=true; this.contexto=null; }

  desbloquear(){
    const Contexto=window.AudioContext||window.webkitAudioContext;
    if(!Contexto) return;
    this.contexto??=new Contexto();
    if(this.contexto.state!=="running") this.contexto.resume().catch(()=>{});
  }

  tono({frecuencia=440,hasta=null,duracion=.08,tipo="triangle",volumen=.08,retardo=0,panorama=0}={}){
    if(!this.activado||!this.contexto) return;
    // El primer toque desbloquea el audio y suena a la vez: se espera a que esté listo.
    if(this.contexto.state!=="running"){
      // Si tarda demasiado, ese sonido ya llegaría tarde y se descarta.
      const pedido=performance.now(), datos=arguments[0];
      this.contexto.resume().then(()=>{ if(performance.now()-pedido<250) this.tono(datos); }).catch(()=>{});
      return;
    }
    const inicio=this.contexto.currentTime+retardo;
    const oscilador=this.contexto.createOscillator();
    const ganancia=this.contexto.createGain();
    oscilador.type=tipo;
    oscilador.frequency.setValueAtTime(frecuencia,inicio);
    if(hasta) oscilador.frequency.exponentialRampToValueAtTime(hasta,inicio+duracion);
    ganancia.gain.setValueAtTime(volumen,inicio);
    ganancia.gain.exponentialRampToValueAtTime(.0001,inicio+duracion);
    let salida=ganancia;
    if(this.contexto.createStereoPanner){
      const paneo=this.contexto.createStereoPanner();
      paneo.pan.value=panorama;
      ganancia.connect(paneo);
      salida=paneo;
    }
    oscilador.connect(ganancia);
    salida.connect(this.contexto.destination);
    oscilador.start(inicio);
    oscilador.stop(inicio+duracion);
  }

  pausar(){ this.contexto?.suspend(); }
  // iOS puede dejarlo «interrumpido» tras una llamada: se reanuda igual.
  reanudar(){ if(this.contexto&&this.contexto.state!=="running"&&this.contexto.state!=="closed") this.contexto.resume().catch(()=>{}); }
  destruir(){ this.contexto?.close(); this.contexto=null; }
}
