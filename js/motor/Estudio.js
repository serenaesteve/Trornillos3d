/**
 * Estudio: la iluminación. Un entorno suave que da reflejos, una luz de cielo para que las
 * sombras no sean negras y una luz principal que proyecta sombras y acompaña a la cámara,
 * para que el objeto quede bien iluminado se mire por donde se mire.
 */
class Estudio {
  static entorno(renderizador){
    const escena=new THREE.Scene();
    const cielo=new THREE.Mesh(
      new THREE.SphereGeometry(10,16,12),
      new THREE.ShaderMaterial({
        side:THREE.BackSide,
        vertexShader:"varying vec3 p; void main(){ p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
        fragmentShader:"varying vec3 p; void main(){ float t=normalize(p).y*.5+.5; vec3 c=mix(vec3(.62,.58,.52),vec3(1.0,1.02,1.08),smoothstep(.15,.85,t)); gl_FragColor=vec4(c,1.0); }",
      })
    );
    escena.add(cielo);
    // Dos paneles de luz: son los brillos alargados que se ven en un plástico.
    const luz=new THREE.MeshBasicMaterial({color:new THREE.Color(5,5,5)});
    const panel=new THREE.BoxGeometry(5,3,.1);
    const arriba=new THREE.Mesh(panel,luz); arriba.position.set(-3,7,4); arriba.lookAt(0,0,0);
    const lado=new THREE.Mesh(panel,luz); lado.position.set(7,2,3); lado.lookAt(0,0,0);
    escena.add(arriba,lado);
    const generador=new THREE.PMREMGenerator(renderizador);
    const resultado=generador.fromScene(escena,.03).texture;
    generador.dispose();
    cielo.geometry.dispose(); cielo.material.dispose(); panel.dispose(); luz.dispose();
    return resultado;
  }

  static montar(motor,escena,{radio=2,intensidad=1}={}){
    const grafo=escena.grafo;
    grafo.environment=Estudio.entorno(motor.renderizador);
    grafo.environmentIntensity=.62*intensidad;

    const relleno=new THREE.HemisphereLight(0xffffff,0xd9c7a8,.75*intensidad);
    relleno.name="luz-cielo";
    grafo.add(relleno);

    const principal=new THREE.DirectionalLight(0xfff5e6,1.9*intensidad);
    principal.name="luz-principal";
    principal.castShadow=motor.sombras;
    principal.shadow.mapSize.set(1024,1024);
    principal.shadow.bias=-.0006;
    principal.shadow.normalBias=.025;
    principal.shadow.radius=5;
    const lado=radio*1.9;
    Object.assign(principal.shadow.camera,{left:-lado,right:lado,top:lado,bottom:-lado,near:.5,far:120});
    // La cámara forma parte del grafo; la luz, hija suya, la sigue al girar.
    grafo.add(escena.camara.objeto);
    escena.camara.objeto.add(principal);
    principal.position.set(-radio*2.2,radio*3.2,radio*.4);
    principal.target=new THREE.Object3D();
    principal.target.name="objetivo-luz";
    principal.target.position.copy(escena.camara.objetivo);
    grafo.add(principal.target);
    escena.estudio={principal,relleno};
  }

  static renovarEntorno(motor,escena){
    escena.grafo.environment?.dispose();
    escena.grafo.environment=Estudio.entorno(motor.renderizador);
  }

  static apuntar(escena){
    escena.estudio?.principal.target.position.copy(escena.camara.objetivo);
  }
}
