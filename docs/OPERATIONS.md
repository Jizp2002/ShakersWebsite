# Operación de Shakers

## Rutina

**Antes de cada encuentro:** revisa inscritos, responsabilidades, ubicación y horario. Los cambios relevantes generan avisos personales a quienes se inscribieron.

**En el encuentro:** Administración → Asistencia permite marcar presentes y exportar CSV. Solo el responsable y coordinación tienen acceso a sus asistentes.

**Durante la semana:** revisa solicitudes, oración compartida y reportes; publica un recurso y una encuesta breve. La oración privada solo es visible para su autor y coordinación.

**Cada mes:** revisa cuotas de almacenamiento/correo y actividad de Supabase. El plan gratuito puede pausarse por inactividad. Un backend configurado que falla produce un error recuperable, nunca datos demo.

## Permisos

| Acción                         | Miembro | Líder     | Coordinación |
| ------------------------------ | ------- | --------- | ------------ |
| Participar y editar su perfil  | Sí      | Sí        | Sí           |
| Gestionar encuentros           | No      | Asignados | Todos        |
| Gestionar equipos              | No      | Asignados | Todos        |
| Aprobar solicitudes pendientes | No      | Sí        | Sí           |
| Cambiar roles o suspender      | No      | No        | Sí           |
| Moderar oración compartida     | No      | Sí        | Sí           |
| Leer oración privada ajena     | No      | No        | Sí           |
| Publicar perfiles de líderes   | No      | No        | Sí           |
| Ver auditoría administrativa   | No      | No        | Sí           |

Los líderes consultan perfiles para organizar el ministerio, pero no asistencias de eventos ajenos. Una cuenta suspendida conserva su pantalla de estado y pierde acceso a la comunidad.

## Respaldo cifrado

Requiere pg_dump compatible con la versión del servidor, tar, Node.js y acceso al proyecto.

Configura mediante un gestor de secretos o sesión privada:

- DATABASE_URL: conexión PostgreSQL para respaldo.
- SUPABASE_URL: URL del proyecto.
- SUPABASE_SERVICE_ROLE_KEY: clave de servidor, solo para el script.
- BACKUP_PASSPHRASE: frase fuerte de al menos 16 caracteres, guardada separadamente.

Ejecuta:

    npm run backup

El script solo lee: exporta el esquema public, datos de auth.users/auth.identities y archivos de media/documents. Genera un archivo .enc en backups/, cifrado con AES-256-GCM y derivación scrypt. El directorio temporal es privado y se elimina al terminar.

Hazlo semanalmente y antes de cambios de estructura. Evita altas, bajas y edición durante la exportación para conservar coherencia entre datos y archivos. Guarda dos copias cifradas separadas y conserva la frase aparte. Nunca subas respaldos sin cifrar a Git.

No incluye sesiones, secretos OAuth/SMTP ni configuración del proyecto. Conserva esas configuraciones en el gestor de acceso del ministerio.

## Ensayo de recuperación

Siempre en un proyecto separado, nunca sobre producción.

1. Define BACKUP_PASSPHRASE y descifra a un archivo nuevo:

       node scripts/decrypt-backup.mjs backups/respaldo.enc /ruta/segura/restauracion.tar

2. Extrae en una carpeta restringida y revisa manifest.json.
3. Crea el proyecto de prueba con PostgreSQL compatible y aplica las mismas migraciones.
4. Revisa los inventarios con pg_restore --list. Restaura usuarios e identidades conservando sus UUID; después datos públicos en orden de dependencias. Evita disparar triggers de aplicación durante la carga para no duplicar perfiles o avisos. La restauración de Auth requiere adaptar el proceso a la versión del proyecto destino.
5. Sube los archivos a los mismos buckets y rutas. Las referencias storage://documents/ seguirán válidas. Sustituye el prefijo de URLs de imágenes del proyecto anterior por el del nuevo proyecto.
6. Rehabilita cualquier trigger deshabilitado. Revisa cantidades, miembros, eventos, PDF, RLS y un registro nuevo con cada rol.
7. Registra fecha y resultado. Elimina las copias descifradas después del ensayo.

Descifrar no escribe a ninguna base. Las pruebas locales verifican integridad del cifrado y rechazo de claves incorrectas. La recuperación completa de Supabase debe ensayarse con credenciales y versiones reales antes del piloto.

## Actualizaciones y datos

- Ejecuta npm run check y npm run test:ui antes de publicar.
- Prueba cambios en un entorno separado y aplica nuevas migraciones en orden.
- La PWA avisa de actualizaciones y permite activarlas; no recarga formularios por sí sola al detectar una versión.
- Al perder conexión oculta los datos y bloquea escrituras. Al recuperarla recarga para renovar el estado.
- La primera versión no elimina historiales automáticamente. Revisa datos antiguos y solicitudes de corrección/eliminación desde coordinación.
- Reasigna eventos y equipos antes de eliminar un responsable.
- Los respaldos cifrados contienen datos personales: define su retención y quién puede acceder.
