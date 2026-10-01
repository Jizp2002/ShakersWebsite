# Shakers

Website público, comunidad privada y administración para el ministerio juvenil. Interfaz en español, móvil, temas claro/oscuro y PWA instalable.

## Probar localmente

Requiere Node.js 22.18 o posterior.

    npm ci
    npm run dev

Abre http://localhost:5173. Sin variables de Supabase se presenta una **demo identificada**, con personas y actividades ficticias. En «Entrar» puedes probar joven, líder, coordinador o solicitud pendiente. Los cambios se guardan en este navegador y se pueden restablecer. No introduzcas datos personales reales en la demo.

Para probar instalación y recuperación sin conexión:

    npm run build
    npm run preview

Abre http://localhost:4173. La PWA requiere HTTPS o localhost. Solo conserva archivos de interfaz; los datos privados requieren conexión.

## Funciones implementadas

- Portada, encuentros públicos, presentación del ministerio y perfiles autorizados.
- Agenda con filtros, búsqueda, lista/calendario y descarga de archivo de calendario.
- Acceso por Google o código de correo, perfil breve y aprobación de membresía.
- Inscripciones idempotentes, cupos controlados en PostgreSQL, cancelación y asistencia.
- Equipos, responsables y confirmación de disponibilidad.
- Devocionales, videos de YouTube y PDF privados con enlaces temporales.
- Peticiones privadas o moderadas, anonimato ante otros miembros, reacciones y reportes.
- Encuestas con voto único editable y resultados agregados.
- Avisos generales/por equipo y avisos personales de cambios en encuentros y asignaciones.
- Panel de solicitudes, roles, contenido, moderación, asistencia y CSV.
- Carga optimizada de imágenes, documentos, borradores, previsualización y duplicación de eventos.
- Exportación de respaldos cifrados y guía de recuperación.

El chat, las notificaciones push, los cursos completos, los pagos, el QR y las múltiples congregaciones quedan fuera de esta primera versión.

## Conectar servicios reales

Se necesitan las cuentas del ministerio. No hay credenciales compartidas ni backend público preconfigurado.

1. Crea un proyecto Supabase Free y ejecuta en orden los SQL de supabase/migrations/. También puedes utilizar Supabase CLI después de vincular el proyecto.
2. Copia .env.example a .env.local y define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY con la URL y clave **pública** del proyecto. Nunca pongas service_role, contraseñas PostgreSQL o claves de Resend en variables VITE_.
3. Configura Google OAuth, SMTP y plantillas siguiendo [DEPLOYMENT.md](docs/DEPLOYMENT.md).
4. Crea tu cuenta, completa la solicitud y habilita al primer coordinador según la guía.
5. Reinicia Vite o recompila para producción. Las variables públicas se incorporan al compilar.

Con Supabase configurado desaparecen la demo y su selector de roles. Las operaciones usan la base real, que comienza vacía: las muestras locales nunca se suben automáticamente.

## Comandos

| Comando                | Uso                                                    |
| ---------------------- | ------------------------------------------------------ |
| npm run dev            | Desarrollo, puerto 5173                                |
| npm run build          | TypeScript y compilación de producción                 |
| npm test               | SQL/RLS, exportaciones y cifrado                       |
| npm run test:ui        | Playwright y accesibilidad                             |
| npm run test:connected | SDK real contra respuestas de Auth/PostgREST simuladas |
| npm run check          | Compilación y pruebas de lógica                        |
| npm run deploy         | Compilar y publicar con tu cuenta Cloudflare           |
| npm run backup         | Exportar y cifrar un proyecto configurado              |

Instala el navegador de pruebas con npx playwright install chromium. Compila antes de ejecutar las pruebas UI, que utilizan la demo y nunca deben apuntar a una base real.

## Organización y verificación

- src/pages: pantallas públicas, comunidad y administración.
- src/components: navegación, formularios, ventanas, PWA y avisos.
- src/lib: datos, demo, archivos y utilidades.
- supabase/migrations: tablas, permisos, RPC, auditoría y almacenamiento.
- tests: PostgreSQL/PGlite y recorridos de navegador.
- scripts: cifrado y exportación de respaldos.
- docs: despliegue y operación.

Las pruebas SQL ejecutan las migraciones reales en PostgreSQL embebido con roles anon y authenticated, y simulan las tablas de Auth/Storage. PGlite serializa transacciones: las pruebas de cupos no sustituyen una prueba multiconexión contra Supabase de preproducción.

Playwright verifica escritorio y móvil Chromium, navegación, inscripciones, oración, administración, acceso pendiente, reconexión y reglas de accesibilidad de axe. Falta la comprobación con Safari/iPhone y Android físicos antes del piloto.

Las pruebas de integración ejercitan el SDK real de Supabase con respuestas controladas, sin contactar servicios externos. Google, correo, Storage y publicación deben verificarse con las cuentas del ministerio. Ninguna prueba local envía correos ni crea cuentas externas.

Antes del lanzamiento, completa el contacto de coordinación en la página de privacidad y sustituye las fotografías ilustrativas por contenido autorizado.

Fotografías ilustrativas de Unsplash descargadas localmente: photo-1524368535928-5b5e00ddc76b (concierto), photo-1529156069898-49953e39b3ac (amistad) y photo-1504052434569-70ad5836ab65 (estudio).

Inter y Poppins se distribuyen localmente mediante Fontsource con sus licencias incluidas. No se cargan fuentes desde Google al visitar la aplicación.
