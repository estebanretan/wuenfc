## CELSIUS V19 — Informes ejecutivos y navegación

- Retiradas las frases solicitadas del formulario y del pie del informe PDF.
- Nuevos iconos diferenciados para Menú, Dashboard, Expedientes, Clientes y Colaboradores.
- PowerPoint compacto: portada con KPIs, evolución/estados, distribución transversal y detalle de expedientes (32 por diapositiva).
- El PDF mantiene su formato empresarial y ya no utiliza la frase solicitada.
- Los accesos, folios, usuarios y datos siguen siendo de prueba; no usar para producción.

# CELSIUS Garantías V18 — Supervisión y exportaciones

Versión de evaluación con datos ficticios. Sin autenticación real ni auditoría inmutable.

## Cambios
- Eliminado Comunicaciones del menú cliente y el botón flotante de ayuda de toda la plataforma.
- Navegación: **Clientes** en lugar de Cuentas y empresas; **Supervisión** en lugar de Gestores.
- Costo interno oculto de la vista de expediente.
- Invitación corporativa limitada a **Gestor** y **Administrador** (interfaz de prueba).
- Supervisión exclusiva del administrador, filtros visuales uniformes y exportaciones **PDF, PPTX y XLSX** del periodo seleccionado.
- Nuevo gráfico de tiempos en Dashboard.
- PowerPoint generado desde una biblioteca incluida en `assets/vendor/pptxgen.bundle.js`, no descargada desde un CDN.
- Excel `.xlsx` generado localmente mediante código OOXML en `assets/vendor/celsius-xlsx.js`, sin depender de servicios externos.
- Portada del PDF con el logo y encabezado más próximos.

## Publicación
Subir todos los archivos a la raíz del repositorio GitHub Pages, conservando `assets/vendor`. No mover ni modificar registros DNS.

## Seguridad
Los tres accesos son simulados. La supervisión utiliza eventos ficticios almacenados temporalmente en el navegador; para producción se necesita un backend con control de roles y auditoría inmutable. Los botones de descarga solo procesan datos ficticios o cambios de la sesión.


## V20 — Gráficas PowerPoint y conformidad
- Texto de confirmación: «Confirmo la solicitud y la veracidad de la información proporcionada.»
- PowerPoint con gráficos nativos y editables: línea (tendencia), anillo (estados y regiones), barras (marcas y gestores), columnas (modelos y tiempos de resolución), además de portada, resumen y expedientes.
- Los informes respetan los filtros del centro de inteligencia de garantías.
- Los expedientes se agregan a las páginas de detalle sin eliminar filas.


## V21 — acceso a perfiles de evaluación

Los accesos Cliente, Gestor y Administrador ahora solicitan una contraseña antes de abrir el perfil. La comprobación se realiza **únicamente en el navegador** mediante una huella SHA-256 del texto indicado. No hay autenticación del servidor: al estar publicado el código JavaScript, usuarios técnicos pueden omitir el control. No utilices este mecanismo para proteger información real, expedientes privados o privilegios corporativos. Para producción se requiere autenticación en backend y control de roles verificable en cada petición.

Los iconos de Dashboard, Clientes y Colaboradores se muestran sin colores particulares, siguiendo el color neutro de la navegación.


## V22 — Expedientes y tarjeta Cerradas
- En **Expedientes** (Gestor y Administrador) aparecen botones PDF, PowerPoint y Excel. Sus datos proceden del filtro instantáneo de texto, estatus, año y mes, en todas las páginas del resultado (no solo las primeras 20 filas).
- El PDF incluye resumen, KPIs, gráficas y relación de expedientes; utiliza Guardar como PDF en el cuadro de impresión del navegador.
- El Excel genera hojas de resumen, garantías, refacciones y desgloses; el PowerPoint genera gráficas nativas editables y expedientes.
- Corregido el espaciado/altura de los números KPI, incluido **Cerradas**, para evitar cortes de glifos.
- Estas herramientas siguen utilizando información ficticia del prototipo.


## V23 — Catálogo de refacciones
- Nuevo menú **Catálogo de refacciones** solo para Gestor y Administrador: consulta por modelo o por refacción y pestaña **Administrar catálogos** para cargar, reemplazar, actualizar, exportar y eliminar catálogos por marca (con registro en Supervisión).
- Incluye el catálogo base YORK (180 modelos, 2,856 refacciones) en `assets/catalog-data-york.js`.
- **Nueva garantía**: selección guiada Marca → Modelo → Unidad → Refacción. Al terminar, los datos del equipo quedan en una ficha fija no editable; se cambian con *Cambiar refacción* / *Cambiar equipo*. Si el equipo no está en el catálogo, captura manual.
- Excel sin internet: lectura `.xlsx`/`.csv` propia y escritura con `celsius-xlsx.js`. Detalle en `docs/CATALOGO.md`.
- Los catálogos cargados se guardan en el navegador (prototipo); ver limitaciones en `docs/CATALOGO.md`.
