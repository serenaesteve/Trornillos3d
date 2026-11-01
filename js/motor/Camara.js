/**
 * Camara: cámara orbital. Gira alrededor de un objetivo, con inercia al soltar el dedo.
 * Se adapta al formato vertical del móvil: encuadra por el ancho, que es el lado corto.
 */
class Camara {
  constructor({fov=35}={}){
    this.objeto=new THREE.PerspectiveCamera(fov,1,0.1,200);
    this.objeto.name="camara";
    this.objetivo=new THREE.Vector3();
    this.theta=0.6;
    this.phi=1.15;
    this.distancia=10;
    this.distanciaBase=10;
    this.zoom=1;
    this.zoomMinimo=0.55;
    this.zoomMaximo=1.5;
    this.phiMinimo=0.12;
    this.phiMaximo=Math.PI-0.12;
    this.inercia={theta:0,phi:0};
    this.desvio={theta:0,phi:0};
    this.sensibilidad=0.0085;
    this.radioEncuadre=2;
    this.margen=1.08;
    this.ultima="";
    this.aplicar();
  }

  girar(dTheta,dPhi){
    this.theta+=dTheta;
    this.phi=Math.max(this.phiMinimo,Math.min(this.phiMaximo,this.phi+dPhi));
  }

  arrastrar(dx,dy){ this.girar(-dx*this.sensibilidad,-dy*this.sensibilidad); this.inercia.theta=this.inercia.phi=0; }

  soltar(vx,vy){ this.inercia.theta=-vx*this.sensibilidad*16; this.inercia.phi=-vy*this.sensibilidad*16; }

  acercar(factor){ this.zoom=Math.max(this.zoomMinimo,Math.min(this.zoomMaximo,this.zoom*factor)); this.encuadrarDistancia(); }

  encuadrar(radio){ this.radioEncuadre=radio; this.encuadrarDistancia(); }

  encuadrarDistancia(){
    const camara=this.objeto;
    const mitadVertical=THREE.MathUtils.degToRad(camara.fov/2);
    const mitadHorizontal=Math.atan(Math.tan(mitadVertical)*camara.aspect);
    const limitante=Math.min(mitadVertical,mitadHorizontal);
    this.distanciaBase=(this.radioEncuadre*this.margen)/Math.sin(limitante);
    this.distancia=this.distanciaBase*this.zoom;
  }

  ajustar(ancho,alto){
    this.objeto.aspect=ancho/Math.max(alto,1);
    this.objeto.updateProjectionMatrix();
    this.encuadrarDistancia();
    this.aplicar();
  }

  // Coloca la cámara para ver de frente lo que apunta en esa dirección.
  angulosHacia(direccion){
    const d=direccion.clone().normalize();
    return {theta:Math.atan2(d.x,d.z),phi:Math.max(this.phiMinimo,Math.min(this.phiMaximo,Math.acos(d.y)))};
  }

  actualizar(dt){
    if(Math.abs(this.inercia.theta)>1e-4||Math.abs(this.inercia.phi)>1e-4){
      this.girar(this.inercia.theta*dt*60/16,this.inercia.phi*dt*60/16);
      const freno=Math.exp(-dt*5);
      this.inercia.theta*=freno;
      this.inercia.phi*=freno;
    }
    return this.aplicar();
  }

  // Devuelve true si la cámara se ha movido desde el último fotograma.
  aplicar(){
    const theta=this.theta+this.desvio.theta;
    const phi=Math.max(this.phiMinimo,Math.min(this.phiMaximo,this.phi+this.desvio.phi));
    const clave=`${theta.toFixed(4)}|${phi.toFixed(4)}|${this.distancia.toFixed(3)}|${this.objetivo.x},${this.objetivo.y},${this.objetivo.z}`;
    if(clave===this.ultima) return false;
    this.ultima=clave;
    const s=Math.sin(phi);
    this.objeto.position.set(
      this.objetivo.x+this.distancia*s*Math.sin(theta),
      this.objetivo.y+this.distancia*Math.cos(phi),
      this.objetivo.z+this.distancia*s*Math.cos(theta)
    );
    this.objeto.lookAt(this.objetivo);
    this.objeto.updateMatrixWorld();
    return true;
  }
}
