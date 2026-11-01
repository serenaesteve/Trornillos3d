## a) Se han identificado los elementos que componen la arquitectura de un juego 2D y 3D?

He partido de la lista que vimos en clase y he localizado cada elemento en mi juego, Despiece: condiciones iniciales, bucle, clases, escenario visual y auditivo, interfaz, sistema de entrada, físicas, partículas, condiciones de ganar y perder, gestión de la frustración y gamificación. De postproducción solo hay ajuste de tonos. Al convertir el motor 2D de clase a 3D he comprobado qué cambia: las coordenadas, la cámara con perspectiva, la selección por rayo en lugar de por distancia y la jerarquía en grafo en lugar de lista plana. Está en el apartado 2 de la memoria.

## b) Se han analizado los componentes de un motor de juegos?

He escrito uno, dentro de mi framework móvil Telón, que tiene además las 17 plantillas del framework de clase y ejecuta sin cambios su vista de productos. `js/motor/` tiene `Motor` (lienzo, tiempo y bucle), `Escena` (actores, grafo, animaciones, colisiones y rayos), `Actor`, `Camara`, `Entrada`, `Estudio` (iluminación), `Geometrias`, `Particulas`, `Recursos`, `Sonido` e `Inspector`. Es genérico: una prueba automática comprueba que su código no menciona nada del juego, y la pestaña Motor de la app es una escena de bloques que no usa `js/juego/`. Para cada componente explico qué decisión tomé pensando en el móvil, como dejar de dibujar cuando la imagen no cambia. Está en el apartado 3 de la memoria.

## c) Se han analizado entornos de desarrollo de juegos?

He comparado el entorno de Unity, Godot y Unreal, que integran editor de escenas, inspector y perfilador en un programa, con el de Phaser, Three.js y A-Frame, que se trabajan con editor de código y navegador. Yo he usado el segundo tipo, con emulación de dispositivo y Playwright, y lo probé con cinco motores web. Unity, Godot y Unreal los he analizado, pero no ejecutado, porque son editores de escritorio que no tengo instalados. Trabajar sin editor me obligó a construir las herramientas que un editor ya trae: la pestaña Motor y el `Inspector` cubren esa parte. Está en el apartado 4 de la memoria.

## d) Se han analizado diferentes motores de juegos, sus características y funcionalidades?

He comparado Unity, Godot, Unreal, Babylon.js, Phaser, Three.js, A-Frame y el motor de clase: tipo, lenguaje, entorno, soporte móvil, puntos fuertes y limitación para este proyecto. Además, probé cinco de ellos haciendo la misma escena y midiendo peso, código propio y arranque en el mismo móvil emulado. Elegí Three.js con un motor propio encima porque el proyecto debía ser mi framework, girar un modelo 3D con el dedo y compartir interfaz con las vistas `ui-*`. También indico que, para publicar un juego comercial en las tiendas, elegiría Godot o Unity. Está en el apartado 4 de la memoria.

## e) Se han identificado los bloques funcionales de un juego existente?

He analizado Screwdom 3D a partir de su ficha pública y sus capturas oficiales: reglas, interfaz de partida, contenido, niveles, monetización, dibujo 3D, entrada táctil, audio y animación, persistencia y gestor de escenas. Indico cuáles se ven en la ficha y cuáles deduzco del tipo de juego, porque no tengo acceso a su código. La ficha tampoco dice qué motor usa, así que lo dejo como desconocido. Está en el apartado 5 de la memoria.

## f) Se ha reconocido la representación lógica y espacial de una escena gráfica sobre un juego existente?

He distinguido las dos: la lógica dice qué relación hay entre los elementos (qué pieza sujeta un tornillo, qué pieza lo tapa) y la espacial dice dónde está cada uno. Sobre una captura oficial anotada de Screwdom 3D, explico cada elemento en las dos representaciones, incluido el paso del tornillo del mundo 3D a la interfaz 2D. Presento su escena deducida y la verifico en mi propio juego con el `Inspector`, que muestra en directo el árbol con coordenadas locales y de mundo. Por ejemplo, cuando una pieza cae cambia la posición de mundo de sus tornillos, pero no la local. En mi juego, además, la espacial genera la lógica: las dependencias entre piezas se calculan lanzando rayos desde cada tornillo. Está en el apartado 5 de la memoria.
