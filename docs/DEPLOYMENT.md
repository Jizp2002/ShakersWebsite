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

## Netlify (alojamiento actual)

Sitio público: https://ccbshakerscommunity.netlify.app. En Supabase, Site URL debe ser ese dominio y Redirect URLs debe incluir `https://ccbshakerscommunity.netlify.app/entrar**`. Un dominio omitido de esa lista hace que Auth use Site URL como retorno; no dejar localhost como Site URL de producción.

1. Conecta el proyecto de Netlify a `Jizp2002/ShakersWebsite`, rama `main`.
2. `netlify.toml` fija Node 22.18.0, `npm run build` y salida `dist`.
3. La configuración pública de Supabase está en `.env.production`. No añadir contraseñas ni claves de servidor. Si existen variables en el panel de Netlify, comprobar que no estén vacías ni apunten a otro proyecto.
4. Después de verificar cambios, crear commit y ejecutar `git push origin main`.
5. Confirmar en Netlify que el despliegue de ese commit está publicado; un push correcto por sí solo no demuestra que Netlify terminó.
6. Configurar en Supabase Site URL con el dominio HTTPS real y permitir `https://DOMINIO/entrar**` en Redirect URLs. Conservar localhost para desarrollo.
7. Probar `/entrar`, una ruta directa y acceso por correo desde el dominio publicado. Si la PWA ofrece actualizar, aceptar la actualización para dejar la compilación anterior.

Las compilaciones con conexión incompleta fallan en lugar de mostrar una demo. Los datos de prueba solo se habilitan explícitamente en las pruebas locales.

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
