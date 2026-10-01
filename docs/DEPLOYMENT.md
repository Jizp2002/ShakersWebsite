# Activación del ministerio

## Supabase

El proyecto ShakerWebsite ya está conectado: consulta `docs/CONNECTION-STATUS.md`. Los pasos de instalación siguientes son para un proyecto nuevo; no repitas las migraciones en el proyecto actual.

Para una instalación nueva, ejecuta estos archivos en el SQL Editor, en este orden:

1. supabase/migrations/202609220001_community.sql
2. supabase/migrations/202609220002_storage.sql
3. supabase/migrations/202609220003_notifications.sql
4. supabase/migrations/20261001183459_profile_photos_gallery.sql

Son migraciones para un proyecto nuevo, no scripts para repetir. Crean perfiles cuando se registra cada cuenta. Si ya existían usuarios antes de aplicarlas, inserta sus perfiles faltantes desde SQL antes de usarlos.

El navegador usa la clave pública. RLS y las funciones SQL consultan la membresía actual en cada operación. No hay contraseña administrativa dentro del código.

## Google

En Google Cloud Console configura un cliente OAuth web para el ministerio:

- Añade el dominio final y localhost como orígenes autorizados.
- Usa el callback que muestra Supabase en Authentication → Providers → Google.
- Introduce el identificador y secreto en Supabase, nunca en Vite.
- Configura consentimiento y usuarios de prueba mientras la aplicación esté en pruebas.

En Supabase Authentication → URL Configuration:

- Site URL: la dirección HTTPS definitiva.
- Redirect URLs: permite /entrar con parámetros únicamente en tus dominios autorizados; por ejemplo, https://tu-dominio.example/entrar**.
- Desarrollo: http://localhost:5173/entrar** y http://localhost:4173/entrar**.

Activa `VITE_GOOGLE_AUTH_ENABLED=true` y recompila cuando el proveedor esté configurado. Prueba cuenta nueva y existente. El retorno debe llevar a la solicitud pendiente o a la pantalla original si ya está aprobada.

## Correo de acceso

La configuración actual utiliza `VITE_AUTH_EMAIL_MODE=link` y las plantillas predeterminadas. El enlace debe abrirse en el mismo navegador que inició la solicitud, porque el acceso utiliza PKCE. Para producción configura SMTP propio y verifica la entrega a cuentas externas.

Para cambiar a códigos de correo:

1. Verifica un dominio propio en Resend con los registros DNS indicados.
2. Configura SMTP de Resend en Supabase Authentication → Email.
3. Copia supabase/templates/code.html a las plantillas Confirm signup y Magic Link.
4. Conserva {{ .Token }} y configura `VITE_AUTH_EMAIL_MODE=code`. Recompila después de cambiar esta variable.
5. Configura 6 dígitos y vencimiento de 600 segundos.
6. Habilita confirmación de correo. Prueba alta, acceso, códigos incorrectos/vencidos y reenvío.
7. Habilita Cloudflare Turnstile en Supabase Auth y VITE_TURNSTILE_SITE_KEY para evitar consumo abusivo del cupo.

El SMTP integrado de Supabase está limitado a pruebas. El panel actual requiere SMTP propio para personalizar las plantillas en este plan. Revisa las cuotas y condiciones vigentes del proveedor elegido antes de invitar a la comunidad.

## Primer coordinador

En el proyecto actual, `jisaac226@gmail.com` ya tiene membresía aprobada y rol administrador; su correo ya está verificado.

En una instalación nueva, crea tu cuenta desde la interfaz y completa la solicitud. Desde el SQL Editor, reemplaza el correo de este ejemplo por el tuyo:

    update public.memberships
    set role = 'admin', status = 'approved'
    where id = (
      select id from auth.users where email = 'coordinador@tu-dominio.example'
    );

Vuelve a abrir la aplicación. Los siguientes permisos se gestionan desde Administración → Miembros. No puedes cambiar tus propios permisos desde el panel.

Los miembros de 13–17 años requieren confirmación de su responsable y no pueden recibir permisos de liderazgo.

## Cloudflare

La aplicación utiliza Workers Static Assets; los datos permanecen en Supabase. No requiere un servidor Node permanente.

1. Autentica Wrangler con la cuenta del ministerio.
2. Configura .env.local con las variables públicas reales.
3. Ejecuta npm run deploy. Compila dist y publica usando wrangler.jsonc.
4. Asocia tu dominio y comprueba HTTPS.
5. Actualiza Site URL, redirects y orígenes OAuth.
6. Recarga una ruta directa como /app/agenda para verificar el fallback SPA.

Guarda credenciales de publicación en secretos del proveedor. No agregues tokens de Cloudflare, claves SMTP o service_role al repositorio.

## Contenido y piloto

Publica perfiles autorizados, un evento con ubicación y horario reales, un recurso, un aviso y una encuesta. Configura los equipos y las responsabilidades. Completa el contacto de coordinación en la página de privacidad.

Piloto: 10–15 jóvenes durante dos semanas. Comprueba que encuentran el evento, se inscriben y entienden su equipo sin ayuda. Recoge incidencias antes de incorporar al resto.

## Verificación externa antes del piloto

- Google y correo reales en teléfonos de prueba.
- Permisos de Storage y caducidad de PDF.
- Dos usuarios intentando obtener el último cupo desde sesiones separadas.
- Instalación y actualización PWA en Safari/iPhone y Chrome/Android.
- Respaldo y recuperación en un proyecto separado con las versiones de producción.

La demo y las pruebas locales no sustituyen estas verificaciones de integración.
