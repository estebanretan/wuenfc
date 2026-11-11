# Catálogo de equipos y refacciones (V23)

## Quién lo usa
- **Gestor y Administrador**: menú *Catálogo de refacciones* con dos pestañas.
  - *Consultar*: marca → modelo → evaporadora / condensadora → refacciones; vista "Por refacción" con unidades compatibles agrupadas por familia.
  - *Administrar catálogos*: cargar un Excel nuevo, reemplazar o actualizar una marca, exportarla y eliminarla (con confirmación en la misma fila). El catálogo base de YORK se puede eliminar y restaurar. Cada carga, eliminación y restauración queda en Supervisión.
- **Cliente**: no ve el menú; usa el catálogo dentro de *Nueva garantía*.

Permisos: constante `MANAGERS=['master','corp']` al inicio de `assets/catalog.js`.

## Nueva garantía
1. Marca → 2. Modelo (búsqueda por código de etiqueta) → 3. Unidad (evaporadora o condensadora) → 4. Refacción.
2. Al elegir la refacción aparece una **ficha fija** con refacción, número de parte, marca, modelo, evaporadora y condensadora. Esos datos no se pueden editar; se envían como campos ocultos. Para corregirlos: *Cambiar refacción* o *Cambiar equipo*.
3. *Mi equipo no está en el catálogo* abre la captura manual de siempre.
4. Serie, modelo del compresor, factura y fechas siguen siendo editables.

## Excel (sin internet)
- Lectura: `.xlsx` (lector propio en `catalog.js`) y `.csv`. El `.xls` antiguo debe guardarse como `.xlsx`.
- Escritura: `assets/vendor/celsius-xlsx.js` (el mismo generador de los informes).
- Plantilla: botón *Descargar plantilla* o `docs/Plantilla_Catalogo_Celsius.xlsx`.

| Columna | Obligatoria | Notas |
|---|---|---|
| marca | Sí* | *O escribirla en el campo "Marca" al cargar |
| familia, descripcion_sistema, tipo_equipo, tecnologia, funcion, refrigerante, capacidad_tr, voltaje | No | Datos del modelo |
| modelo_sistema | Recomendada | Agrupa evaporadora + condensadora |
| rol | Sí | evaporadora / condensadora |
| equipo_codigo | Sí | Código de la unidad |
| equipo_descripcion | No | |
| no_parte | Sí | Formato texto |
| descripcion_parte | Sí | |
| categoria | No | Se asigna sola si falta |
| sistema_clave | No | Solo modelos sin código de sistema; lo llena la exportación |

También acepta el Excel de tablas para Python (`sistemas`, `sistema_equipos`, `refacciones`, `catalogo_partes`). La hoja `catalogo` exportada se vuelve a cargar sin pérdidas.

## Limitaciones del prototipo
Los catálogos se guardan en IndexedDB del navegador: solo los ve quien los cargó, en ese navegador (incluido el formulario de los clientes). Para producción: endpoint autenticado + tablas de `sql/003_catalog.sql`, y guardar en la garantía el id de la refacción y de la unidad seleccionadas.
