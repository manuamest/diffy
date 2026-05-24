# AGENTS.md - Reglas, Especificaciones y Bitácora de Desarrollo

Este archivo define las reglas de desarrollo, especificaciones de la herramienta **ApexDiff** (Diff Checker ligero de una sola página), y actúa como un registro de errores y decisiones tomadas por el agente de IA.

---

## 🎯 Especificaciones de ApexDiff (GitHub Pages)

### 1. Arquitectura y Despliegue
* **Plataforma:** GitHub Pages.
* **Formato:** Aplicación de una sola página (Single-Page Application).
* **Tecnologías:** HTML5 (semántico), CSS3 (Vainilla, con variables y Grid/Flexbox), Javascript (Vainilla ES6+).
* **Dependencias:** Sin compilación (zero build steps). Para el algoritmo de Diff se usará `jsdiff` importado mediante CDN seguro (Cloudflare o unpkg).

### 2. Características del Producto
* **Entrada de datos:**
  * Dos áreas de texto colapsables (Original vs Modificado).
  * Soporte de arrastrar y soltar (Drag & Drop) para cargar archivos de texto (.txt, .js, .json, .html, etc.).
  * Limpieza rápida de texto y botón de intercambio (Swap).
  * Botón de auto-formateo para JSON minificado.
* **Control de Comparación:**
  * Selección de vista: **Split** (lado a lado) y **Unified** (en línea).
  * Nivel de granularidad: por línea, por palabra o por carácter.
  * Ignorar espacios en blanco (trim/ignore whitespace) y case sensitivity.
  * Comparación en tiempo real (debounced a 300ms) con opción de desactivarla para comparar manualmente textos gigantes.
* **Visualización de Resultados:**
  * Scroll lateral y vertical perfectamente sincronizado en vista Split.
  * Alineación inteligente de líneas (los huecos generados por líneas eliminadas/añadidas se rellenan para mantener las líneas correspondientes niveladas).
  * Resaltado de sintaxis básico y resaltado ultra-preciso dentro de la línea (sub-line word highlighting).
  * Estadísticas rápidas: total de líneas, adiciones, eliminaciones y porcentaje de similitud.
* **Estética (UI/UX):**
  * Diseño visual Premium. Modo oscuro por defecto con acentos de color vibrantes (verde esmeralda para adiciones, rojo coral para eliminaciones).
  * Glassmorphism sutil y bordes redondeados modernos.

---

## 📜 Reglas para el Agente de IA (Antigravity)

1. **Mantenerlo ligero:** No introducir frameworks pesados ni pasos de build complejos (Webpack/Vite/React) a menos que sea estrictamente necesario. Debe ser "plug-and-play" abriendo el `index.html`.
2. **Verificación visual y de código:** Asegurar que los estilos no rompan la legibilidad del código. Las fuentes deben ser monoespaciadas (`Fira Code`, `JetBrains Mono` o `Courier New` como fallback).
3. **Registro obligatorio de errores:** Cada vez que el agente cometa un error (bugs de lógica, fallos de UI, errores de alineación en scroll, etc.), **debe registrarlo inmediatamente** en la sección "Bitácora de Errores" de este archivo antes de corregirlo.

---

## 🐛 Bitácora de Errores y Correcciones (Error Log)

### [BUG-001] Opciones de configuración no actualizan el diff correctamente
* **Fecha:** 2026-05-23
* **Fallo:** Al activar/desactivar opciones como "Ignorar espacios" o "Ignorar mayúsculas", el diff no se recalculaba de forma confiable en todos los estados.
* **Causa:** El listener de cambio dependía de la existencia de `alignedRows.length > 0`, que podía fallar si se borraban los inputs o si el flujo de ejecución no actualizaba correctamente el estado global.
* **Solución:** Simplificar los listeners de las opciones llamando directamente a `compareTexts()` de forma incondicional cuando cambie cualquier opción o texto, asegurando consistencia.

### [UI-001] Cabecera redundante e innecesaria
* **Fecha:** 2026-05-23
* **Fallo:** La barra superior ocupaba mucho espacio vertical útil con títulos promocionales innecesarios.
* **Causa:** Diseño inicial demasiado enfocado en branding comercial en lugar de priorizar el espacio de trabajo del programador.
* **Solución:** Eliminar la barra de cabecera superior y mover los controles de tema e información a una sección minimalista e integrada en la barra de configuración.

### [UI-002] Cajas de entrada de texto demasiado pequeñas
* **Fecha:** 2026-05-23
* **Fallo:** Los textareas para el texto original y modificado tenían una altura fija pequeña (350px).
* **Causa:** CSS con `height: 350px` rígido e insuficiente.
* **Solución:** Aumentar el tamaño de las cajas a un valor responsivo de `52vh` (el 52% del alto de pantalla del usuario) con un `min-height: 420px` para dar mucho más espacio de trabajo en cualquier monitor, manteniendo la simetría entre los paneles A y B.

### [ARCH-001] Diseño inicial inadecuado e inferior al estándar del mercado
* **Fecha:** 2026-05-23
* **Fallo:** La interfaz inicial basada en `textareas` nativos y diffing en tablas HTML fue rechazada por ser anticuada, torpe, y no ofrecer una experiencia de usuario a la altura de un entorno de desarrollo profesional (sin resaltado de sintaxis, minimapa ni scroll nativo).
* **Causa:** Decisiones de diseño iniciales conservadoras buscando máxima simplicidad a expensas de la usabilidad y estética.
* **Solución:** Borrado completo del código. Pivotaje hacia una arquitectura basada en **Monaco Editor** (el motor de VS Code) inyectado por CDN, asegurando una experiencia de primer nivel (premium) mientras se mantiene la naturaleza ligera y sin compilación del proyecto (Single-Page App para GitHub Pages).

### [FEAT-001] Falta de integración directa con el portapapeles (Copiar/Pegar)
* **Fecha:** 2026-05-23
* **Fallo:** No existían botones rápidos para copiar o pegar el contenido de los textareas individuales desde el portapapeles.
* **Causa:** Omisión de botones y lógica para llamar a `navigator.clipboard`.
* **Solución:** Resuelto delegando el manejo nativo del portapapeles (con todos sus atajos) directamente a Monaco Editor en la refactorización v2.

### [BUG-002] Toggle de minimapa no actualiza Monaco DiffEditor
* **Fecha:** 2026-05-24
* **Fallo:** El botón de minimapa cambiaba su estado visual, pero el minimapa no aparecía en la comparativa.
* **Causa:** Se intentó actualizar la opción `minimap` solo desde el wrapper `DiffEditor`, sin forzar la actualización en los editores internos original y modificado.
* **Solución:** Mantener el wrapper `DiffEditor` y el editor original sin minimapa, y activar el minimapa solo en `getModifiedEditor()` con `side: 'right'`, `size: 'proportional'` y `renderCharacters: false`.

### [BUG-003] Minimap demasiado literal y opaco
* **Fecha:** 2026-05-24
* **Fallo:** El minimapa del panel modificado seguía pareciendo texto miniaturizado y se renderizaba con un fondo opaco que rompía la integración visual.
* **Causa:** Faltaban opciones de minimapa más restrictivas (`maxColumn`, escala y slider) y colores de tema específicos para hacer transparente el minimapa.
* **Solución:** Limitar el minimapa a bloques compactos sin caracteres (`renderCharacters: false`, `maxColumn`, `scale`) y definir colores `minimap.*` transparentes en los temas Monaco, reforzando la transparencia con CSS sobre el contenedor y canvas del minimapa.

### [BUG-004] Minimap no comunica diferencias y queda demasiado pequeño
* **Fecha:** 2026-05-24
* **Fallo:** El minimapa se veía como texto miniaturizado, demasiado pequeño y sin marcas claras de diferencias.
* **Causa:** Se redujo demasiado `maxColumn`, se bajó la opacidad del canvas y se dejó desactivado `renderOverviewRuler`, que es la capa de Monaco que mejor comunica cambios en el borde del editor.
* **Solución:** Ampliar el minimapa del editor modificado (`maxColumn: 120`, `scale: 2`), mantenerlo sin caracteres y añadir decoraciones explícitas de cambios en minimap/overview ruler solo para el panel modificado.

### [BUG-005] Marcas de diferencias poco visibles en minimap
* **Fecha:** 2026-05-24
* **Fallo:** Las diferencias en el minimapa del panel modificado se percibían demasiado tenues.
* **Causa:** Las decoraciones usaban colores con alfa parcial y se dibujaban en el gutter del minimapa, ocupando muy poca superficie visual.
* **Solución:** Usar colores opacos para las marcas de cambios y dibujarlas en `MinimapPosition.Inline` para que ocupen más área del minimapa.

### [BUG-006] Pegado de texto desplaza la vista completa
* **Fecha:** 2026-05-24
* **Fallo:** Al pegar texto en un editor, Monaco podía desplazar la vista a otra zona del documento en lugar de mantener el contexto donde se realizó el pegado.
* **Causa:** El `DiffEditor` recalculaba el diff tras cambios grandes y podía sincronizar/revelar rangos, alterando el `scrollTop` de los editores internos.
* **Solución:** Capturar `scrollTop`/`scrollLeft` de ambos editores antes del evento `paste` y mantener un bloqueo temporal del scroll durante varios ciclos (`requestAnimationFrame`, timeouts cortos y eventos `onDidScrollChange`) para neutralizar los reposicionamientos asíncronos de Monaco.
