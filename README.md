# repo prueba analisis. 
Repositorio para uso de pruebas y avances para analisis y diseño de software

# INF236-CSJ-22026-11

Este es el repositorio del grupo 11, cuyos integrantes son:

* Ahmaru Huidobro Garcia - 202330540-5
* Jorge Padilla Roco - 202330547-2
* Damián Rios Marquez - 202473604-3
* Vicente Morales Galdames - 202411543-k
* *Ayudante*: Matias Barrera

# Wiki (Caso: DEFIDER)
Puede acceder a la Wiki mediante el enlace siguiente
[enlace](https://gitlab.inf.utfsm.cl/inf236-2026-2/inf236-csj-22026-11/-/wikis/home)

# Video prototipo Hito 3

El link para acceder al video realizado es el siguiente:

https://youtu.be/Kz91q9Deg4k

# Pasos para levantar el proyecto:

## Software necesario y sus versiones

*Para este caso hicimos el levantamiento inicial en una maquina Linux con OS Fedora 43*
Aunque los pasos se pueden replicar para otros sistemas operativos basados en Linux o windows, con su debido cambio

**Versiones de software usado**
* Docker version 29.6.2 build 1.fc43
* Docker Compose version 5.3.1
* Git 2.55.0
* node v24.20.0
* npm version 11.19.0

### Comandos Utilizados en orden para levantar el proyecto:

##### Pasos para instalar git
```bash
$ sudo dnf install git
```

##### Pasos para instalar docker y docker compose
```bash
$ sudo dnf install docker-cli <opcional> -> containerd
$ sudo dnf install docker-compose
```

##### Pasos para instalar node.js
```bash
$ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash
```
```bash
# en lugar de reiniciar la shell:
$ \. "$HOME/.nvm/nvm.sh"
```
```bash
# Descarga e instala Node.js:
$ nvm install 24
```
```bash
# Verifica la versión de Node.js y npm:
$ node -v
$ npm -v
```
##### Pasos para obtener el proyecto base y levantarlo
```bash
$ git clone https://gitlab.inf.utfsm.cl/inf236-2026-2/inf236-csj-22026-11.git
$ cd inf236-csj-22026-11/defider_reserva_v1
$ sudo docker compose up --build
```

Luego de terminar, para limpiar usamos para apagar el contenedor:
```bash
$ sudo docker compose down
```

Si necesitas reiniciar la base de datos para que se vuelvan a ejecutar los scripts de `sql/`:
```bash
$ sudo docker compose down -v
$ sudo docker compose up --build
```

## Usuarios demo

La autenticación es una simulación para el prototipo. El rol se obtiene del correo demo ingresado; si el correo no existe, se usa el tipo de usuario seleccionado en el login.

| Correo | Rol | Uso |
|---|---|---|
| `juan.perez@usm.cl` | consumidor | Consultar disponibilidad y reservar |
| `maria.privilegiada@usm.cl` | privilegiado | Reservas de actividad extracurricular |
| `fiscalizador@usm.cl` | fiscalizador | Reservado para HU de fiscalización |
| `admin@usm.cl` | administrador | Inscripciones calendarizadas y revisión de reservas |

## Servicios implementados

| ID | Servicio | Método y ruta | HU |
|---|---|---|---|
| S-01 | Iniciar sesión y consultar situación del usuario | `POST /api/sesiones` | HU-01, HU-02, HU-04, HU-10 |
| S-02 | Consultar disponibilidad | `GET /api/disponibilidad` | HU-01 |
| S-03 | Consultar detalle de un recurso | `GET /api/recursos/:id` | HU-01, HU-02 |
| S-04 | Registrar reserva individual | `POST /api/reservas` | HU-02 |
| S-05 | Registrar inscripción calendarizada | `POST /api/inscripciones-calendarizadas` | HU-10 |
| S-06 | Listar reservas propias | `GET /api/reservas` | HU-04 |
| S-07 | Cancelar una reserva propia | `PATCH /api/reservas/:id/cancelar` | HU-04 |
| S-08 | Consultar catálogo de recursos y bloques | `GET /api/catalogo` | HU-10 |

Los servicios protegidos reciben el header `X-Usuario-Id` con el identificador del usuario demo. El frontend lo agrega automáticamente después del login.

## Flujo de prueba

1. Ingresar con `juan.perez@usm.cl` y tipo de usuario “Estudiante”.
2. Filtrar disponibilidad por fecha, sede, recurso y bloque.
3. Seleccionar una cancha o material y confirmar la reserva.
4. Ir a “Mis reservas” desde la barra superior.
5. Cancelar una reserva confirmada y verificar que el bloque vuelve a aparecer disponible.
6. Ingresar con `admin@usm.cl` y tipo “Administrador” para registrar una inscripción calendarizada.

**Comandos utiles docker**  
Levantar el proyecto sin volver a construir las imágenes:
```bash
docker compose up
```
Levantar el proyecto en segundo plano:
```bash
docker compose up -d
```
Ver el estado de los servicios que están corriendo:
```bash
docker compose ps
```
Ver los logs en tiempo real de todos los servicios:
```bash
docker compose logs -f
```
O de un servicio específico:
```bash
docker compose logs -f nombre_servicio
```
Reiniciar un servicio específico:
```bash
docker compose restart nombre_servicio
```
Detener todos los contenedores sin eliminar volúmenes:
```bash
docker compose down
```
