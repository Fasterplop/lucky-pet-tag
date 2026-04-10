import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '../../../lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY);

// 🛡️ FUNCIÓN DE SEGURIDAD: Escapa caracteres HTML para evitar Phishing o XSS en el correo
const sanitizeInput = (str: string) => {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, (tag) => {
    const charsToReplace: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    };
    return charsToReplace[tag] || tag;
  });
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { petId, petSlug, message, honeypot } = body;

    // 🚨 1. DEFENSA CONTRA BOTS (Honeypot)
    if (honeypot && honeypot.length > 0) {
      console.log('Bot detected and blocked.');
      return NextResponse.json({ success: true, message: 'Message sent securely.' });
    }

    if (!petId || !message) {
      return NextResponse.json({ error: 'Missing required data.' }, { status: 400 });
    }

    // 🚨 2. SANITIZAR EL MENSAJE CONTRA INYECCIONES HTML
    const safeMessage = sanitizeInput(message);

    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('pet_name, owner_id')
      .eq('id', petId)
      .single();

    if (petError || !pet || !pet.owner_id) {
      return NextResponse.json({ error: 'Failed to locate pet or owner.' }, { status: 404 });
    }

    const { data: owner, error: ownerError } = await supabase
      .from('owners')
      .select('email, full_name')
      .eq('id', pet.owner_id)
      .single();

    if (ownerError || !owner || !owner.email) {
      return NextResponse.json({ error: 'Owner email not found.' }, { status: 404 });
    }

    // 3. Enviar el correo usando la variable safeMessage en lugar de message
    await resend.emails.send({
      from: 'Lucky Pet Tag Alerts <alerts@luckypetag.com>',
      to: owner.email,
      subject: `⚠️ ALERTA DE MASCOTA: Alguien ha encontrado a ${pet.pet_name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e7f0eb; border-radius: 24px;">
          <h1 style="color: #ba1a1a; font-size: 24px; margin-bottom: 5px;">¡URGENTE: ALERTA DE ESCANEO!</h1>
          <p>Hola ${owner.full_name || 'Dueño/a'},</p>
          <p>Alguien acaba de escanear la placa Lucky Pet Tag de <strong>${pet.pet_name}</strong> y ha dejado el siguiente mensaje:</p>
          
          <div style="background-color: #f2fbf6; padding: 20px; border-radius: 12px; font-weight: normal; margin: 20px 0; border-left: 4px solid #0b6946; white-space: pre-wrap;">
            "${safeMessage}"
          </div>
          
          <p>Por favor, revisa tu Dashboard o comunícate con la persona utilizando la información del mensaje.</p>
        </div>
      `
    });

    return NextResponse.json({ success: true, message: 'Message sent securely.' });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'An internal server error occurred.' }, { status: 500 });
  }
}