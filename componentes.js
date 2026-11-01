// Motor de componentes: cada etiqueta ui-* usa templates/<nombre>.html
// Cada plantilla se pide una sola vez; en un móvil, cada petición gasta batería y datos.
const Componentes = (() => {
  const plantillas = new Map();
  let peticiones = 0;

  function plantilla(nombre) {
    if (!/^[a-z][a-z0-9-]*$/.test(nombre)) throw new Error("Componente inválido");
    if (!plantillas.has(nombre)) {
      peticiones++;
      const pedida = fetch(`templates/${nombre}.html`).then(respuesta => {
        if (!respuesta.ok) throw new Error(`Falta templates/${nombre}.html`);
        return respuesta.text();
      });
      // Si falla (por ejemplo, sin red), se puede volver a intentar más tarde.
      pedida.catch(() => plantillas.delete(nombre));
      plantillas.set(nombre, pedida);
    }
    return plantillas.get(nombre);
  }

  function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // Lo que la plantilla no usa con {{nombre}} viaja por {{attrs}}: id, data-*, aria-*…
  function atributos(nodo, html) {
    return [...nodo.attributes]
      .filter(a => !["class", "columnas"].includes(a.name) && !html.includes(`{{${a.name}}}`))
      .map(a => `${a.name}="${escapar(a.value)}"`)
      .join(" ");
  }

  async function renderizar(raiz) {
    // Renderizar primero los componentes hijos; después el padre.
    async function transformar(nodo) {
      for (const hijo of [...nodo.children]) await transformar(hijo);
      if (!nodo.localName.startsWith("ui-")) return;
      const nombre = nodo.localName.slice(3);
      const html = await plantilla(nombre);
      const variables = { type: nombre === "boton" ? "button" : "text" };
      for (const a of nodo.attributes) variables[a.name] = escapar(a.value);
      variables.class = escapar(nodo.getAttribute("class") || "");
      variables.contenido = nodo.innerHTML;
      variables.attrs = atributos(nodo, html);
      const columnas = (nodo.getAttribute("columnas") || "").split(",").filter(Boolean);
      variables.cabeceras = columnas.map(c => `<th>${escapar(c.trim())}</th>`).join("");
      const resultado = html.replace(/{{([\w-]+)}}/g, (_, clave) => variables[clave] ?? "");
      // Con <template> sí se pueden crear <tr> y <td> sueltos; en otro contexto se perderían.
      const molde = document.createElement("template");
      molde.innerHTML = resultado;
      nodo.replaceWith(molde.content);
    }
    for (const hijo of [...raiz.children]) await transformar(hijo);
  }

  return { renderizar, escapar, get peticiones() { return peticiones; }, get pedidas() { return [...plantillas.keys()]; } };
})();
