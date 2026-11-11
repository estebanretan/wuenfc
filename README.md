# CELSIUS Garantías — V14 · Inteligencia interactiva

Versión de **evaluación**, construida sobre la V13. Mantiene los tres accesos de prueba y la imagen corporativa oficial; no incluye backend ni acceso real a datos.

## Novedades

- **Acceso minimalista:** «La garantía, más sencilla», «Todo el seguimiento. En un solo lugar», introducción breve, logotipo oficial y botones verticales Crear cuenta/Iniciar sesión. La etiqueta CELSIUS® permanece en su ubicación anterior, dentro del panel blanco, como se solicitó.
- **Bandeja de garantías:** filtros combinables por búsqueda, estado, año y mes, con opción **Todos**, paginación de 20 en 20 y total correspondiente al filtro.
- **Inteligencia de garantías:** gráficos de columna, barras y anillo que permiten filtrar el resto de las visualizaciones al seleccionar categorías. Selecciones combinables (marca, estado, región, modelo, gestor, mes y duración), etiquetas para retirarlas y botón de limpiar. Se recalculan KPIs, interpretación y tabla de expedientes.
- **Supervisión de gestor:** conserva año, mes y gestor, junto con filtros cruzados y las mismas exportaciones.
- **Reportes PDF, PowerPoint y Excel:** toman el periodo y las selecciones activas. PDF genera una portada y secciones interpretativas/gráficas/tablas en una vista de impresión de informe (Guardar como PDF). PowerPoint incluye portada, tarjetas KPI, página de interpretación, distribuciones y detalle paginado. Excel incluye resumen, lectura ejecutiva, garantías, refacciones y hojas analíticas. Las bibliotecas PowerPoint y Excel requieren conexión a Internet.

## Instrucciones de uso

1. Abre `index.html` o publica los archivos en GitHub Pages.
2. Utiliza los accesos de evaluación **Gestor** o **Administrador**.
3. Ve a **Inteligencia de garantías** y selecciona año/mes. Pulsa una barra, columna o una categoría del gráfico de anillo para aplicar un filtro. Puedes combinar dimensiones.
4. Pulsa una etiqueta activa para retirarla o **Limpiar selección**.
5. Descarga PDF, PowerPoint o Excel. El contenido se basa en el conjunto actualmente filtrado.
6. En Administrador, entra a **Supervisión de gestor** para filtrar también por responsable.

## Publicación

Repositorio: `https://github.com/estebanretan/wuenfc`. Sube el **contenido descomprimido** a la raíz de la rama `main`, manteniendo `assets/`, `docs/`, `sql/` y `index.html`. No cambies el DNS de Squarespace.

## Limitaciones importantes

- Los 35 expedientes detallados de ejemplo pertenecen a 2026. Aunque el selector permita años anteriores, en esos periodos no hay registros detallados disponibles; no se mezclan con las series ilustrativas de años previos.
- El panel BI implementa **filtros cruzados y selección de categorías en la demo**; no es Power BI embebido y no incluye aún modelado semántico, autorización multiusuario, publicación de datasets, consultas a la base real ni drill-through a múltiples niveles.
- **PDF** depende de la función de impresión del navegador («Guardar como PDF»); no genera un archivo automáticamente desde servidor. Excel y PowerPoint usan librerías web bajo demanda; necesitan conexión y permiso para descargas.
- Resúmenes y recomendaciones se generan mediante reglas descriptivas sobre los datos filtrados, no por análisis estadístico inferencial ni IA conectada.
- No se hizo integración con Supabase, Cloud Run, WhatsApp ni correo. Todos los datos son **ficticios** y los accesos de prueba deben retirarse antes del lanzamiento público con información real.

## Archivos principales

- `index.html`: interfaz web
- `assets/styles.css`: apariencia y responsive
- `assets/app.js`: pantallas, filtros cruzados, dataset ficticio, exportaciones
- `assets/logo-celsius-oficial.png`: logotipo proporcionado
- `docs/`, `sql/`: documentos y esquemas preliminares del proyecto
