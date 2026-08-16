# Notas operativas

## Crear usuarios demo por SQL directo (sin pasar por el signup normal)

Insertar directo en `auth.users` para armar un usuario de prueba (patrón
`cliente-bike`, `cliente-superelectro`, etc.) requiere setear explícito
en `''` (string vacío), **no dejar en NULL**, estas columnas de texto:

- `confirmation_token`
- `recovery_token`
- `email_change_token_new`
- `email_change`

Si alguna queda en `NULL`, el login del usuario falla con `500
"Database error querying schema"` desde `auth/v1/token` — no es un
error de credenciales, GoTrue espera string vacío en esas columnas, no
NULL, y truena al escanear la fila. El resto de las columnas de texto de
`auth.users` (`phone_change`, `phone_change_token`,
`reauthentication_token`, `email_change_token_current`, etc.) ya tienen
default `''` en el esquema, pero estas cuatro no — hay que setearlas a
mano en el INSERT.

Además del insert en `auth.users`, hace falta la fila correspondiente en
`auth.identities` (provider `email`, `identity_data` con `sub`/`email`/
`email_verified`/`phone_verified`) — sin ella el login también falla.
Un insert en `auth.users` sin la fila en `auth.identities` no alcanza,
aunque el trigger `handle_new_user` sí cree la fila en `public.profiles`
automáticamente.

**Verificación rápida después de crear un usuario así:** probar el login
contra la API directo (`POST /auth/v1/token?grant_type=password` con el
`apikey` publishable) antes de darlo por terminado — un 200 con
`access_token` confirma que la fila quedó bien armada. Si algo falla, el
`error_id` del body de la respuesta 500 no dice mucho; conviene comparar
columna por columna contra un usuario que ya loguea bien (ej.
`cliente-bike@gmail.com`) para encontrar la diferencia.
