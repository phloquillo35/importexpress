# ImportExpress — Lo Pedís, Lo Tenes

Sistema de gestión de stock, catálogo público y panel administrador para negocios de importación.

**URL:** https://importexpress-production.up.railway.app/

---

## Requisitos técnicos

- Node.js 20+
- npm

## Comandos rápidos

```bash
npm install              # Instalar dependencias
npx prisma generate      # Generar Prisma Client
npx prisma migrate deploy # Aplicar migraciones
npx prisma db seed       # Sembrar datos iniciales
npm run dev              # Iniciar en localhost:3000
npm run build            # Build de producción
```

**Admin por defecto:** Ingresar a `/login` con las credenciales creadas en el seed.

---

# Manual de Uso — ImportExpress

## Índice

1. [Introducción](#1-introducción)
2. [Primeros pasos — Login](#2-primeros-pasos--login)
3. [Catálogo público (vista clientes)](#3-catálogo-público-vista-clientes)
4. [Panel de administración](#4-panel-de-administración)
5. [Productos](#5-productos)
6. [Categorías y Subcategorías](#6-categorías-y-subcategorías)
7. [Pedidos](#7-pedidos)
8. [Stock](#8-stock)
9. [Importación](#9-importación)
10. [Bultos y Tracking](#10-bultos-y-tracking)
11. [Distribuidores](#11-distribuidores)
12. [Finanzas / Transacciones](#12-finanzas--transacciones)
13. [Configuración](#13-configuración)
14. [Reportes](#14-reportes)
15. [Miembros y Roles](#15-miembros-y-roles)
16. [Solución de problemas comunes](#16-solución-de-problemas-comunes)

---

## 1. Introducción

ImportExpress es un sistema web que te permite:

- Mostrar tu catálogo de productos al público (sin que nadie necesite registrarse).
- Administrar tu stock, precios y productos desde un panel privado.
- Hacer seguimiento de pedidos y envíos con notificaciones automáticas a tus clientes.
- Gestionar importaciones, distribuidores y finanzas.
- Invitar a colaboradores con distintos niveles de acceso.

El sistema está dividido en **dos caras**:

- La **vista pública** (catalogo): la ve cualquier persona que visite la página.
- El **panel administrador**: solo lo ven las personas que tienen usuario y contraseña.

---

## 2. Primeros pasos — Login

1. Andá a la URL del sistema.
2. Hacé clic en **"Iniciar Sesión"** (está en la esquina superior derecha o en /login).
3. Ingresá tu **email** y **contraseña** que te fueron proporcionados.
4. Si es tu primera vez, usá las credenciales que te enviaron por email al crearte como miembro.
5. Una vez dentro, ves el **panel de administración** con todas las secciones.

> **Importante:** La sesión se cierra automáticamente después de 15 minutos de inactividad por seguridad. Si ves un cartel de "Sesión expirada", ingresá de nuevo.

---

## 3. Catálogo público (vista clientes)

Cualquier persona que visite la página sin loguearse ve:

### 3.1 Página principal (Home)
- Muestra un **carrusel** con imágenes destacadas (lo configurás desde el panel de admin).
- Listado de productos destacados o recién llegados.

### 3.2 Productos
- Todos los productos que cargaste aparecen aquí.
- Se puede **filtrar por categoría**.
- Al hacer clic en un producto, se ve el **detalle completo**: nombre, descripción, precio, imágenes, variantes (colores).

### 3.3 Categorías
- Listado de categorías disponibles.
- Al hacer clic, se muestran solo los productos de esa categoría (incluye subcategorías).

### 3.4 Cómo funciona
- Una página explicativa de cómo trabajás (pedidos, envíos, formas de pago).

### 3.5 Contacto
- Información de contacto (WhatsApp, Instagram, email) que configurás desde el panel.

---

## 4. Panel de administración

Después de iniciar sesión, ves un **panel dividido** con un menú lateral (sidebar) y el contenido principal.

### Sidebar (menú lateral)
Las secciones disponibles son:

| Sección | Qué hace |
|---------|----------|
| Dashboard | Resumen general con estadísticas y gráficos |
| Productos | Gestionar productos del catálogo |
| Categorías | Crear y editar categorías y subcategorías |
| Pedidos | Ver y gestionar pedidos de clientes |
| Stock | Control de inventario |
| Importación | Registrar importaciones de mercadería |
| Bultos | Gestionar envíos y tracking |
| Distribuidores | Registrar distribuidores |
| Finanzas | Transacciones y movimientos de dinero |
| Reportes | Enviar reportes por email |
| Miembros | Invitar y gestionar usuarios del sistema |
| Configuración | Ajustes del sistema (WhatsApp, Instagram, SMTP) |

---

## 5. Productos

### 5.1 Ver productos
Andá a **Productos** en el menú. Ves una tabla con todos los productos cargados.

### 5.2 Crear un producto
1. Hacé clic en **"Nuevo producto"**.
2. Completá los campos:
   - **Nombre**: el nombre del producto.
   - **Slug**: identificador único para la URL (se genera solo, pero lo podés editar).
   - **Descripción**: texto que describe el producto.
   - **Precio USD**: precio en dólares.
   - **Precio ARS**: precio en pesos argentinos.
   - **Categoría**: seleccioná a qué categoría pertenece.
   - **Stock disponible**: cantidad en inventario.
   - **Imágenes**: subí una o más fotos.
   - **Colores/Variantes**: si el producto viene en varios colores, los podés agregar.
3. Guardá el producto.

### 5.3 Editar un producto
Hacé clic en el **ícono de editar** (lápiz) al lado del producto, modificá los campos y guardá.

### 5.4 Eliminar un producto
Hacé clic en el **ícono de eliminar** (basurero). Confirmá la acción.

---

## 6. Categorías y Subcategorías

### 6.1 Crear una categoría
1. Andá a **Categorías**.
2. Hacé clic en **"Nueva categoría"**.
3. Poné un **nombre** (ej: "Electrónica", "Ropa", "Hogar").
4. Guardá.

### 6.2 Crear una subcategoría
1. Dentro de una categoría, hacé clic en **"Agregar subcategoría"**.
2. Ingresá el nombre (ej: dentro de "Ropa" podés tener "Remeras", "Pantalones", "Zapatos").
3. Guardá.

### 6.3 Asignar subcategoría a un producto
Al crear o editar un producto, podés seleccionar la subcategoría correspondiente.

---

## 7. Pedidos

### 7.1 Ver pedidos
Andá a **Pedidos**. Ves una lista de todos los pedidos realizados por clientes.

### 7.2 Crear un pedido manual
Si un cliente te pide por WhatsApp, podés cargar el pedido manualmente:
1. Hacé clic en **"Nuevo pedido"**.
2. Ingresá:
   - **Nombre del cliente**: quién compra.
   - **Email del cliente**: para notificaciones de tracking.
   - **Productos**: seleccioná los productos y cantidades.
   - **Dirección de envío**: (opcional).
3. Guardá.

### 7.3 Estados de un pedido
Cada pedido puede tener estos estados:
- **Pendiente**: recién creado, esperando pago o preparación.
- **En camino**: ya tiene número de tracking asignado (se actualiza automáticamente desde Bultos).
- **Entregado**: el cliente recibió.
- **Cancelado**: se canceló.

### 7.4 Notas internas
Podés agregar notas internas a cada pedido (ej: "llamar al cliente", "pendiente de stock").

---

## 8. Stock

### 8.1 Ver stock
Andá a **Stock**. Ves una tabla con todos los productos y su cantidad disponible.

### 8.2 Ajustar stock
1. Hacé clic en el producto que querés ajustar.
2. Seleccioná **"Stock"** para cambiar el stock total, o **"Mínimo"** para cambiar el stock mínimo de alerta.
3. Ingresá el valor y guardá.

---

## 9. Importación

### 9.1 Registrar una importación
Cuando traés mercadería desde Paraguay:
1. Andá a **Importación**.
2. Hacé clic en **"Nueva importación"**.
3. Completá:
   - **Proveedor/Distribuidor**: quién te vendió.
   - **Fecha de importación**.
   - **Productos incluidos**: seleccioná los productos y cantidades que trajiste.
   - **Costo total**: cuánto pagaste (USD y/o ARS).
   - **Gastos adicionales**: flete, impuestos, etc.
4. Guardá. El sistema actualiza automáticamente el stock con los productos importados.

### 9.2 Ver historial
En **Importación** ves el historial completo de todas tus importaciones.

---

## 10. Bultos y Tracking

Esta sección es clave para que **tus clientes reciban notificaciones** cuando su pedido está en camino.

### 10.1 Crear un bulto
1. Andá a **Bultos**.
2. Hacé clic en **"Nuevo bulto"**.
3. Completá:
   - **Tipo**: "Grande" o "Chico".
   - **Courier**: "Buspack", "Correo Argentino", etc.
   - **Productos**: seleccioná los productos que van en este bulto.
   - **Costo total USD**: cuánto pagaste por el envío.
4. Guardá.

### 10.2 Asignar tracking y notificar al cliente
1. Una vez que tengas el **código de seguimiento** (tracking number):
   - Andá al bulto y hacé clic en **Editar**.
   - Ingresá el **código de tracking**.
   - Cambiá el **estado** a "En camino".
   - Opcionalmente, agregá el **costo en ARS** para prorratear el envío entre los productos.
2. Guardá.
3. ✅ **El sistema automáticamente:** actualiza el estado de los productos, prorratea el costo de envío, y **envía un email a cada cliente** con su número de tracking y el courier.

### 10.3 Estados de un bulto
- **Pendiente**: recién creado, sin tracking.
- **En camino**: tracking asignado, clientes notificados.
- **Recibido**: el bulto llegó a tu depósito.
- **Cancelado**: se canceló el envío.

---

## 11. Distribuidores

### 11.1 Registrar un distribuidor
1. Andá a **Distribuidores**.
2. Hacé clic en **"Nuevo distribuidor"**.
3. Ingresá nombre, contacto, dirección, notas.
4. Guardá.

### 11.2 Asociar distribuidor a un bulto
Al crear o editar un bulto, podés seleccionar qué distribuidor lo maneja.

---

## 12. Finanzas / Transacciones

### 12.1 Registrar una transacción
1. Andá a **Finanzas**.
2. Hacé clic en **"Nueva transacción"**.
3. Completá:
   - **Tipo**: Ingreso o Egreso.
   - **Monto**: en USD y/o ARS.
   - **Concepto**: descripción (ej: "Venta a Juan", "Pago a proveedor").
   - **Método de pago**: efectivo, transferencia, etc.
   - **Referencia al pedido** (opcional).
4. Guardá.

### 12.2 Dashboard financiero
En el **Dashboard** principal ves gráficos con:
- Ganancias totales (desglose ARS / USDT).
- Ventas por período.
- Productos más vendidos.

---

## 13. Configuración

Andá a **Configuración** para ajustar los datos de tu negocio:

### 13.1 Información de contacto
- **WhatsApp**: tu número de WhatsApp (con código de país, ej: +549381...).
- **Instagram**: tu usuario de Instagram.
- **Email**: tu correo de contacto.

### 13.2 SMTP (correo electrónico)
Para que el sistema pueda **enviar emails automáticos** (tracking, nuevas credenciales, reportes):
1. Ingresá los datos de tu servidor SMTP:
   - **Host**: ej: smtp.gmail.com
   - **Puerto**: ej: 587
   - **Usuario**: tu email
   - **Contraseña**: la contraseña de aplicación
   - **Email desde**: la dirección desde la que se envían los correos
2. Guardá y probá.

> Si no configurás SMTP, el sistema funciona igual pero **no se enviarán notificaciones por email**. Las credenciales y trackings se muestran igual en pantalla.

### 13.3 Exchange rate (tipo de cambio)
Si trabajás con precios en USD y ARS, configurá el tipo de cambio actual para que los cálculos sean correctos.

---

## 14. Reportes

### 14.1 Generar y enviar un reporte
1. Andá a **Reportes**.
2. Completá:
   - **Email destino**: a qué correo querés enviarlo.
   - **Fecha desde / hasta**: período del reporte.
   - **Tipo**: ventas, stock, finanzas, etc.
3. Hacé clic en **"Enviar reporte"**.
4. El sistema genera el reporte y lo envía al email indicado.

---

## 15. Miembros y Roles

### 15.1 Invitar un nuevo miembro
1. Andá a **Miembros**.
2. Hacé clic en **"Invitar miembro"**.
3. Ingresá:
   - **Nombre**: nombre de la persona.
   - **Email**: su correo (le llegarán las credenciales automáticamente si SMTP está configurado).
   - **Rol**: seleccioná **Admin** (acceso completo) o **Customer** (solo lectura + reportes).
4. Guardá. El sistema le envía un email con sus credenciales.

### 15.2 Roles disponibles

| Rol | Acceso |
|-----|--------|
| **Admin** | Acceso completo. Puede crear, editar y eliminar en todas las secciones. |
| **Customer** | Acceso de solo lectura. Puede ver datos pero no modificar. Puede enviar reportes. |

### 15.3 Editar o eliminar un miembro
1. Andá a **Miembros**.
2. Hacé clic en **Editar** para cambiar nombre, email o rol.
3. Hacé clic en **Eliminar** para quitar a un miembro (no podés eliminarte a vos mismo).

---

## 16. Solución de problemas comunes

### "No puedo iniciar sesión"
- Revisá que el email y la contraseña sean correctos.
- Si la sesión se cerró por inactividad, volvé a ingresar.
- Si olvidaste la contraseña, contactá a un administrador para que la restablezca.

### "Los productos no se ven en el catálogo"
- Verificá que el producto tenga **stock disponible** y esté publicado.
- Revisá que esté asignado a una **categoría activa**.

### "No se enviaron los emails de tracking"
- Andá a **Configuración** y verificá que los datos SMTP estén correctos.
- Si SMTP no está configurado, el sistema no puede enviar emails. Las credenciales y trackings se ven en pantalla igual.

### "La página no carga"
- Verificá tu conexión a internet.
- Si el problema persiste, contactá a soporte técnico.

### "Los selects (categorías, roles) no muestran texto"
- Este es un bug conocido que está en proceso de corrección. El sistema funciona, solo la etiqueta visual puede verse incompleta en algunas pantallas. Usá la opción de editar para confirmar selecciones.

---

*ImportExpress — Sistema de Gestión de Importaciones*
