# Conexión del proyecto Shakers

Verificado el 1 de octubre de 2026.

## Activado

- Proyecto: `wjphfluvzsfnbjcwifgc` (`ShakerWebsite`).
- URL: `https://wjphfluvzsfnbjcwifgc.supabase.co`.
- Las cuatro migraciones de `supabase/migrations` están aplicadas en el proyecto remoto.
- Base de datos: 20 tablas públicas; las 20 tienen RLS habilitada.
- Storage: `media` público para imágenes (2 MB) y `documents` privado para PDF (10 MB), con políticas de escritura y lectura.
- Cuenta `jisaac226@gmail.com` creada, con membresía aprobada y rol `admin`. Correo verificado en Auth, comprobado el 1 de octubre de 2026.
- `.env.local` contiene la conexión real y está excluido del repositorio. El navegador solo recibe una clave pública.
- Compilación conectada disponible en `http://localhost:4173`; la vista previa ya no usa la demo.
- Site URL de Auth: `http://localhost:4173`. Redirect autorizado: `http://localhost:4173/entrar**`.
- Acceso por enlace de correo, con PKCE: abrir el enlace en el mismo navegador donde se solicitó.

## Verificaciones realizadas

Compilación de producción correcta y cuatro pruebas del SDK de autenticación con respuestas simuladas aprobadas.

Trece comprobaciones adicionales contra Supabase real pasaron: creación de eventos, privacidad de eventos, protección contra elevación de permisos, competencia simultánea por el último cupo, inscripciones sin duplicados, asistencia, privacidad de oraciones, permisos de PDF, equipos y confirmación de responsabilidades, aislamiento de notificaciones, cambio de voto sin duplicación, recursos públicos y avisos restringidos a equipos. Los usuarios, archivos y contenido temporales de estas pruebas se eliminaron.

El asesor de seguridad informa advertencias por funciones SECURITY DEFINER ejecutables (10 para anon y 24 para authenticated) y protección de contraseñas filtradas desactivada. Los permisos EXECUTE están declarados expresamente en las migraciones: auxiliares de RLS y conteos públicos para anon; operaciones con comprobaciones de identidad y rol para authenticated. Estas advertencias no equivalen a un informe sin hallazgos; deben revisarse si se añaden funciones o se habilitan contraseñas. La aplicación usa acceso sin contraseña.

## Pendiente antes de abrir al público

- Confirmar recepción del correo de prueba enviado con el SMTP de Gmail a `jisaac226@gmail.com`, y comprobar entrega a otra cuenta del piloto antes de invitar a toda la comunidad.
- Google permanece deshabilitado hasta configurar sus credenciales OAuth. La interfaz oculta ese botón.
- Turnstile pendiente de claves y configuración.
- Publicar el sitio en su dominio HTTPS y actualizar Site URL y redirects antes de enviar invitaciones públicas.
- Comprobar recuperación de respaldos en un proyecto separado.

En este proyecto se mantiene `VITE_AUTH_EMAIL_MODE=link`, y se conservan las plantillas de enlace de Supabase. Para cambiar a códigos, primero configurar SMTP y las plantillas, después usar `VITE_AUTH_EMAIL_MODE=code` y recompilar.

`supabase/setup/install.sql` reúne las cuatro migraciones para una instalación nueva. No ejecutarlo de nuevo en este proyecto.

## Mejoras previas al piloto — 1 de octubre de 2026

Aplicada remotamente `profile_photos_gallery`: fotos de perfil privadas con recorte, guardado atómico de perfil y permisos por propietario; galería por encuentro con confirmación de autorización, publicación/ocultación y eliminación. Los nuevos buckets `avatars` y `gallery` son privados, aceptan WebP hasta 2 MB y se sirven con enlaces firmados de 10 minutos. Ocultar una foto retira su acceso en la aplicación; un enlace firmado emitido antes puede conservar validez hasta su vencimiento. Los respaldos incluyen los cuatro buckets.

La portada personal prioriza encuentros con inscripción y muestra hora y lugar. La bienvenida se puede ocultar y reabrir. Los eventos permiten compartir por WhatsApp, copiar enlace o usar el menú del dispositivo, además del calendario existente. El correo de contacto publicado es `ijupiter226@gmail.com`; esto no configura SMTP.

Verificación: 22 pruebas unitarias/de permisos, pruebas de interfaz en escritorio y móvil (incluido recorte, persistencia, eliminación y galería) y cuatro pruebas del SDK con backend simulado. Comprobación remota: 20/20 tablas con RLS, buckets privados y edición de perfil denegada a anon. La prueba de carga real desde la cuenta del propietario sigue siendo parte del piloto.

Cloudflare elegido para alojamiento gratuito. La CLI requiere iniciar sesión en la cuenta del propietario antes de obtener una URL permanente. No se ha publicado el sitio.

## SMTP de Gmail

Configuración guardada por el propietario y verificada después de recargar el panel: SMTP personalizado activo, `smtp.gmail.com`, puerto 465, remitente `Shakers · Comunidad` y cuenta `ijupiter226@gmail.com`. La contraseña de aplicación se introdujo directamente en Supabase; no se copió al proyecto ni a la conversación.

Prueba desde el formulario real de Shakers: solicitud de enlace a `jisaac226@gmail.com` aceptada sin error. El destinatario debe confirmar recepción (incluido spam) y abrir el enlace en el mismo navegador. La aceptación de la solicitud no demuestra por sí sola entrega en bandeja de entrada. No se ha publicado el sitio; se mantiene la prioridad de verificar correo antes del alojamiento.
