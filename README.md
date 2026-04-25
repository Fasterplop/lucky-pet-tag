📖 Documento de Arquitectura y Estado del Sistema: Lucky Pet Tag
Fecha de actualización: Abril 2026

1. Resumen del Proyecto
Lucky Pet Tag es una plataforma de generación de placas de identificación inteligentes para mascotas. El sistema automatiza la creación de perfiles digitales mediante webhooks de Shopify, genera códigos QR únicos, y proporciona un ecosistema completo que incluye: un Dashboard Administrativo para la producción, perfiles públicos dinámicos con controles de privacidad para las mascotas, y un sistema seguro de alertas para los dueños en caso de extravío.

2. Stack Tecnológico
Frontend & Backend: Next.js (App Router), React, TypeScript, Tailwind CSS.

Iconografía: Lucide React (SVGs nativos para carga instantánea y prevención de FOUT).

Base de Datos & Auth: Supabase (PostgreSQL, Storage, Authentication tradicional con Email/Password).

E-commerce: Shopify (Notificaciones vía Webhooks y consultas GraphQL).

Correos Transaccionales: Resend permanece disponible como integración futura, pero el flujo público activo de rescate es actualmente WhatsApp-first.

Librerías Clave: 
- `qrcode` (Generación de QR en backend).
- `libphonenumber-js` (Normalización internacional de números para WhatsApp).
- API nativa de HTML5 Canvas (para compresión de imágenes).


Internacionalización: `i18next` y `react-i18next` para soporte multi-idioma (Inglés/Español) con detección automática del navegador.


3. Modelo de Datos (Supabase SQL Schema)
El sistema utiliza bases de datos relacionales normalizadas con las siguientes tablas principales:

**admin_users** (Administradores)
- `id`: UUID
- `email`: VARCHAR (Vinculado a Supabase Auth)
- `full_name`: VARCHAR (Nombre a mostrar en el panel)
- `role`: VARCHAR (Ej. 'Superuser')

**owners** (Dueños - Información de Contacto)
- `id`: UUID (Primary Key)
- `email`: VARCHAR (Unique)
- `full_name`: VARCHAR
- `address`: VARCHAR
- `phone_number`: VARCHAR
- `has_whatsapp`: BOOLEAN (Default: false)
- `created_at`: TIMESTAMP

**pets** (Mascotas y Placas)
- `id`: UUID (Primary Key)
- `owner_id`: UUID (Foreign Key a owners.id -> ON DELETE CASCADE)
- `slug`: VARCHAR (Unique, Identificador alfanumérico de 6 caracteres ej. "x7k9p2")
- `pet_name`: VARCHAR
- `pet_type`: TEXT (Ej. Perro, Gato)
- `breed`: TEXT (Raza)
- `age`: TEXT (Ej. "3 años")
- `pet_description`: TEXT
- `allergies`: TEXT
- `pet_photo_url`: VARCHAR (URL pública de Supabase Storage)
- `qr_code_url`: VARCHAR (URL pública de Supabase Storage)
- `is_lost_mode_active`: BOOLEAN (Default: false - Control de Privacidad)
- `is_printed`: BOOLEAN (Default: false)
- `printed_at`: TIMESTAMP
- `created_at`: TIMESTAMP (Default: now())
- *Campos de trazabilidad de Shopify:* `shopify_order_id`, `shopify_line_item_id`, `shopify_product_type`, etc.

**finder_messages** (Historial de Alertas de Rescate)
- `id`: UUID (Primary Key)
- `pet_id`: UUID (Foreign Key a pets.id)
- `message`: TEXT
- `created_at`: TIMESTAMPTZ


Storage (Buckets)
lucky-pet-assets: Almacena imágenes de mascotas y QRs generados por el sistema.

Políticas (RLS):
- Los administradores autenticados tienen control operativo sobre assets del sistema.
- Los dueños autenticados pueden subir, ver, actualizar y borrar fotos únicamente para mascotas que les pertenecen.
- Las fotos de mascotas subidas por dueños usan la convención de ruta:
  `pets/{pet_id}/photo-{timestamp}.jpg`

4. Flujo de Integración: Shopify Webhook (app/api/webhooks/shopify/route.ts)
**Trigger:** El webhook se dispara en Shopify con el evento de Pago del pedido (Order payment).

**Seguridad:** El servidor de Next.js verifica la firma HMAC SHA256 usando el `SHOPIFY_WEBHOOK_SECRET`.

**Validación de Producto:** Mediante la API GraphQL de Shopify, el sistema verifica que el `productType` de cada línea de pedido sea estrictamente "Smart Pet Tag", omitiendo otros productos.

**Procesamiento de Dueño:** Extrae datos del cliente y normaliza el número de teléfono internacionalmente para WhatsApp usando `libphonenumber-js`. Si el correo no existe, crea un nuevo dueño.

**Generación de Mascota:** Crea un registro en pets vinculado al dueño, con el nombre "New Pet" y genera un slug seguro aleatorio de 6 dígitos.

**Generación Multi-Mascota:** El sistema lee el campo `quantity`. Si un cliente compra 3 placas en una sola línea de pedido, el sistema itera y crea 3 registros de mascotas independientes vinculados al dueño.

**Generación de QR:** Usa la librería qrcode para crear un buffer apuntando a la ruta pública canónica del perfil:
`https://luckypetag.com/id/{slug}`.
Luego sube la imagen a Supabase Storage y guarda la URL en el registro de la mascota.

## 5. Infraestructura y Persistencia (Supabase)

El sistema utiliza Supabase como plataforma de Backend-as-a-Service (BaaS). Al no existir scripts de migración automatizados, la estructura debe gestionarse manualmente desde el Dashboard de Supabase.

-Middleware de Protección: El archivo middleware.ts intercepta todas las peticiones a /app y /admin, validando la sesión activa del usuario. Si no hay sesión, redirige al /login.


### 5.1 Gestión de Base de Datos
**Modo de Operación:** Manual. Los cambios estructurales se realizan directamente en el editor de tablas de Supabase. 
- **Relaciones Críticas:** - `owners.id` (UUID) 1 ⮕ N `pets.owner_id`.
  - `pets.id` (UUID) 1 ⮕ N `finder_messages.pet_id`.

### 5.2 Seguridad y Políticas (RLS)
El acceso a los datos está blindado mediante **Row Level Security (RLS)**, garantizando que un dueño no pueda modificar la mascota de otro:

* **Tabla `pets`:** - `SELECT`: Público (anon) filtrado por `slug`.
    - `UPDATE`: Solo si `auth.uid() == owner_id`.
* **Storage (Bucket: `lucky-pet-assets`):**
    - **Acceso Público:** Lectura permitida para usuarios anónimos (`anon`).
    - **Gestión Privada:** Solo usuarios autenticados (`authenticated`) tienen permisos de `INSERT`, `UPDATE` y `DELETE`.

### 5.3 Lógica de Clientes (Acceso Diferenciado)
Para balancear seguridad y funcionalidad, el código implementa tres clientes distintos en `/lib`:

1.  **`supabase-admin.ts` (Bypass RLS):** Utiliza la `SERVICE_ROLE_KEY`. Se usa exclusivamente en el servidor (Webhooks de Shopify) para crear registros de dueños y mascotas que aún no tienen una sesión de usuario activa.
2.  **`supabase-public.ts` (Lectura):** Utiliza la `ANON_KEY`. Optimizado para la carga ultra-rápida del perfil público de la mascota.
3.  **`supabase.ts` (Sesión de Usuario):** Cliente estándar que utiliza el token del usuario logueado en el Portal del Dueño.

### 5.4 Funciones de Borde (Edge Functions / API)
Aunque la lógica de PostgreSQL es estática (sin triggers complejos), la inteligencia del sistema reside en las **Next.js API Routes** (que operan como Edge Functions), especialmente en la validación de webhooks y la gestión del "Modo Perdido" en tiempo real.


6. Módulos Implementados

El sistema se divide en cuatro pilares fundamentales que cubren desde la venta hasta la gestión del usuario final:


### 6.1 Admin Dashboard (`app/admin/page.tsx`)
Interfaz protegida por sesión de Supabase Auth, permite filtrar mascotas por nombre, email del dueño o slug. Incluye controles para marcar placas como impresas (is_printed), lo que registra la fecha de producción (printed_at).

Módulos / Vistas:

Overview: Tarjetas de estadísticas (Total, Impresas, Pendientes) y feed de "Actividad Reciente".

Printing:

Motor de Paginación manual (7 ítems por página).

Búsqueda global por nombre de mascota, email, slug, nombre de producto o nombre del dueño.

Diseño Responsivo: Tabla clásica en Desktop, Smart Cards en Móvil.

Botón para marcar impreso/deshacer, registrar fecha de impresión (printed_at) o eliminar mascota.

Edit View:

Compresor de imágenes Client-Side: Antes de subir la foto de la mascota, el navegador (Canvas) la escala a max 800px de ancho y la convierte a JPG (80% calidad) para ahorrar espacio y mejorar el performance.

Edición completa de pets (nombre, notas, foto) y owners (nombre, dirección, teléfono, checkbox de has_whatsapp).

Visualizador de QR Code integrado.

Eliminación en cascada de "Dueño" (borra dueño + todas sus mascotas) con Modal de Seguridad (Warning emergente) para evitar borrados accidentales.

Teams: Lista estática de usuarios en la tabla admin_users.

### 6.2 Vista Pública (`app/id/[slug]/page.tsx`)
El núcleo funcional para la respuesta ante emergencias, ya operativo:

* **Ruta Pública Canónica:** El perfil público se sirve desde:
  `https://luckypetag.com/id/{slug}`

* **Frontend Dinámico:** Renderizado de la información pública de la mascota recuperada mediante el slug único.

* **Internacionalización Dinámica:** La interfaz está completamente traducida usando `i18next`. Detecta el idioma del teléfono de la persona que escanea la placa y le muestra la interfaz en inglés o español.

* **Controles de Privacidad Dinámicos (Lógica de Modos):**
  * *Safe Mode* (`is_lost_mode_active: false`): Muestra un distintivo de "Protected" / "Safe Mode".
  * *Lost Mode* (`is_lost_mode_active: true`): Muestra un distintivo de "I'm Lost" / "Lost Mode".

* **Interfaz Pública Emotiva:** El diseño prioriza claridad, calidez y una llamada emocional a ayudar a la mascota a regresar con su familia.

* **Acciones Públicas Actuales (WhatsApp-first):**
  * **Message my family** → abre WhatsApp con el mensaje:
    `Hi, I found {petName} 🐾`
  * **Send my location to my family** → intenta obtener la ubicación del usuario y abre WhatsApp con:
    - mensaje de rescate
    - link de Google Maps
  * Si la ubicación es denegada o no está disponible, igualmente se abre WhatsApp con un mensaje alternativo sin ubicación automática.

### 6.3 Sistema de Contacto Público
El flujo público actual es WhatsApp-first (basado en el teléfono normalizado del dueño).

* **Canal principal de rescate:** WhatsApp
* **Acciones soportadas actualmente:**
  * mensaje directo a la familia
  * envío de ubicación a la familia
* **Fallback actual:** Si la ubicación no está disponible, el sistema sigue abriendo WhatsApp con un mensaje alternativo.

* **Nota técnica:**
  La lógica previa basada en `/api/notify-owner` y Resend quedó comentada para posible uso futuro si cambian los requisitos del producto.

* **finder_messages:**
  La tabla permanece disponible para evolución futura del historial de contactos o trazabilidad de eventos de rescate.

### 6.4 Dashboard del Dueño (Owner Portal - `app/app/page.tsx`)
El portal privado donde el cliente tiene control sobre su cuenta y sus mascotas:

* **Autenticación:** Sistema de login para clientes finales vinculado a Supabase Auth.

* **Gestión del Perfil del Dueño:**
  * actualización de nombre
  * dirección
  * teléfono
  * el teléfono se trata como obligatorio en la UI porque se usa para contacto por WhatsApp y envío de ubicación

* **Pet Gallery / Edición de Mascotas:**
  * visualización de mascotas vinculadas al dueño autenticado
  * edición de nombre, tipo, raza, edad, descripción y notas médicas
  * activación y desactivación de Lost Mode
  * apertura del perfil público de cada mascota

* **Gestión de Foto de Mascota:**
  * cambiar foto
  * eliminar foto
  * validación de archivo:
    - solo imágenes
    - máximo 10 MB
  * feedback visual mediante mini toast

* **WhatsApp Toggle:**
  * el checkbox `has_whatsapp` quedó comentado en la interfaz actual
  * el flujo público asume WhatsApp como canal principal de contacto


## 7. Posibles futuros ajustes:

* **finder_messages:**
  La tabla permanece disponible para evolución futura del historial de contactos o trazabilidad de eventos de rescate.

* **Smtp Provider:** 
  Actualmente los mensajes de cambio de contrasena se envian a traves de Supabase, por lo que si hay mas de 2 peticiones por hora el sistema podria dar error y no enviar el correo. Ademas de cubrir el envio a "Spam".

* **UI/UX:**
  Mejorar la experiencia de usuario haciendo la app mas intuitiva y tener en cuenta posibles requisitos o acciones del usuario (ej. Cambiar correo electronico).

* **Cloudflare Turnstile (Anti-Bots):** Añadir el widget invisible en la pantalla de "Obtener Código" para evitar que bots agoten tu cuota de envíos de correo en Supabase.

* **Límite de intentos (Rate Limiting):** Configurar en el Middleware de Next.js que la ruta de login no pueda ser consultada más de 5 veces en 10 minutos por la misma IP.

* **Configurar Dominio Personalizado en Supabase:** Para que las cookies de sesión (Auth) compartan el dominio raíz y viajen perfectamente entre id., app. y admin.luckypetag.com.

* La lógica previa basada en `/api/notify-owner` y Resend quedó comentada para posible uso futuro si cambian los requisitos del producto.