# CELSIUS Garantías — V13

Versión de evaluación que conserva el portal V12 y ajusta la presentación inicial.

## Cambios

- Nuevo acceso más compacto y profesional, con identidad visual Celsius y dos botones verticales: Crear cuenta e Iniciar sesión.
- Se conserva la zona de evaluación con Cliente, Gestor y Administrador **fuera** de la pantalla principal.
- Se retira el campo de carga «Factura de servicio y mantenimiento (si se realizó)». Se mantiene la carga general de documentos, fotos y videos.
- Deshabilitado el arrastre nativo de imágenes y la carga de archivos por arrastrar y soltar. **Seleccionar archivos** sigue disponible.
- Etiqueta actualizada a «Contraseña (10 caracteres) *». La validación de exactamente diez caracteres permanece en esta demostración.

## Ejecutar y publicar

Abre `index.html` para revisión local o sube el contenido completo (no el ZIP) a la raíz de `main` en GitHub Pages. Mantén las carpetas `assets/`, `docs/` y `sql/`. No es necesario cambiar el DNS de `celsiusgarantias.com` para esta actualización.

**Limitación:** se trata de una demo estática. No hay cuentas ni almacenamiento real; no publicar archivos sensibles ni utilizar los accesos de prueba para gestión de garantías reales.

# CELSIUS Garantías V12 — Navegación compacta, validación técnica y reportes filtrados

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

## Cambios V12

- Menú lateral más compacto sin cambiar la identidad de Celsius.
- Factura y fechas del equipo siempre visibles, con folio y fechas obligatorios.
- Evaluación del técnico: mínimo 50 palabras, contador en vivo y validación al enviar.
- Registro de demostración: contraseña de exactamente 10 caracteres (por petición del cliente; en producción se recomienda admitir contraseñas más largas).
- Dashboard operativo sin analítica ejecutiva ni exportaciones.
- Inteligencia de garantías agrupa los gráficos, filtros mensuales/anuales y exportaciones PDF/PowerPoint/Excel. Disponible para Gestor y Administrador; Supervisión de gestor conserva su propio informe en Administrador.
- Expedientes del periodo y estadísticas dependen del año y mes seleccionados. Los datos siguen siendo ficticios.
