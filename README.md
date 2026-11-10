# CELSIUS Garantías V11 — Ajustes de solicitud y reportes

Versión navegable de evaluación con información simulada. **No usar para registros ni expedientes reales.**

## Modificaciones principales

- Menú de acceso con botones verticales **Crear cuenta** y **Iniciar sesión**; accesos de evaluación por fuera del diseño principal.
- **Una solicitud = una refacción**. No existe botón para agregar otra ni guardar borrador.
- Sección 02: Marca, modelos de condensadora, evaporadora y compresor (opcionales), serie obligatoria; identificación de pieza/número de parte; fechas y factura plegables.
- Sección 03: exclusivamente preguntas técnicas Sí/No, mediciones numéricas y diagnóstico del técnico, sin duplicar los datos de pieza.
- Modalidad: **recolección en sucursal** seleccionable entre Culiacán, Mazatlán, Hermosillo y Mexicali. No existe opción de paquetería.
- Administrador: pestaña **Centro de reportes**, independiente del Dashboard operativo, con filtros año/mes, gráficos, tablas e indicadores.
- Supervisión de gestor: tablero propio con filtro por gestor/año/mes, gráficas e información detallada.
- Exportaciones sobre el periodo **actualmente seleccionado**: Excel multipestaña, PowerPoint con métricas y visualizaciones de categorías y PDF mediante impresión con gráficos.

## Precisión de las exportaciones

Excel utiliza SheetJS por CDN y exporta las hojas Resumen, Garantías, Refacciones, Estados, Marcas, Regiones, Modelos, Gestores, Meses, Tiempos, Cuentas, Agrupaciones y Colaboradores. PowerPoint usa PptxGenJS por CDN y construye diapositivas de resumen, barras de las distribuciones y expedientes. PDF abre una ventana de informe filtrado, lista para imprimir/guardar como PDF. **Los filtros deben elegirse en la vista antes de descargar.** Los datos de 2024–2025 de los gráficos históricos del dashboard operativo son ilustrativos; las solicitudes detalladas disponibles corresponden al año 2026.

Las bibliotecas de Excel y PowerPoint requieren conexión de internet. Los reportes no son copias de respaldo oficiales ni certifican datos de producción.

## GitHub Pages

Subir el contenido de este ZIP (no el ZIP como único archivo) a `estebanretan/wuenfc` en la rama principal, conservando `index.html`, `assets/`, `sql/` y `docs/`. No alterar el dominio/DNS ya configurados.

## Pendientes de producción

Autenticación real, verificación telefónica por WhatsApp, backend y permisos, storage privado de evidencias, trazabilidad de estados y dictámenes, firma de entrega y exportación autorizada desde el servidor. Los accesos de evaluación deben retirarse antes de trabajar con datos de clientes.
