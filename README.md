# RedGPS Evaluador Tecnico

Sistema web para crear evaluaciones tecnicas, compartir enlaces con candidatos, guardar respuestas en SQLite y revisar/calificar examenes desde el panel del entrevistador.

## Formas de iniciar el sistema

### Opcion recomendada: Docker

Requisitos:

- Docker Desktop instalado.
- Docker Desktop abierto y corriendo.

Comandos:

```powershell
cd C:\Users\Lap145\Desktop\proyecto
docker compose up -d
```

Abrir en Chrome:

```text
http://localhost:8080
```

Para reconstruir despues de cambios en codigo:

```powershell
docker compose up --build -d
```

Para cerrar:

```powershell
docker compose down
```

La base de datos se guarda fuera del contenedor en:

```text
data\redgps_exam.db
```

Esto evita que se pierdan resultados cuando se apaga o recrea el contenedor.

### Opcion local sin Docker

1. Da doble clic en `iniciar-sistema.bat`.
2. Abre Chrome en:

```text
http://localhost:8080
```

No cierres la ventana negra mientras estes usando el sistema.

## Cerrar el sistema local sin Docker

Puedes cerrar la ventana negra del servidor o ejecutar:

```powershell
Get-Process -Name RedGpsExam,dotnet -ErrorAction SilentlyContinue | Stop-Process -Force
```

## Usuarios autorizados

Los usuarios autorizados se guardan en SQLite, en la tabla:

```text
usuarios_entrevistadores
```

Tambien puedes verlos desde la vista:

```text
vista_usuarios_entrevistadores
```

Usuarios iniciales:

- `ariel@redgps.com` / `12345`
- `hector@redgps.com` / `12345`
- `ilian@redgps.com` / `12345`
- `alejandro@redgps.com` / `12345`
- `juan@redgps.com` / `12345`
- `arielsadoth@gmail.com` / `12345`

Para agregar un usuario desde SQLite:

```sql
INSERT INTO usuarios_entrevistadores (correo, contrasena, activo, creado_en)
VALUES ('nuevo@redgps.com', '12345', 1, datetime('now'));
```

La contrasena se puede escribir normal al crear el usuario. Cuando el sistema inicia o cuando ese usuario inicia sesion por primera vez, la contrasena se convierte automaticamente a un hash protegido. En la vista `vista_usuarios_entrevistadores` ya no se muestra la contrasena real.

Para quitar acceso sin borrar el registro:

```sql
UPDATE usuarios_entrevistadores
SET activo = 0
WHERE correo = 'nuevo@redgps.com';
```

Para volver a activar un usuario:

```sql
UPDATE usuarios_entrevistadores
SET activo = 1
WHERE correo = 'nuevo@redgps.com';
```

Para cambiar contrasena:

```sql
UPDATE usuarios_entrevistadores
SET contrasena = 'nueva123'
WHERE correo = 'nuevo@redgps.com';
```

Despues de cambiarla, reinicia el sistema o inicia sesion con ese usuario para que se vuelva a proteger automaticamente.

## Crear un examen

1. Inicia sesion como entrevistador.
2. Entra a `Crear examen`.
3. Escribe el nombre del examen.
4. Selecciona la cantidad de preguntas, de 1 a 20.
5. Selecciona el tiempo.
6. Marca o desmarca las preguntas que quieres usar.
7. Da clic en `Generar examen aleatorio`.
8. Copia el enlace generado.
9. Envia el enlace al candidato por WhatsApp o correo.

## Candidato

El candidato abre el enlace del examen. El sistema le pide:

- Nombre.
- Correo.

Despues responde las preguntas y da clic en `Finalizar examen`.

Nota de seguridad: si el candidato cambia de pestana, minimiza o sale de la pagina, el examen se finaliza automaticamente con lo que tenga respondido.

## Revisar respuestas

1. Entra a `Respuestas`.
2. Usa el buscador para encontrar al candidato.
3. Da clic en `Ver`.
4. Se abre una ventana con solo el examen seleccionado.
5. Revisa respuestas, calificacion y notas.
6. Ajusta calificacion final o puntaje por pregunta si hace falta.
7. Da clic en `Guardar ajuste`.
8. Para salir, da clic en `Cerrar`.

## Preguntas practicas de codigo

Las preguntas practicas muestran:

- Lenguaje esperado.
- Funcion esperada.
- Boton `Ejecutar pruebas`.

El candidato puede ejecutar pruebas mientras responde. El entrevistador tambien puede ejecutar pruebas al revisar la respuesta guardada.

## Cambiar preguntas desde SQLite

Las preguntas se guardan en SQLite, en la tabla:

```text
banco_preguntas
```

Tambien puedes revisarlas desde la vista:

```text
vista_banco_preguntas
```

Tipos de pregunta:

- `closed`: opcion multiple.
- `open`: pregunta abierta.
- `code`: problema practico de programacion.

Para ocultar una pregunta sin borrarla:

```sql
UPDATE banco_preguntas
SET activo = 0
WHERE id = 'soft-html';
```

Para volver a mostrarla:

```sql
UPDATE banco_preguntas
SET activo = 1
WHERE id = 'soft-html';
```

Para cambiar el texto de una pregunta:

```sql
UPDATE banco_preguntas
SET pregunta = 'Nuevo texto de la pregunta'
WHERE id = 'soft-html';
```

Ejemplo para agregar pregunta de opcion multiple:

```sql
INSERT INTO banco_preguntas
    (id, area, tipo, titulo, pregunta, puntos, opciones_json, respuesta_correcta, respuesta_esperada, palabras_clave_json, runner_json, activo, creado_en)
VALUES
    (
        'soft-nueva-opcion',
        'Desarrollo de Software',
        'closed',
        'Pregunta nueva',
        'Cual opcion es correcta?',
        20,
        '[{"key":"A","text":"Opcion A"},{"key":"B","text":"Opcion B"}]',
        'A',
        'Opcion A',
        '[]',
        '',
        1,
        datetime('now')
    );
```

Ejemplo para agregar pregunta abierta:

```sql
INSERT INTO banco_preguntas
    (id, area, tipo, titulo, pregunta, puntos, opciones_json, respuesta_correcta, respuesta_esperada, palabras_clave_json, runner_json, activo, creado_en)
VALUES
    (
        'soft-nueva-abierta',
        'Desarrollo de Software',
        'open',
        'Pregunta abierta nueva',
        'Explica que es una API REST.',
        20,
        '[]',
        '',
        'Una API REST permite comunicar sistemas usando HTTP y recursos.',
        '["api","rest","http","comunicar","sistemas","recursos"]',
        '',
        1,
        datetime('now')
    );
```

Ejemplo para agregar problema de codigo:

```sql
INSERT INTO banco_preguntas
    (id, area, tipo, titulo, pregunta, puntos, opciones_json, respuesta_correcta, respuesta_esperada, palabras_clave_json, runner_json, activo, creado_en)
VALUES
    (
        'soft-code-suma',
        'Desarrollo de Software',
        'code',
        'Problema practico: suma',
        'Escriba una funcion llamada sumar(a, b) que regrese la suma de dos numeros.',
        20,
        '[]',
        '',
        'Crear una funcion que reciba dos numeros y regrese su suma.',
        '["function","return","sumar","a","b"]',
        '{"functionName":"sumar","language":"JavaScript","tests":[{"name":"suma positiva","args":[2,3],"expected":5},{"name":"suma con cero","args":[7,0],"expected":7}]}',
        1,
        datetime('now')
    );
```

Despues de cambiar preguntas desde SQLiteStudio, guarda los cambios y recarga la pagina del sistema.

Si usas Docker:

```powershell
docker compose up --build -d
```

## Base de datos

La base real esta en:

```text
data\redgps_exam.db
```

No abras ese archivo con Bloc de notas, Adobe, Photoshop o Illustrator. Es una base SQLite.

Para abrirla:

```text
abrir-sqlite.bat
```

Tablas importantes:

- `resultados_examenes`: examenes finalizados.
- `respuestas_examenes`: respuestas por pregunta.
- `examenes_creados`: enlaces generados.

## Exportar resultados

Ejecuta:

```text
export-database.ps1
```

Esto genera archivos CSV dentro de `data\`.

## Pasar el proyecto a otra computadora

1. Copia toda la carpeta del proyecto.
2. Pegala en la otra computadora.
3. Instala Docker Desktop.
4. Abre Docker Desktop.
5. En PowerShell, entra a la carpeta del proyecto.
6. Ejecuta:

```powershell
docker compose up --build -d
```

7. Abre:

```text
http://localhost:8080
```

La base de datos viaja dentro de `data\redgps_exam.db`.

## Abrir desde telefono en la misma red

1. La computadora y el telefono deben estar en el mismo Wi-Fi.
2. Ejecuta una vez `permitir-red-local.bat`.
3. Busca la IP de la computadora.
4. En el telefono abre:

```text
http://IP-DE-LA-COMPUTADORA:8080
```

Ejemplo:

```text
http://192.168.5.64:8080
```

## Archivos importantes

- `Api.cs`: backend, usuarios y preguntas.
- `index.html`: estructura del sitio.
- `app.js`: logica del sitio.
- `styles.css`: diseno.
- `Dockerfile`: instrucciones para construir la imagen Docker.
- `docker-compose.yml`: configuracion para iniciar el contenedor.
- `data\redgps_exam.db`: base de datos SQLite.
- `assets\`: logos e iconos.
