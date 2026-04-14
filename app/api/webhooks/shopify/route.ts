import { NextResponse } from 'next/server';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

const generateUniqueSlug = () => Math.random().toString(36).substring(2, 8);

function normalizePhoneForWhatsApp(rawPhone?: string, countryCode?: string | null) {
  if (!rawPhone) return '';

  const cleanedCountry = (countryCode || '').toUpperCase();

  const parsed =
    (cleanedCountry
      ? parsePhoneNumberFromString(rawPhone, cleanedCountry as CountryCode)
      : undefined) || parsePhoneNumberFromString(rawPhone);

  if (!parsed || !parsed.isValid()) {
    console.warn('Could not normalize phone number:', { rawPhone, countryCode });
    return rawPhone.replace(/\D/g, '');
  }

  // Guarda formato internacional sin "+"
  // Ej: +17861234567 -> 17861234567
  return parsed.number.replace('+', '');
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-shopify-hmac-sha256');
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

    if (!secret) {
      return NextResponse.json({ error: 'Incomplete configuration' }, { status: 500 });
    }

    const hash = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('base64');

    if (hash !== signature) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const email = body.email || body.customer?.email;

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 400 });
    }

    const customer = body.customer || {};
    const shipping = body.shipping_address || {};
    const billing = body.billing_address || {};

    const firstName =
      customer.first_name || shipping.first_name || billing.first_name || '';
    const lastName =
      customer.last_name || shipping.last_name || billing.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();

    const address = [
      shipping.address1 || billing.address1 || '',
      shipping.city || billing.city || '',
      shipping.country || billing.country || '',
    ]
      .filter(Boolean)
      .join(', ');

    const rawPhone = customer.phone || shipping.phone || billing.phone || '';
    const countryCode =
      shipping.country_code ||
      billing.country_code ||
      customer.default_address?.country_code ||
      null;

    const whatsappPhone = normalizePhoneForWhatsApp(rawPhone, countryCode);

    console.log(`Processing order for: ${email} (${fullName})`, {
      rawPhone,
      countryCode,
      whatsappPhone,
    });

    let { data: owner, error: ownerLookupError } = await supabaseAdmin
      .from('owners')
      .select('id, phone_number, has_whatsapp')
      .eq('email', email)
      .maybeSingle();

    if (ownerLookupError) {
      throw new Error('Error finding owner: ' + ownerLookupError.message);
    }

    if (!owner) {
      const { data: newOwner, error: ownerError } = await supabaseAdmin
        .from('owners')
        .insert([
          {
            email,
            full_name: fullName,
            address,
            phone_number: whatsappPhone || null,
            has_whatsapp: Boolean(whatsappPhone),
          },
        ])
        .select()
        .single();

      if (ownerError) {
        throw new Error('Error creating owner: ' + ownerError.message);
      }

      owner = newOwner;
    } else {
      const updatePayload: {
        full_name?: string;
        address?: string;
        phone_number?: string | null;
        has_whatsapp?: boolean;
      } = {};

      if (fullName) updatePayload.full_name = fullName;
      if (address) updatePayload.address = address;

      // Solo actualiza teléfono si Shopify realmente mandó uno
      if (whatsappPhone) {
        updatePayload.phone_number = whatsappPhone;
        updatePayload.has_whatsapp = true;
      }

      if (Object.keys(updatePayload).length > 0) {
        const { error: updateOwnerError } = await supabaseAdmin
          .from('owners')
          .update(updatePayload)
          .eq('id', owner.id);

        if (updateOwnerError) {
          throw new Error('Error updating owner: ' + updateOwnerError.message);
        }
      }
    }

    if (!owner) {
      throw new Error('Could not establish owner');
    }

    const slug = generateUniqueSlug();

    const { data: pet, error: petError } = await supabaseAdmin
      .from('pets')
      .insert([
        {
          owner_id: owner.id,
          slug,
          pet_name: 'New Pet',
        },
      ])
      .select()
      .single();

    if (petError) {
      throw new Error('Error creating pet profile: ' + petError.message);
    }

    const qrBaseUrl =
      process.env.NEXT_PUBLIC_PUBLIC_PET_PROFILE_BASE_URL ||
      'https://luckypetag.com/id';

    const publicUrl = `${qrBaseUrl}/${slug}`;
    const qrBuffer = await QRCode.toBuffer(publicUrl);

    const fileName = `Order_QR_${slug}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('lucky-pet-assets')
      .upload(fileName, qrBuffer, {
        contentType: 'image/png',
      });

    if (uploadError) {
      throw new Error('Error uploading QR to Supabase');
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('lucky-pet-assets')
      .getPublicUrl(fileName);

    await supabaseAdmin
      .from('pets')
      .update({ qr_code_url: urlData.publicUrl })
      .eq('id', pet.id);

    console.log(`Success! Tag created for ${email} with slug ${slug}`);

    return NextResponse.json(
      { message: 'Tag processed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in process:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}