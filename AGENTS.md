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

