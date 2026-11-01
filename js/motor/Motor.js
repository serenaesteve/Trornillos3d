/**
 * Motor: lienzo, tiempo, entrada, redimensionado y bucle de juego.
 * A diferencia de un motor de escritorio, solo dibuja cuando la imagen cambia:
 * con la escena quieta, la GPU descansa y la batería dura más.
 * Si el móvil no llega, baja la calidad en vez de ir a tirones.
 */
class Motor {
  constructor(canvas,{adaptativo=true}={}){
    this.canvas=canvas;
    this.renderizador=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:"default"});
    this.renderizador.setClearColor(0x000000,0);
    this.renderizador.toneMapping=THREE.NeutralToneMapping;
    this.renderizador.toneMappingExposure=1;
    this.sombras=true;
    this.renderizador.shadowMap.enabled=true;
    this.renderizador.shadowMap.type=THREE.PCFSoftShadowMap;
    this.adaptativo=adaptativo;
    this.densidadMaxima=2;
    this.calidad=0;
    this.lento=0;
    this.anteriorDibujado=false;
    this.muestras={suma:0,cantidad:0};
    // Si este móvil ya iba lento, no se le vuelve a hacer sufrir en cada pantalla.
    if(adaptativo) for(let i=Motor.calidadGuardada();i>0;i--) this.aplicarBajada();
    this.entrada=new Entrada(canvas);
    this.escena=null;
    this.corriendo=false;
    this.ultimo=0;
    this.peticion=null;
    this.sucio=true;
    this.estadisticas={fps:0,fotogramas:0,dibujos:0,llamadas:0,triangulos:0,ms:0};
    this.contadorFps={desde:0,fotogramas:0,dibujos:0};
    this.redimensionar();
    this.vigilante=new ResizeObserver(()=>this.redimensionar());
    this.vigilante.observe(canvas);
    canvas.addEventListener("webglcontextlost",e=>{ e.preventDefault(); this.pausar(); });
    canvas.addEventListener("webglcontextrestored",()=>{
      // Lo que vivía en la tarjeta gráfica se ha perdido: los reflejos hay que recalcularlos.
      if(this.escena?.estudio) Estudio.renovarEntorno(this,this.escena);
      this.sucio=true;
      this.reanudar();
    });
  }

  // Más de 2× no se aprecia en un móvil y multiplica el trabajo de la GPU.
  get densidad(){ return Math.min(devicePixelRatio||1,this.densidadMaxima); }

  redimensionar(){
    const ancho=this.canvas.clientWidth, alto=this.canvas.clientHeight;
    if(!ancho||!alto) return;
    this.renderizador.setPixelRatio(this.densidad);
    this.renderizador.setSize(ancho,alto,false);
    this.escena?.camara.ajustar(ancho,alto);
    this.sucio=true;
  }

  cargar(escena){
    this.escena=escena;
    escena.motor=this;
    escena.camara.ajustar(this.canvas.clientWidth||1,this.canvas.clientHeight||1);
    if(!escena.iniciada){ escena.iniciada=true; escena.alIniciar?.(escena); }
    this.sucio=true;
  }

  iniciar(){
    if(this.corriendo) return;
    this.corriendo=true;
    this.ultimo=0;
    this.peticion=requestAnimationFrame(t=>this.bucle(t));
  }

  detener(){ this.corriendo=false; if(this.peticion) cancelAnimationFrame(this.peticion); this.peticion=null; }
  pausar(){ this.detener(); }
  reanudar(){ this.iniciar(); }
  pedirDibujo(){ this.sucio=true; }

  bucle(t){
    if(!this.corriendo) return;
    // Un salto largo de tiempo (por ejemplo, tras una pausa) no debe teletransportar nada.
    const dt=this.ultimo?Math.min((t-this.ultimo)/1000,0.05):0;
    this.ultimo=t;
    this.medirFps(t);
    if(this.escena){
      const inicio=performance.now();
      this.escena.actualizar(dt);
      const dibuja=this.sucio||this.escena.necesitaDibujo();
      if(dibuja&&this.anteriorDibujado&&dt>0) this.medirCoste(dt);
      this.anteriorDibujado=dibuja;
      if(dibuja){
        Estudio.apuntar(this.escena);
        this.escena.dibujar(this.renderizador);
        this.sucio=false;
        const e=this.estadisticas, info=this.renderizador.info.render;
        e.dibujos++; e.llamadas=info.calls; e.triangulos=info.triangles; e.ms=performance.now()-inicio;
        this.contadorFps.dibujos++;
      }
    }
    this.peticion=requestAnimationFrame(x=>this.bucle(x));
  }

  medirFps(t){
    const c=this.contadorFps;
    c.fotogramas++;
    this.estadisticas.fotogramas++;
    if(!c.desde) c.desde=t;
    if(t-c.desde<500) return;
    const fps=c.fotogramas*1000/(t-c.desde);
    this.estadisticas.fps=Math.round(fps);
    c.desde=t; c.fotogramas=0; c.dibujos=0;
  }

  // Solo cuentan los fotogramas seguidos que dibujan: en reposo el bucle siempre va sobrado.
  medirCoste(dt){
    const m=this.muestras;
    m.suma+=dt; m.cantidad++;
    if(m.cantidad<30) return;
    const fps=m.cantidad/m.suma;
    m.suma=0; m.cantidad=0;
    if(this.adaptativo) this.vigilarRendimiento(fps);
  }

  vigilarRendimiento(fps){
    this.lento=fps<28?this.lento+1:0;
    if(this.lento>=2){ this.lento=0; this.bajarCalidad(); }
  }

  // Primero se van las sombras, que es lo más caro; después, la resolución.
  aplicarBajada(){
    this.calidad++;
    if(this.sombras){
      this.sombras=false;
      this.renderizador.shadowMap.enabled=false;
      const principal=this.escena?.estudio?.principal;
      if(principal) principal.castShadow=false;
      this.escena?.grafo.traverse(o=>{ if(o.material) for(const m of [o.material].flat()) m.needsUpdate=true; });
    }else if(this.densidadMaxima>1){
      this.densidadMaxima=1;
      this.redimensionar();
    }
    this.sucio=true;
  }

  bajarCalidad(){
    if(!this.sombras&&this.densidadMaxima===1) return;
    this.aplicarBajada();
    if(this.adaptativo) Motor.guardarCalidad(this.calidad);
  }

  static calidadGuardada(){
    try { return Number(localStorage.getItem("telon.calidad"))||0; } catch { return 0; }
  }
  static guardarCalidad(valor){
    try { localStorage.setItem("telon.calidad",String(valor)); } catch { /* Sin almacenamiento, se vuelve a medir. */ }
  }

  destruir(){
    this.detener();
    this.vigilante.disconnect();
    this.entrada.destruir();
    this.escena?.liberar();
    this.renderizador.dispose();
    // Los navegadores limitan los contextos 3D abiertos: cada vista debe devolver el suyo.
    this.renderizador.forceContextLoss();
    this.escena=null;
  }
}
