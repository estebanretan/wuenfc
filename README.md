# CELSIUS — Portal de Garantías V9 (demo GitHub Pages)

Versión de **demostración con datos ficticios**. No contiene autenticación verdadera, almacenamiento persistente, envío de mensajes ni API de garantías. Los tres accesos desde el inicio son: Cliente, Gestor y Administrador. **No debe usarse para aceptar registros o evidencias reales**.

## Cambios V9

- **Crear cuenta primero**; solo razón social, correo, teléfono, contraseña y confirmación; contraseña mínima de 10 caracteres, con botón para revelar la escritura.
- Sin requisito de confirmación de correo en el diseño propuesto. **En producción se exigirá verificar teléfono** y utilizar recuperación por código OTP de WhatsApp; todavía no está integrada.
- Cliente: estado **Cerrada** en lugar de Entregada; relación equipo y modelo, conformidad únicamente al final, evidencia única de múltiples documentos/fotos/videos, recolección en sucursal Culiacán.
- Estados principales visibles: **Revisión, Esperando info del cliente, Aprobada, Rechazada, Cerrada**. La logística de entrega seguirá llevándose internamente sin necesitar estados públicos adicionales.
- Gestor: panel operativo y revisión de expedientes. Administrador: lo anterior más Colaboradores y **Supervisión de gestor**.
- Dashboard ejecutivo: gráficas anuales, mensuales, por estado (anillo), por marca, por región, por modelo, histograma de tiempos, causas de rechazo, empresas consolidadas y carga de gestores. **Los datos interanuales (2024–2026) son ilustrativos**; no proceden de una base histórica de Celsius.
- Expedientes paginados en bloques de 20. Nota de rechazo visible en el expediente. Botones **Mi cuenta** y **Cerrar sesión** en el encabezado, también en móvil.
- Exportar **Excel (.xlsx)** con varias hojas, **PowerPoint (.pptx)** y **PDF** (diálogo de impresión/guardar como PDF); CSV alternativo. Excel y PPTX requieren que el navegador pueda descargar sus respectivas bibliotecas externas; no ejecutan la exportación desde un servidor.
- Directorio de cuentas, grupos de empresas, y 30 casos para el tester Cliente, con decenas de casos para los perfiles internos. Todos los cambios son temporales.

## Publicación

1. Mantener copia de esta demo en una rama/repositorio de **pruebas**; subir la estructura de carpetas conservando `/assets`.
2. En GitHub → Settings → Pages publicar `/ (root)` de la rama seleccionada.
3. Si se utiliza dominio personalizado, configurarlo con DNS correcto.
4. No cargar datos reales, secretos o credenciales en el repositorio público.

## Por implementar antes de producción

API backend, PostgreSQL, controles de acceso por usuario y por expediente, seguridad contra consultas de terceros, identidad por correo o teléfono con verificación de posesión del teléfono, recuperación OTP por WhatsApp, políticas de contraseña, envío de correo y WhatsApp real, carga privada y antivirus de archivos, firmas y consentimiento, auditoría inmutable, backups, pruebas de seguridad y exports del servidor con permisos. Eliminar todos los accesos de prueba.

**Nota de seguridad:** quitar la verificación de correo no implica que el usuario deba entrar sin ningún mecanismo de verificación; Celsius ha solicitado códigos de WhatsApp para autenticar y recuperar contraseñas. La protección antiabuso, verificación de teléfono y políticas de identidad deben implementarse en el backend.
