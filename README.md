📖 Documento de Arquitectura y Estado del Sistema: Lucky Pet Tag
Fecha de actualización: Abril 2026

1. Resumen del Proyecto
Lucky Pet Tag es una plataforma de generación de placas de identificación inteligentes para mascotas. El sistema automatiza la creación de perfiles digitales mediante webhooks de Shopify, genera códigos QR únicos, y proporciona un Dashboard Administrativo (Admin Console) para gestionar la producción física (impresión), la base de datos de dueños y mascotas.

2. Stack Tecnológico
Frontend & Backend: Next.js (App Router), React, TypeScript, Tailwind CSS.

Base de Datos & Auth: Supabase (PostgreSQL, Storage, Authentication).

E-commerce: Shopify (Notificaciones vía Webhooks).

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

pet_description: TEXT

allergies: TEXT

pet_photo_url: VARCHAR (URL pública de Supabase Storage)

qr_code_url: VARCHAR (URL pública de Supabase Storage)

created_at: TIMESTAMP (Default: now())

is_printed: BOOLEAN (Default: false)

printed_at: TIMESTAMP

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
Frontend Cliente (Galería / Perfil Público): Crear la vista a la que apuntan los códigos QR (https://id.luckypetag.com/{slug}). Debe leer el slug de la URL, hacer un fetch a Supabase (pets y owners) y renderizar el perfil de la mascota.

Lógica de Botones de Contacto: En el perfil público, renderizar condicionalmente el botón de WhatsApp o Llamada dependiendo del booleano has_whatsapp de la tabla owners.

Seguridad (RLS): Asegurar que las políticas de Supabase permitan lectura pública (SELECT) de los perfiles para que cualquier persona que escanee el QR pueda ver los datos.