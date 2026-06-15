# Subir el sistema a un servidor

Este proyecto ya queda preparado para servidor con Docker.

## Archivos importantes

- `Dockerfile`: construye y ejecuta el sistema.
- `data/redgps_exam.db`: base SQLite local. No se sube a Git por seguridad.
- Variable `PORT`: el servidor puede asignar el puerto automaticamente.

## Recomendado para produccion

Usar un servidor que permita Docker y volumen persistente para la carpeta:

```txt
/app/data
```

Si no se configura volumen persistente, la base de datos puede borrarse al reiniciar o actualizar el servidor.

## Comando local con Docker

```powershell
docker build -t redgps-examen .
docker run -p 8080:8080 -v ${PWD}\data:/app/data redgps-examen
```

Despues abre:

```txt
http://localhost:8080
```
