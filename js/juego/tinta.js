// Identidad visual del juego: colores de los tornillos, tintes de las piezas e iconos.
const Tinta = (() => {
  const TIPOS = [
    { id: "rojo", nombre: "rojo", marca: "cruz", color: "#f0373d" },
    { id: "azul", nombre: "azul", marca: "ranura", color: "#2c6df2" },
    { id: "turquesa", nombre: "turquesa", marca: "cuadrada", color: "#1fc4cc" },
    { id: "verde", nombre: "verde", marca: "hexagonal", color: "#46c837" },
    { id: "amarillo", nombre: "amarillo", marca: "estrella", color: "#ffcb1f" },
    { id: "rosa", nombre: "rosa", marca: "triangulo", color: "#ff5cc0" },
    { id: "naranja", nombre: "naranja", marca: "rombo", color: "#ff8a1e" },
    { id: "morado", nombre: "morado", marca: "circulo", color: "#8c55ea" },
  ];

  const TINTES = {
    nieve: "#f7f3ec", noche: "#465a8e", gris: "#a9b3bf", madera: "#b9743a",
    rojo: "#ef4b48", azul: "#3f7ff0", turquesa: "#2cc6c4", verde: "#68cc4d",
    amarillo: "#ffcf37", naranja: "#ff9426", rosa: "#ff7ac8",
    lima: "#a6e24a",
  };

  function poligono(lados, radio, giro = 0) {
    return Array.from({ length: lados }, (_, i) => {
      const a = giro + (i / lados) * Math.PI * 2;
      return [radio * Math.cos(a), radio * Math.sin(a)];
    });
  }
  function estrellada(puntas, exterior, interior) {
    return Array.from({ length: puntas * 2 }, (_, i) => {
      const a = (i / (puntas * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 ? interior : exterior;
      return [r * Math.cos(a), r * Math.sin(a)];
    });
  }
  const rectangulo = (ax, ay) => [[-ax, -ay], [ax, -ay], [ax, ay], [-ax, ay]];

  // Marca de la cabeza en coordenadas -1..1, común al icono 2D y a la cabeza 3D.
  const MARCAS = {
    cruz: [rectangulo(0.58, 0.16), rectangulo(0.16, 0.58)],
    ranura: [rectangulo(0.6, 0.17)],
    cuadrada: [rectangulo(0.4, 0.4)],
    hexagonal: [poligono(6, 0.5)],
    estrella: [estrellada(5, 0.62, 0.27)],
    triangulo: [poligono(3, 0.55, -Math.PI / 2)],
    rombo: [poligono(4, 0.55)],
    circulo: [poligono(20, 0.42)],
  };

  function mezclar(hex, destino, k) {
    const a = parseInt(hex.slice(1), 16), b = parseInt(destino.slice(1), 16);
    const canal = d => Math.round(((a >> d) & 255) * (1 - k) + ((b >> d) & 255) * k);
    return "#" + [16, 8, 0].map(d => canal(d).toString(16).padStart(2, "0")).join("");
  }
  const claro = (hex, k = 0.35) => mezclar(hex, "#ffffff", k);
  const oscuro = (hex, k = 0.35) => mezclar(hex, "#000000", k);

  function marcaDe(tipo) {
    return Dispositivo.preferencias.marcas ? TIPOS[tipo].marca : "cruz";
  }

  // Cabeza de tornillo redonda y brillante, con la marca hundida.
  function icono(tipo) {
    const c = TIPOS[tipo].color;
    const marcas = MARCAS[marcaDe(tipo)].map(p => `<polygon points="${p.map(([x, y]) => `${(x * 10).toFixed(2)},${(y * 10).toFixed(2)}`).join(" ")}" fill="${oscuro(c, 0.55)}"/>`).join("");
    return `<svg viewBox="-12 -12 24 24" aria-hidden="true" focusable="false">
      <defs><radialGradient id="cabeza-${tipo}" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="${claro(c, 0.45)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${oscuro(c, 0.28)}"/></radialGradient></defs>
      <circle r="11.4" fill="${oscuro(c, 0.38)}"/><circle cy="-.5" r="10.6" fill="url(#cabeza-${tipo})"/>${marcas}
      <ellipse cx="-3.4" cy="-6.2" rx="3.6" ry="1.9" fill="#fff" opacity=".55"/></svg>`;
  }

  const ESTRELLA = estrellada(5, 10.5, 4.8).map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  function estrella(ganada) {
    return ganada
      ? `<svg viewBox="-12 -12 24 24" aria-hidden="true"><defs><linearGradient id="oro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff07a"/><stop offset="1" stop-color="#ffb300"/></linearGradient></defs><polygon points="${ESTRELLA}" fill="url(#oro)" stroke="#c97a00" stroke-width="1.5" stroke-linejoin="round"/></svg>`
      : `<svg viewBox="-12 -12 24 24" aria-hidden="true"><polygon points="${ESTRELLA}" fill="#c9d6e2" stroke="#9db0c2" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  }

  return { TIPOS, TINTES, MARCAS, marcaDe, icono, estrella, claro, oscuro };
})();
