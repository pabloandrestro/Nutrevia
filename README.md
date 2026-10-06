# Nutrevia

Aplicación móvil desarrollada con React Native y Expo. El backend utiliza FastAPI y PostgreSQL mediante Docker.

## Requisitos

- Git, Docker Desktop, Node.js y npm.
- Expo Go compatible con el proyecto.
- Teléfono y computador en la misma red Wi-Fi.

## Cómo levantar el proyecto

### 1. Descargar el proyecto

```powershell
git clone URL_DEL_REPOSITORIO
cd Nutrevia
```

Si ya está descargado:

```powershell
git pull origin main
```

### 2. Crear los archivos de configuración

```powershell
Copy-Item .env.example .env
Copy-Item mobile\.env.example mobile\.env
```

El archivo `.env` configura el backend y `mobile/.env` configura la aplicación móvil. Ambos son locales y no deben subirse a GitHub.

### 3. Generar la clave privada JWT

Cada desarrollador debe generar su propia clave. Desde la carpeta `Nutrevia`, ejecutar:

```powershell
docker run --rm python:3.12-slim python -c "import secrets; print(secrets.token_hex(32))"
```

El comando mostrará una cadena aleatoria larga. Copiarla y abrir el archivo `.env`. La configuración debe quedar así:

```env
JWT_SECRET_KEY=PEGAR_AQUI_LA_CLAVE_GENERADA
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Reemplazar solamente `PEGAR_AQUI_LA_CLAVE_GENERADA`; no agregar espacios ni comillas. Por ejemplo:

```env
JWT_SECRET_KEY=9c14a8020e74461b8e588de38f423097f282cb91b09c56fe33fb37f2a5a673fa
```

La clave real se guarda únicamente en `.env`. No se coloca en `.env.example`, `compose.yaml` ni en el código fuente. Cada integrante puede utilizar una clave diferente en su entorno local.

### 4. Configurar la dirección del backend

Para utilizar un teléfono físico, ejecutar `ipconfig`, buscar la dirección IPv4 del Wi-Fi y escribirla en `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://TU_IP:8000
```

Ejemplo: `EXPO_PUBLIC_API_URL=http://192.168.1.58:8000`.

Para un emulador Android, utilizar `http://10.0.2.2:8000`.

### 5. Levantar PostgreSQL y el backend

Abrir Docker Desktop y ejecutar desde la carpeta `Nutrevia`:

```powershell
docker compose up -d --build
docker compose exec backend alembic upgrade head
docker compose ps
```

La base de datos debe aparecer como `healthy`. La API se puede revisar en:

- http://localhost:8000/health
- http://localhost:8000/docs

### 6. Levantar la aplicación móvil

```powershell
cd mobile
npm ci
npx tsc --noEmit
npx expo start --clear
```

Abrir el código QR con el development client de Nutrevia.

## Prueba rápida

1. Registrar una cuenta e iniciar sesión.
2. Completar el perfil y seleccionar el objetivo.
3. Revisar los datos en Inicio, Diario y Perfil.
4. Tomar una fotografía y comprobar que el backend la recibe.
5. Cerrar y abrir la aplicación para verificar que la sesión se conserva.
6. Buscar un alimento por nombre, registrar una porción y comprobar que aparece
   en el diario después de reiniciar la aplicación.
7. Registrar otra comida con código de barras o fotografía y comprobar que los
   totales del día se actualizan.

## Problemas frecuentes

- **`Network request failed`:** revisar la IP, la conexión Wi-Fi y el firewall.
- **Expo no muestra los cambios:** ejecutar nuevamente `npx expo start --clear`.
- **Faltan tablas:** ejecutar `docker compose exec backend alembic upgrade head`.
- **Cambió `requirements.txt`:** ejecutar `docker compose up -d --build`.

## Detección inicial de alimentos

El endpoint `POST /food-images/analyze` utiliza YOLO-World para buscar una
lista inicial de alimentos: arroz, fideos, pollo, papa, tomate y huevo. En la primera
ejecución el backend puede tardar mientras descarga los pesos del modelo y el
codificador de texto CLIP. La caché queda guardada en un volumen de Docker. La
respuesta entrega el nombre del alimento, nivel de confianza y coordenadas de
su ubicación en la fotografía.

Se utilizan distintas descripciones visuales para arroz, fideos, pollo y huevo.
Cuando más de una descripción detecta el mismo alimento, la API conserva solo
el resultado con mayor confianza para evitar duplicados.

Esta primera versión detecta alimentos, pero todavía no calcula gramos ni
calorías automáticamente. La persona debe confirmar el resultado y la porción
antes de incorporarlo al diario.

## Búsqueda y diario nutricional

La aplicación consulta `GET /foods/search?q=...` para buscar productos de
Open Food Facts mediante el backend. El código de barras sigue usando
`GET /foods/barcode/{code}`. Para registrar una comida, la app envía la fecha,
el tipo, la fuente y las porciones a `POST /meals`. El backend calcula los
totales y los guarda por usuario en PostgreSQL.

`GET /meals/summary?date=AAAA-MM-DD` devuelve las comidas y el resumen del
día. `DELETE /meals/{id}` elimina una comida del usuario autenticado. Tras
actualizar esta rama, ejecutar `docker compose exec backend alembic upgrade head`
para crear la tabla `meal_entries`.

## Seguimiento del bienestar

En Progreso se puede registrar sueño, estrés y fatiga. La app consulta
`GET /wellbeing` y envía el registro del día a `POST /wellbeing`; si ya existe
uno para ese usuario y fecha, el backend lo actualiza. Cada usuario ve solo
sus propios registros en PostgreSQL. También está disponible
`DELETE /wellbeing/{id}` para eliminar un registro propio.

Después de actualizar el backend, ejecutar
`docker compose exec backend alembic upgrade head` para crear la tabla
`wellbeing_entries`. Para verificarlo, guardar un registro, cerrar y volver a
abrir la app y comprobar que los valores siguen apareciendo en Progreso.

## Importante

No subir a GitHub los archivos `.env`, contraseñas, claves JWT ni tokens.
