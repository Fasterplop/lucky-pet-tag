📖 Documento de Arquitectura y Estado del Sistema: Lucky Pet Tag
Fecha de actualización: Abril 2026

1. Resumen del Proyecto
Lucky Pet Tag es una plataforma de generación de placas de identificación inteligentes para mascotas. El sistema automatiza la creación de perfiles digitales mediante webhooks de Shopify, genera códigos QR únicos, y proporciona un ecosistema completo que incluye: un Dashboard Administrativo para la producción, perfiles públicos dinámicos con controles de privacidad para las mascotas, y un sistema seguro de alertas para los dueños en caso de extravío.

2. Stack Tecnológico
Frontend & Backend: Next.js (App Router), React, TypeScript, Tailwind CSS.

Iconografía: Lucide React (SVGs nativos para carga instantánea y prevención de FOUT).

Base de Datos & Auth: Supabase (PostgreSQL, Storage, Authentication tradicional con Email/Password).

E-commerce: Shopify (Notificaciones vía Webhooks).

Correos Transaccionales: Resend (API para notificaciones seguras). -Para futuro-

Librerías Clave: qrcode (Generación de QR en backend), API nativa de HTML5 Canvas (para compresión de imágenes).

3. Modelo de Datos (Supabase SQL Schema)
El sistema utiliza bases de datos relacionales normalizadas con las siguientes tablas principales:

admin_users (Administradores)
id: UUID

email: VARCHAR (Vinculado a Supabase Auth)

full_name: VARCHAR (Nombre a mostrar en el panel)

role: VARCHAR (Ej. 'Superuser')

owners (Dueños - Información de Contacto)
id: UUID (Primary Key)

email: VARCHAR (Unique)

full_name: VARCHAR

address: VARCHAR

phone_number: VARCHAR

has_whatsapp: BOOLEAN (Default: false)

created_at: TIMESTAMP

pets (Mascotas y Placas)

id: UUID (Primary Key)

owner_id: UUID (Foreign Key a owners.id -> ON DELETE CASCADE)

slug: VARCHAR (Unique, Identificador alfanumérico de 6 caracteres ej. "x7k9p2")

pet_name: VARCHAR

pet_type: TEXT (Ej. Perro, Gato)

breed: TEXT (Raza)

age: TEXT (Ej. "3 años")

pet_description: TEXT

allergies: TEXT

pet_photo_url: VARCHAR (URL pública de Supabase Storage)

qr_code_url: VARCHAR (URL pública de Supabase Storage)

is_lost_mode_active: BOOLEAN (Default: false - Control de Privacidad)

is_printed: BOOLEAN (Default: false)

printed_at: TIMESTAMP

created_at: TIMESTAMP (Default: now())

finder_messages (Historial de Alertas de Rescate)

id: UUID (Primary Key)

pet_id: UUID (Foreign Key a pets.id)

message: TEXT

created_at: TIMESTAMPTZ

Storage (Buckets)
lucky-pet-assets: Almacena imágenes de mascotas y QRs generados por el sistema.

Políticas (RLS):
- Los administradores autenticados tienen control operativo sobre assets del sistema.
- Los dueños autenticados pueden subir, ver, actualizar y borrar fotos únicamente para mascotas que les pertenecen.
- Las fotos de mascotas subidas por dueños usan la convención de ruta:
  `pets/{pet_id}/photo-{timestamp}.jpg`

4. Flujo de Integración: Shopify Webhook (app/api/webhooks/shopify/route.ts)
Trigger: El webhook se dispara en Shopify con el evento de Pago del pedido (Order payment).

Seguridad: El servidor de Next.js verifica la firma HMAC SHA256 (x-shopify-hmac-sha256) usando un secreto de entorno.

Procesamiento de Dueño: Extrae email, full_name, address y phone. Si el correo no existe en owners, lo crea usando la llave maestra (supabaseAdmin).

Generación de Mascota: Crea un registro en pets vinculado al dueño, con el nombre "New Pet" y genera un slug seguro aleatorio de 6 dígitos.

Generación de QR: Usa la librería qrcode para crear un buffer apuntando a la ruta pública canónica del perfil:
`https://luckypetag.com/id/{slug}`.
Luego sube la imagen a Supabase Storage y guarda la URL en el registro de la mascota.

5. Seguridad y RLS (Row Level Security)
La integridad de los datos se basa en un modelo de "privilegio mínimo" y aislamiento de contextos:

-Middleware de Protección: El archivo middleware.ts intercepta todas las peticiones a /app y /admin, validando la sesión activa del usuario. Si no hay sesión, redirige al /login.

-Aislamiento de Clientes Supabase:
    -supabase-admin.ts: Utiliza la SERVICE_ROLE_KEY. Solo se emplea en el backend (webhooks, APIs internas) para operaciones que requieren saltar el RLS.
    -supabase-public.ts: Utiliza la ANON_KEY. Se usa en la vista pública para leer datos limitados basados en el slug.
    -supabase.ts: Cliente estándar para el portal del dueño, donde el RLS filtra los datos automáticamente basándose en el ID del usuario autenticado (auth.uid()).

6. Módulos Implementados

El sistema se divide en cuatro pilares fundamentales que cubren desde la venta hasta la gestión del usuario final:


### 6.1 Admin Dashboard (`app/admin/page.tsx`)
Interfaz protegida por sesión de Supabase Auth, permite filtrar mascotas por nombre, email del dueño o slug. Incluye controles para marcar placas como impresas (is_printed), lo que registra la fecha de producción (printed_at).

Módulos / Vistas:

Overview: Tarjetas de estadísticas (Total, Impresas, Pendientes) y feed de "Actividad Reciente".

Printing:

Motor de Paginación manual (6 ítems por página).

Búsqueda global por nombre de mascota, email, slug o nombre del dueño.

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
El flujo público actual es **WhatsApp-first**.

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


7. Próximos Pasos (Hoja de Ruta al Deploy)
Para llevar la aplicación a producción, se deben completar los siguientes hitos:
-Configuración de Variables de Entorno:
    -NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.
    -SUPABASE_SERVICE_ROLE_KEY (Solo para entorno de servidor).
    -SHOPIFY_WEBHOOK_SECRET: Para la validación HMAC.
    -RESEND_API_KEY: Para activar el sistema de notificaciones.
    -NEXT_PUBLIC_PUBLIC_PET_PROFILE_BASE_URL: URL base para los códigos QR (ej. https://id.luckypetag.com).
-Hardening de Políticas SQL (RLS): Implementación de las reglas en la consola de Supabase para asegurar que un dueño no pueda ver mascotas de otro y que el público solo vea lo necesario mediante el slug.
-Activación del Sistema de Notificaciones: Descomentar y testear la lógica en app/api/notify-owner/route.ts para que los mensajes del formulario lleguen al email del dueño.
-Optimización de Assets: Verificar que el compresor de imágenes en el cliente (Canvas API) esté activo para reducir costes de almacenamiento en Storage.