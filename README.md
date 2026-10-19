# Nutrevia

Aplicación móvil de registro nutricional desarrollada con React Native y Expo. La API usa FastAPI y PostgreSQL mediante Docker Compose.

**[Guía de instalación e inicio del proyecto](GUIA_INICIO.md)** — requisitos, variables de entorno, Docker, API, development build Android, prueba rápida y solución de problemas.

## Componentes

- `mobile/`: app Expo/React Native y cliente de la API.
- `backend/`: API FastAPI, modelos, persistencia y migraciones Alembic.
- `compose.yaml`: servicios locales de PostgreSQL y API.

La aplicación permite buscar alimentos, escanear códigos de barras, analizar fotografías y registrar comidas en el diario. También muestra el seguimiento del peso, registros de bienestar y un resumen semanal. La búsqueda consulta Open Food Facts a través del backend; los datos de cada usuario se guardan en PostgreSQL. El análisis fotográfico propone alimentos, pero la persona debe confirmar el resultado y la porción antes de registrarlos.

Con la API local en marcha, la referencia de rutas y esquemas está disponible en [http://localhost:8000/docs](http://localhost:8000/docs).

No subir archivos `.env`, contraseñas, claves JWT ni tokens al repositorio.
