# Guía de inicio de Nutrevia

Esta guía inicia la versión integrada de Nutrevia en Windows con PowerShell. La app móvil usa React Native/Expo; la API usa FastAPI y PostgreSQL mediante Docker Compose. Este procedimiento es para **desarrollo local**: la API corre en el computador y el teléfono debe poder comunicarse con él.

## Requisitos

- Git, Docker Desktop con el motor Linux iniciado, y Node.js con npm.
- Un teléfono Android con el *development build* de Nutrevia instalado, o un emulador Android.
- Para teléfono físico, el teléfono y el computador deben estar en la misma red y el puerto 8000 debe ser accesible desde el teléfono.

**Expo Go no sirve para este proyecto** porque Google Sign-In usa un módulo nativo. Si se necesita un nuevo APK de desarrollo, ver el paso 5.

## 1. Descargar el proyecto

```powershell
git clone https://github.com/pabloandrestro/Nutrevia.git
cd Nutrevia
```

La rama `main` contiene el flujo integrado. Si ya se tiene una copia, revisar `git status` antes de ejecutar `git pull origin main` para no perder cambios locales.

## 2. Preparar las variables de entorno

Desde la raíz del repositorio:

```powershell
Copy-Item .env.example .env
Copy-Item mobile\.env.example mobile\.env
```

En `.env`, reemplazar `JWT_SECRET_KEY` por una clave aleatoria. Para generar una en PowerShell:

```powershell
$bytes = [byte[]]::new(32)
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
[Convert]::ToHexString($bytes).ToLowerInvariant()
```

Copiar el resultado como `JWT_SECRET_KEY=...` en `.env`. Los valores `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` y `DATABASE_URL` deben ser coherentes entre sí. Los valores del archivo de ejemplo sirven para desarrollo local.

Para Google Sign-In, colocar el **mismo ID de cliente web** en `GOOGLE_CLIENT_ID` (`.env`) y `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (`mobile/.env`). Además, el cliente OAuth Android debe estar configurado para el paquete `com.alvareznkevin.nutrevia` y la huella SHA-1 del APK instalado. Las variables `EXPO_PUBLIC_` se incorporan a la app: no guardar allí claves privadas ni tokens.

En `mobile/.env`, configurar la dirección de la API:

| Dispositivo | Valor de `EXPO_PUBLIC_API_URL` |
| --- | --- |
| Emulador Android | `http://10.0.2.2:8000` |
| Teléfono físico | `http://IP_LOCAL_DEL_COMPUTADOR:8000` |

Para el teléfono, ejecutar `ipconfig` y usar la dirección IPv4 de la interfaz Wi-Fi/Ethernet compartida; por ejemplo, `http://192.168.1.58:8000`. En el teléfono, `localhost` apunta al propio teléfono. Si cambia la red o la IP del computador, actualizar `mobile/.env` y reiniciar Expo.

Los archivos `.env` son locales y están excluidos de Git. No subirlos al repositorio.

## 3. Iniciar PostgreSQL y la API

Abrir Docker Desktop y esperar a que el motor esté listo. Desde la raíz de `Nutrevia`:

```powershell
docker compose up -d --build
docker compose exec backend alembic upgrade head
docker compose ps
```

La primera compilación puede tardar porque descarga PyTorch y modelos de visión. La base de datos debe aparecer como `healthy`. Comprobar:

- [Estado de la API](http://localhost:8000/health)
- [Documentación interactiva de la API](http://localhost:8000/docs)

## 4. Iniciar la app móvil

En otra terminal PowerShell:

```powershell
cd mobile
npm ci
npx expo start --dev-client --clear
```

Abrir el código QR con el development build instalado, o pulsar `a` para usar el emulador Android. Mantener esta terminal abierta mientras se prueba la app. Si la política de PowerShell bloquea `npx.ps1`, ejecutar `npx.cmd expo start --dev-client --clear` sin cambiar la política del sistema.

## 5. Si hace falta crear el APK de desarrollo

Se necesita acceso al proyecto Expo y a sus credenciales Android. Desde `mobile`:

```powershell
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest build --platform android --profile development
```

Instalar el APK resultante en el teléfono. El `owner` y el `projectId` de EAS están en `mobile/app.json`; otra cuenta Expo podría requerir transferir o reconfigurar el proyecto. Si cambian módulos nativos o su configuración, generar un build nuevo. Los cambios de JavaScript/TypeScript normalmente se prueban reiniciando Expo.

## Prueba rápida

1. Abrir `/health` en el computador y, si se usa teléfono físico, abrir `http://IP_LOCAL_DEL_COMPUTADOR:8000/health` en el navegador del teléfono.
2. Abrir Nutrevia desde el development build e iniciar sesión o crear una cuenta.
3. Buscar un alimento o escanear un código de barras, confirmar una porción y revisar que aparezca en el diario.
4. Registrar un peso y un dato de bienestar. Cerrar y volver a abrir la app para comprobar que persisten.
5. Revisar el resumen semanal en Progreso.

## Problemas habituales

| Síntoma | Qué revisar |
| --- | --- |
| Docker devuelve error 500 o no conecta | Esperar a que Docker Desktop termine de iniciar y volver a ejecutar `docker compose ps`. |
| Falta una tabla | Ejecutar `docker compose exec backend alembic upgrade head`. |
| La app queda cargando o muestra `Network request failed` | Revisar la IP actual en `mobile/.env`, la red, el puerto 8000 y el firewall. Probar `/health` desde el teléfono y reiniciar Expo después de cambiar `.env`. |
| `npx` no se reconoce | Instalar Node.js o añadirlo al `PATH` y abrir una terminal nueva. Si solo se bloquea `npx.ps1`, usar `npx.cmd`. |
| Google muestra `DEVELOPER_ERROR` | Revisar el ID de cliente web y la configuración OAuth Android: paquete y SHA-1 del APK instalado. |
| Cámara o Google Sign-In no funcionan en Expo Go | Instalar el development build de Nutrevia. |

Para ver errores de la API: `docker compose logs -f backend`. Para detener los contenedores conservando los datos locales: `docker compose down`. **No usar `docker compose down -v`** si se quiere conservar la base de datos.

Cuando se actualice el código, ejecutar `npm ci` en `mobile` si cambió el lockfile, `docker compose up -d --build` si cambiaron las dependencias del backend y `docker compose exec backend alembic upgrade head` si hay migraciones nuevas.

Esta guía no despliega el proyecto públicamente. Para usuarios externos se necesita alojar la API y PostgreSQL, configurar HTTPS y cambiar `EXPO_PUBLIC_API_URL` a la dirección pública.
