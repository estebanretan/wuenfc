# WhatsApp Celsius · Flujos de producción (propuesta)

## Cuenta
1. Cliente introduce nombre, apellidos, correo, WhatsApp E.164, dirección completa, tipo particular/empresa y contraseña. **Sin RFC obligatorio**.
2. El backend crea un registro **no habilitado** con verificación de email y WhatsApp pendiente. Evitar cuentas huérfanas, reintentos y altas duplicadas.
3. Correo de confirmación mediante proveedor autenticado; teléfono mediante **OTP por WhatsApp** (p. ej. Supabase Auth con Twilio/Twilio Verify, según soporte vigente). Proteger códigos con caducidad, límite de intentos, rate limit, anti-enumeración y cooldown.
4. Solo habilitar acceso a cliente cuando **email y número estén verificados**. Su sesión comienza únicamente tras password y validación OTP WhatsApp; para personal corporativo exigir MFA fuerte resistente a phishing cuando sea posible (TOTP/passkey) y políticas reforzadas, no confiar únicamente en WhatsApp.
5. Inicio de sesión: aceptar correo o teléfono, resolver identificador a la cuenta verificada solo desde servidor sin exponer existencias; verificar contraseña, luego desafío OTP WhatsApp. Proteger de SIM swap, cambio de número y recuperación fraudulenta.

## Chatbot oficial de Meta
- Canal: WhatsApp Business Platform Cloud API y webhook firmados; agente humano desde bandeja corporativa (integración de mensajería bidireccional pendiente).
- Inicio `Hola`: «¡Hola! Soy Celsius Garantías. ¿Qué quieres hacer? 1 Mis garantías 2 Consultar folio 3 Nueva garantía 4 Hablar con Garantías 5 Entregas».
- Si número enlazado a cuenta: **no revelar expedientes solo por reconocer el número**; pedir confirmación adicional mediante sesión corta / código o enlace seguro. Una vez verificada: «Gracias, Eduardo. Escoge tu garantía: FG-0100-26 / FG-0101-26».
- Si número no asociado: solicitar folio y **prueba de titularidad** (p. ej. email verificado o enlace firmado con caducidad). El folio no es secreto.
- Al elegir folio: 1 Estado 2 Refacciones / dictamen 3 Requisitos pendientes 4 Rastreo / recolección 5 Mensaje a un agente 0 Menú principal.
- Todas las comunicaciones se registran por caso con idempotencia, timestamps y consentimiento; escalar a un agente cuando el cliente lo solicite o el bot no resuelva.
- Mensajes salientes por cambios de estado: plantilla **aprobada** cuando corresponda; cumplir reglas de ventana de conversación, consentimiento y opt-out para comunicaciones no indispensables. Usar cola de reintentos y webhooks de entrega; copia por email (sin enviar PII innecesaria).
- Fallback: si WhatsApp falla, informar mediante email u otro método alternativo tras verificar identidad, y permitir soporte humano. Nunca dejar una cuenta bloqueada por pérdida de WhatsApp.
- Chatbot accesible desde la página de Celsius mediante botón/link `https://wa.me/<NUMERO_EMPRESA>?text=...` (solo cuando exista número empresarial oficial) y desde el portal.

## Folios
Primer folio del año 2026 `FG-0100-26`, siguiente `FG-0101-26`. Para 2027 proponer `FG-0100-27` **a confirmar**. Generación atómica por año en servidor; nunca confiar en números generados por el navegador. Reservar folio al enviar una solicitud completa; borradores usan UUID internos. Soportar más de 9999 folios sin colisiones (padding mínimo 4).

## Aprobación parcial
Un folio conserva todas las piezas, incluso rechazadas. Dictamen por pieza, solicitud de confirmación; el cliente acepta excluir rechazadas sin borrarlas, se añade evento y revisión versionada; vuelve a `final_review`. Revisión final humana antes de surtir; notificaciones WhatsApp + correo en los cambios pertinentes.

## Seguridad del webhook
Verificar firma `X-Hub-Signature-256` sobre bytes **raw** del body con `app_secret`; nunca aceptar datos de remitente aportados por el frontend; comprobar token de verificación de webhook; deduplicar `messages[].id`; limitar procesamiento y enviar respuesta rápida (200); colocar trabajo en cola; no aceptar enlaces ni archivos como confianza implícita; no registrar OTP, tokens o datos médicos/financieros.
