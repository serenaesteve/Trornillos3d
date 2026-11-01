/**
 * Geometrias: formas que Three.js no trae de serie y que dan aspecto de juguete.
 * Un borde redondeado atrapa la luz y es lo que separa el plástico de una caja de ordenador.
 */
const Geometrias = {
  // Caja con bordes redondeados. La idea es la clásica: se parte de una caja subdividida
  // y cada vértice se recoloca en la esfera de su esquina.
  cajaRedondeada(ancho,alto,fondo,radio=0.08,segmentos=2){
    const tramos=segmentos*2+1;
    const r=Math.min(ancho/2,alto/2,fondo/2,radio);
    const geometria=new THREE.BoxGeometry(1,1,1,tramos,tramos,tramos);
    const posiciones=geometria.attributes.position;
    const normales=geometria.attributes.normal;
    const interior=new THREE.Vector3(ancho/2-r,alto/2-r,fondo/2-r);
    const mitadTramo=0.5/tramos;
    const p=new THREE.Vector3(), n=new THREE.Vector3();
    for(let i=0;i<posiciones.count;i++){
      p.fromBufferAttribute(posiciones,i);
      n.copy(p);
      n.x-=Math.sign(n.x)*mitadTramo;
      n.y-=Math.sign(n.y)*mitadTramo;
      n.z-=Math.sign(n.z)*mitadTramo;
      n.normalize();
      posiciones.setXYZ(i,interior.x*Math.sign(p.x)+n.x*r,interior.y*Math.sign(p.y)+n.y*r,interior.z*Math.sign(p.z)+n.z*r);
      normales.setXYZ(i,n.x,n.y,n.z);
    }
    return geometria;
  },

  // Une varias geometrías en una. Una sola llamada de dibujo en lugar de varias.
  // Cada parte puede llevar un tono, que se multiplica por el color del material.
  fusionar(partes){
    const posiciones=[], normales=[], colores=[], indices=[];
    let desplazamiento=0;
    for(const {geometria,tono=1} of partes){
      const fuente=geometria.index?geometria:geometria.toNonIndexed();
      const p=fuente.attributes.position, n=fuente.attributes.normal;
      for(let i=0;i<p.count;i++){
        posiciones.push(p.getX(i),p.getY(i),p.getZ(i));
        normales.push(n.getX(i),n.getY(i),n.getZ(i));
        colores.push(tono,tono,tono);
      }
      if(fuente.index) for(let i=0;i<fuente.index.count;i++) indices.push(fuente.index.getX(i)+desplazamiento);
      else for(let i=0;i<p.count;i++) indices.push(i+desplazamiento);
      desplazamiento+=p.count;
    }
    const resultado=new THREE.BufferGeometry();
    resultado.setAttribute("position",new THREE.Float32BufferAttribute(posiciones,3));
    resultado.setAttribute("normal",new THREE.Float32BufferAttribute(normales,3));
    resultado.setAttribute("color",new THREE.Float32BufferAttribute(colores,3));
    resultado.setIndex(indices);
    return resultado;
  },

  // Convierte un polígono estrellado (lista de puntos x,z) en una placa plana a una altura.
  placa(puntos,altura){
    const posiciones=[], normales=[], indices=[];
    posiciones.push(0,altura,0); normales.push(0,1,0);
    for(const [x,z] of puntos){ posiciones.push(x,altura,z); normales.push(0,1,0); }
    for(let i=1;i<=puntos.length;i++) indices.push(0,i%puntos.length+1,i);
    const geometria=new THREE.BufferGeometry();
    geometria.setAttribute("position",new THREE.Float32BufferAttribute(posiciones,3));
    geometria.setAttribute("normal",new THREE.Float32BufferAttribute(normales,3));
    geometria.setIndex(indices);
    return geometria;
  },
};
