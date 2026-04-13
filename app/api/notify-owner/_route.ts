import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '../../../lib/supabase-admin';

const resend = new Resend(process.env.RESEND_API_KEY);

function sanitizeInput(str: string) {
  if (!str) return '';

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { petId, message, website } = body as {
      petId?: string;
      message?: string;
      website?: string;
    };

    // Honeypot: si viene lleno, fingimos éxito y no hacemos nada
    if (website && website.trim().length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Message sent securely.',
      });
    }

    if (!petId || !message?.trim()) {
      return NextResponse.json(
        { error: 'Missing required data.' },
        { status: 400 }
      );
    }

    const safeMessage = sanitizeInput(message.trim());

    const { data: pet, error: petError } = await supabaseAdmin
      .from('pets')
      .select('id, pet_name, owner_id, slug, is_lost_mode_active')
      .eq('id', petId)
      .maybeSingle();

    if (petError || !pet || !pet.owner_id) {
      return NextResponse.json(
        { error: 'Failed to locate pet or owner.' },
        { status: 404 }
      );
    }

    const { data: owner, error: ownerError } = await supabaseAdmin
      .from('owners')
      .select('email, full_name')
      .eq('id', pet.owner_id)
      .maybeSingle();

    if (ownerError || !owner || !owner.email) {
      return NextResponse.json(
        { error: 'Owner email not found.' },
        { status: 404 }
      );
    }

    // Guardar historial del mensaje
    const { error: insertError } = await supabaseAdmin
      .from('finder_messages')
      .insert({
        pet_id: pet.id,
        message: safeMessage,
      });

    if (insertError) {
      console.error('Failed to save finder message:', insertError.message);
    }

    const fromEmail =
      process.env.RESEND_FROM_EMAIL || 'alerts@luckypetag.com';

    const subject = pet.is_lost_mode_active
      ? `🚨 Lost Pet Alert: ${pet.pet_name || 'Your pet'}`
      : `⚠️ Lucky Pet Tag scan for ${pet.pet_name || 'your pet'}`;

    await resend.emails.send({
      from: `Lucky Pet Tag <${fromEmail}>`,
      to: owner.email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #151d1b;">
          <h2 style="margin-bottom: 12px;">Lucky Pet Tag Alert</h2>

          <p>Hello ${sanitizeInput(owner.full_name || 'there')},</p>

          <p>
            Someone interacted with the public profile for
            <strong>${sanitizeInput(pet.pet_name || 'your pet')}</strong>.
          </p>

          <p style="margin: 18px 0 8px;"><strong>Message received:</strong></p>
          <div style="background: #f6f8f7; border-radius: 12px; padding: 14px 16px;">
            ${safeMessage}
          </div>

          <p style="margin-top: 18px;">
            Pet profile slug:
            <strong>${sanitizeInput(pet.slug || '')}</strong>
          </p>

          <p style="margin-top: 18px;">
            Please log in to your Lucky Pet Tag dashboard if you need to update
            Lost Mode or your contact details.
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: 'Message sent securely.',
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'An internal server error occurred.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}