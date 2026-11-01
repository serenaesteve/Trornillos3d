/**
 * Particulas: motor de partículas con un depósito fijo.
 * No crea ni destruye nada mientras se juega, así que no provoca tirones por recolección de memoria.
 */
class Particulas extends Actor {
  constructor({capacidad=160,tamano=0.12,gravedad=-6,nombre="particulas"}={}){
    const posiciones=new Float32Array(capacidad*3);
    const colores=new Float32Array(capacidad*3);
    const geometria=new THREE.BufferGeometry();
    geometria.setAttribute("position",new THREE.BufferAttribute(posiciones,3));
    geometria.setAttribute("color",new THREE.BufferAttribute(colores,3));
    geometria.setDrawRange(0,0);
    const material=new THREE.PointsMaterial({size:tamano,vertexColors:true,sizeAttenuation:true,map:Particulas.punto(),transparent:true,alphaTest:.3,depthWrite:false,toneMapped:false});
    const puntos=new THREE.Points(geometria,material);
    puntos.frustumCulled=false;
    super({objeto:puntos,nombre});
    this.capacidad=capacidad;
    this.gravedad=gravedad;
    this.vivas=[];
    this.libres=Array.from({length:capacidad},(_,i)=>({indice:i}));
    this.vidaMaxima=0.7;
    this.color=new THREE.Color();
  }

  static punto(){
    const lienzo=document.createElement("canvas");
    lienzo.width=lienzo.height=32;
    const c=lienzo.getContext("2d");
    c.fillStyle="#fff";
    c.beginPath();
    c.arc(16,16,15,0,Math.PI*2);
    c.fill();
    return new THREE.CanvasTexture(lienzo);
  }

  emitir(posicion,color,cantidad=10,fuerza=2.4,vida=this.vidaMaxima){
    this.color.set(color);
    for(let i=0;i<cantidad&&this.libres.length;i++){
      const p=this.libres.pop();
      p.x=posicion.x; p.y=posicion.y; p.z=posicion.z;
      p.vx=(Math.random()-.5)*fuerza; p.vy=Math.random()*fuerza; p.vz=(Math.random()-.5)*fuerza;
      p.vida=vida*(.5+Math.random()*.5);
      p.r=this.color.r; p.g=this.color.g; p.b=this.color.b;
      this.vivas.push(p);
    }
  }

  animando(){ return this.vivas.length>0; }

  actualizar(dt){
    if(!this.vivas.length && this.objeto.geometry.drawRange.count===0) return;
    const posiciones=this.objeto.geometry.attributes.position;
    const colores=this.objeto.geometry.attributes.color;
    let n=0;
    for(const p of this.vivas){
      p.vida-=dt;
      if(p.vida<=0){ this.libres.push(p); continue; }
      p.vy+=this.gravedad*dt;
      p.x+=p.vx*dt; p.y+=p.vy*dt; p.z+=p.vz*dt;
      posiciones.setXYZ(n,p.x,p.y,p.z);
      colores.setXYZ(n,p.r,p.g,p.b);
      this.vivas[n++]=p;
    }
    this.vivas.length=n;
    posiciones.needsUpdate=true;
    colores.needsUpdate=true;
    this.objeto.geometry.setDrawRange(0,n);
  }
}
