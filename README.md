📖 Documento de Arquitectura y Estado del Sistema: Lucky Pet Tag
Fecha de actualización: Abril 2026

1. Resumen del Proyecto
Lucky Pet Tag es una plataforma de generación de placas de identificación inteligentes para mascotas. El sistema automatiza la creación de perfiles digitales mediante webhooks de Shopify, genera códigos QR únicos, y proporciona un ecosistema completo que incluye: un Dashboard Administrativo para la producción, perfiles públicos dinámicos con controles de privacidad para las mascotas, y un sistema seguro de alertas para los dueños en caso de extravío.

2. Stack Tecnológico
Frontend & Backend: Next.js (App Router), React, TypeScript, Tailwind CSS.

Iconografía: Lucide React (SVGs nativos para carga instantánea y prevención de FOUT).

Base de Datos & Auth: Supabase (PostgreSQL, Storage, Authentication tradicional con Email/Password).

E-commerce: Shopify (Notificaciones vía Webhooks).

Correos Transaccionales: Resend (API para notificaciones seguras).

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
lucky-pet-assets: Almacena imágenes subidas por el admin y QRs generados por el sistema.

Políticas (RLS): Los administradores loggeados (authenticated) tienen permisos de INSERT y UPDATE.

4. Flujo de Integración: Shopify Webhook (app/api/webhooks/shopify/route.ts)
Trigger: El webhook se dispara en Shopify con el evento de Pago del pedido (Order payment).

Seguridad: El servidor de Next.js verifica la firma HMAC SHA256 (x-shopify-hmac-sha256) usando un secreto de entorno.

Procesamiento de Dueño: Extrae email, full_name, address y phone. Si el correo no existe en owners, lo crea usando la llave maestra (supabaseAdmin).

Generación de Mascota: Crea un registro en pets vinculado al dueño, con el nombre "Nueva Mascota" y genera un slug seguro aleatorio de 6 dígitos.

Generación de QR: Usa la librería qrcode para crear un buffer apuntando a https://id.luckypetag.com/{slug}. Sube la imagen a Supabase Storage y guarda la URL en el registro de la mascota.

5. Admin Dashboard (app/admin/page.tsx)
Interfaz protegida por sesión de Supabase Auth, basada en el Design System "The Organic Fortress/Digital Guardian" (colores corporativos verdes #0b6946, #edf6f1). Contiene navegación dinámica lateral (Desktop) y Bottom Nav (Móvil).

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

6. Siguientes Pasos (Pendientes para Desarrollo Futuro)
Para completar el ecosistema de Lucky Pet Tag y llevarlo a su versión de producción final, se deben desarrollar los siguientes módulos y características:

6.1 Implementación de la Vista Pública y Sistema de Seguridad (app/[slug]/page.tsx)
Este es el núcleo funcional del producto, centrado en la protección de datos y la respuesta ante emergencias:

Frontend del Perfil Público: Desarrollar la vista dinámica (https://id.luckypetag.com/{slug}) que recupera los datos de la mascota y el dueño mediante el slug único del QR.

Controles de Privacidad Dinámicos (Lógica de Modos):

Safe Mode (is_lost_mode_active: false): Interfaz enfocada en la privacidad. Oculta datos sensibles y muestra un formulario de contacto anónimo.

Lost Mode (is_lost_mode_active: true): Interfaz de alerta (color rojo). Habilita botones de acción directa ("Llamar", "WhatsApp" y "Google Maps").

API de Notificaciones e Integridad: * Configurar el endpoint /api/notify-owner con Resend para alertas inmediatas.

Implementar protección Honeypot y sanitización XSS para prevenir abusos en los formularios de contacto.

6.2 Dashboard del Dueño (Owner Portal - app.luckypetag.com)
El portal privado donde el cliente tiene control total sobre su cuenta:

Gestión del Perfil: Interfaz para actualizar nombre, dirección, teléfono y la preferencia de contacto por WhatsApp (has_whatsapp).

Galería y Edición de Mascotas: * CRUD de mascotas vinculado al auth.uid().

Integración de compresor de imágenes (Canvas) para optimizar la carga de fotografías de perfil (pet_photo_url).

Gestión de notas médicas, alergias y rasgos de comportamiento.

Interruptor de Emergencia: Implementación del toggle visual que modifica el estado de is_lost_mode_active en tiempo real.

6.3 Seguridad y Políticas RLS (Row Level Security) en Supabase
Configuración robusta del backend para garantizar la integridad de la información:

Lectura Pública: Habilitar políticas SELECT exclusivas para la tabla pets mediante el slug, permitiendo que cualquier persona vea el perfil tras el escaneo sin necesidad de autenticación.

Restricción de Edición: Configurar políticas estrictas de UPDATE, INSERT y DELETE para que solo el propietario (verificado por su ID de autenticación) pueda modificar sus propios datos y los de sus mascotas.
