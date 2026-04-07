import { NextResponse } from 'next/server';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { supabaseAdmin } from '../../../../lib/supabase-admin'; 

// Changed to 6 characters for better security
const generateUniqueSlug = () => Math.random().toString(36).substring(2, 8);

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
    const email = body.email || (body.customer && body.customer.email);

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 400 });
    }

    // Extract all customer data from Shopify
    const customer = body.customer || {};
    const firstName = customer.first_name || '';
    const lastName = customer.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    const shipping = body.shipping_address || {};
    const address = `${shipping.address1 || ''}, ${shipping.city || ''}, ${shipping.country || ''}`.trim();
    const phone = customer.phone || shipping.phone || '';

    console.log(`Processing order for: ${email} (${fullName})`);

    // --- DATABASE LOGIC ---

    let { data: owner } = await supabaseAdmin.from('owners').select('id').eq('email', email).single();

    if (!owner) {
      const { data: newOwner, error: ownerError } = await supabaseAdmin
        .from('owners')
        .insert([{ 
          email: email,
          full_name: fullName,
          address: address,
          phone_number: phone
        }])
        .select()
        .single();
      
      if (ownerError) throw new Error('Error creating owner: ' + ownerError.message); 
      owner = newOwner;
    }

    if (!owner) throw new Error('Could not establish owner');

    const slug = generateUniqueSlug();

    const { data: pet, error: petError } = await supabaseAdmin
      .from('pets')
      .insert([{
        owner_id: owner.id,
        slug: slug,
        pet_name: 'New Pet', // Translated default name
      }])
      .select()
      .single();

    if (petError) throw new Error('Error creating pet profile: ' + petError.message);

    // --- QR CODE GENERATION ---

    const publicUrl = `https://id.luckypetag.com/${slug}`;
    const qrBuffer = await QRCode.toBuffer(publicUrl);

    const fileName = `Order_QR_${slug}.png`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('lucky-pet-assets')
      .upload(fileName, qrBuffer, {
        contentType: 'image/png',
      });

    if (uploadError) throw new Error('Error uploading QR to Supabase');

    const { data: urlData } = supabaseAdmin.storage.from('lucky-pet-assets').getPublicUrl(fileName);
    
    await supabaseAdmin
      .from('pets')
      .update({ qr_code_url: urlData.publicUrl })
      .eq('id', pet.id);

    console.log(`Success! Tag created for ${email} with slug ${slug}`);

    return NextResponse.json({ message: 'Tag processed successfully' }, { status: 200 });

  } catch (error) {
    console.error('Error in process:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}