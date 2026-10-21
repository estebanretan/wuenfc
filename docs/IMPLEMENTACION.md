# CELSIUS · Plan de implementación

**Entregado**: prototipo navegable HTML/CSS/JS con módulos de cliente, corporativo, maestra y simulador WhatsApp; propuesta de modelo SQL. **No** hay autenticación ni APIs reales conectadas.

1. Confirmar propiedad y autorización de marca de celsius.com.mx y recibir logo SVG/PNG oficial, manual de marca y archivo de garantías `.xlsx`/PDF (el `.xls` antiguo no está mapeado aquí). Las marcas del prototipo son texto tipográfico, no logos oficiales.
2. Migrar frontend demo a Next.js TypeScript con navegación, formularios validados por Zod y React Hook Form, pruebas automatizadas accesibilidad y PWA; versionar en GitHub privado.
3. Montar Supabase proyecto **región cercana a México**, Postgres administrado, backups diarios + restauraciones probadas y almacenamiento privado con políticas RLS. Elegir región por latencia y políticas de residencia de datos.
4. Establecer autentificación **email o teléfono + contraseña y segundo paso OTP WhatsApp** con Twilio/Twilio Verify donde soportado; email verificado y número verificado obligatorios; cuenta maestra provisionada por operadores de despliegue, nunca disponible por registro. Asegurar recuperación por medios alternos.
5. Crear backend API con seguridad por objeto y rol, verificación de sesiones, prevención CSRF, rate limits, anti-enumeración, auditoría, límites de archivos, verificación malware y URLs firmadas; acciones sensibles mediante transacciones e idempotencia.
6. Implementar máquina de estados por folio y pieza: pendiente, aclaración, aprobado, rechazado, confirmación del cliente, revisión final, surtido, envío/recolección, entrega, retorno de pieza y reincidencia; validaciones de obligatoriedad por tipo de pieza configuradas por Celsius.
7. Integrar WhatsApp Business Platform + servicio de correo; plantillas revisadas y aprobadas, webhook firmado, colas, reintentos, manejo de ventanas de mensajería y consentimiento.
8. Dashboard real: KPIs, SLA, motivos de rechazo, inventario, costos internos, flujos de fábrica, logística, ticket de agente, bitácora y permisos distintos por rol. La cuenta maestra invita, suspende y quita acceso de colaboradores, con revocación inmediata de sesiones y control de credenciales.
9. Código bajo rama protegida, CI/CD, análisis SAST/DAST, pruebas RLS de clientes cruzados, prueba de penetración, monitoreo y ambiente staging.
10. Despliegue en hosting frontend administrado (por ejemplo Vercel o Cloudflare Pages) + servicios Supabase, DNS a través del registrador del dominio, HTTPS, correos autenticados SPF/DKIM/DMARC y dominio personalizado.

## Dudas de negocio pendientes
- Políticas Celsius de vigencia, documentación obligatoria por pieza, periodo de reincidencia, tiempos SLA y criterios para rechazo.
- Número oficial WhatsApp Business para conectar; agente humano, horario, quién supervisa el inbox, consentimiento y textos legales.
- Comportamiento si el cliente NO acepta excluir refacciones rechazadas; proceso de disputa.
- Renovación anual de folios: se propone reinicio desde 0100 cada año, necesita aprobación.
- Captura de firma válida (trazo/firma simple/avanzada), documento de conformidad y conservación; requisitos legales aplicables.
- Cómo validar clientela y ventas, inventario/ERP, importación de catálogo, paqueterías y sucursales.
- Sucursal propia, quién se hace cargo de devolución de refacción y costo de envío.

## Arquitectura y datos
GitHub privado solo código. Cloudflare DNS/WAF/Turnstile es protección perimetral; no guardar contraseñas allí. La base Postgres almacena datos estructurados, Storage archivos privados, Auth credenciales procesadas por proveedor, Secret Manager credenciales API. El dominio Squarespace es independiente del hosting; ninguna PC local requiere estar encendida.
