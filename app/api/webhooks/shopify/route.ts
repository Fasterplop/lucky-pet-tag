import { NextResponse } from 'next/server';
import crypto from 'crypto';
import QRCode from 'qrcode';
import {
  parsePhoneNumberFromString,
  CountryCode,
} from 'libphonenumber-js';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

const SMART_PET_TAG_TYPE = 'Smart Pet Tag';

const generateUniqueSlug = () => Math.random().toString(36).substring(2, 8);

let shopifyTokenCache: {
  accessToken: string;
  expiresAt: number;
} | null = null;

function normalizePhoneForWhatsApp(
  rawPhone?: string,
  countryCode?: string | null
) {
  if (!rawPhone) return '';

  const cleanedCountry = (countryCode || '').toUpperCase();

  const parsed =
    (cleanedCountry
      ? parsePhoneNumberFromString(rawPhone, cleanedCountry as CountryCode)
      : undefined) || parsePhoneNumberFromString(rawPhone);

  if (!parsed || !parsed.isValid()) {
    console.warn('Could not normalize phone number:', {
      rawPhone,
      countryCode,
    });
    return rawPhone.replace(/\D/g, '');
  }

  return parsed.number.replace('+', '');
}

function normalizeShopifyDomain(domain?: string | null) {
  if (!domain) return '';

  return domain
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .trim()
    .toLowerCase();
}

function isSmartPetTagType(productType?: string | null) {
  return (
    (productType || '').trim().toLowerCase() ===
    SMART_PET_TAG_TYPE.toLowerCase()
  );
}

function verifyShopifyWebhook(rawBody: string, signature: string, secret: string) {
  const digest = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');

  const digestBuffer = Buffer.from(digest, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
}

async function getShopifyAdminAccessToken() {
  const shop = normalizeShopifyDomain(process.env.SHOPIFY_STORE_DOMAIN);
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (!shop || !clientId || !clientSecret) {
    throw new Error(
      'Missing SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID, or SHOPIFY_CLIENT_SECRET'
    );
  }

  if (shopifyTokenCache && shopifyTokenCache.expiresAt > Date.now()) {
    return shopifyTokenCache.accessToken;
  }

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to get Shopify token: ${response.status} ${await response.text()}`
    );
  }

  const json: {
    access_token?: string;
    expires_in?: number;
    scope?: string;
  } = await response.json();

  if (!json.access_token) {
    throw new Error('Shopify token response did not include access_token');
  }

  const expiresInSeconds =
    typeof json.expires_in === 'number' ? json.expires_in : 3600;

  shopifyTokenCache = {
    accessToken: json.access_token,
    expiresAt: Date.now() + Math.max(60, expiresInSeconds - 60) * 1000,
  };

  return json.access_token;
}

async function getShopifyProductType(productId?: number | null) {
  if (!productId) return null;

  const shop = normalizeShopifyDomain(process.env.SHOPIFY_STORE_DOMAIN);
  if (!shop) {
    console.warn('Missing SHOPIFY_STORE_DOMAIN');
    return null;
  }

  try {
    const token = await getShopifyAdminAccessToken();

    const query = `
      query ProductType($id: ID!) {
        product(id: $id) {
          productType
          title
        }
      }
    `;

    const response = await fetch(`https://${shop}/admin/api/2026-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({
        query,
        variables: {
          id: `gid://shopify/Product/${productId}`,
        },
      }),
    });

    if (!response.ok) {
      console.error(
        'Shopify product lookup failed:',
        response.status,
        await response.text()
      );
      return null;
    }

    const json = await response.json();

    if (json?.errors) {
      console.error('Shopify GraphQL errors:', json.errors);
      return null;
    }

    return json?.data?.product?.productType ?? null;
  } catch (error) {
    console.error('Error fetching Shopify product type:', error);
    return null;
  }
}

async function ensureQrForPet(petId: number, slug: string) {
  const qrBaseUrl =
    process.env.NEXT_PUBLIC_PUBLIC_PET_PROFILE_BASE_URL ||
    'https://luckypetag.com/id';

  const publicProfileUrl = `${qrBaseUrl}/${slug}`;
  const qrBuffer = await QRCode.toBuffer(publicProfileUrl);
  const fileName = `Order_QR_${slug}.png`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('lucky-pet-assets')
    .upload(fileName, qrBuffer, {
      contentType: 'image/png',
    });

  if (
    uploadError &&
    !uploadError.message?.toLowerCase().includes('already exists')
  ) {
    throw new Error('Error uploading QR to Supabase: ' + uploadError.message);
  }

  const { data: urlData } = supabaseAdmin.storage
    .from('lucky-pet-assets')
    .getPublicUrl(fileName);

  const { error: updatePetError } = await supabaseAdmin
    .from('pets')
    .update({ qr_code_url: urlData.publicUrl })
    .eq('id', petId);

  if (updatePetError) {
    throw new Error('Error saving QR URL to pet: ' + updatePetError.message);
  }

  return urlData.publicUrl;
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-shopify-hmac-sha256') || '';
    const webhookSecret =
      process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_CLIENT_SECRET;

    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'Missing SHOPIFY_WEBHOOK_SECRET or SHOPIFY_CLIENT_SECRET' },
        { status: 500 }
      );
    }

    if (!verifyShopifyWebhook(rawBody, signature, webhookSecret)) {
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
      customer.first_name ||
      shipping.first_name ||
      billing.first_name ||
      '';

    const lastName =
      customer.last_name ||
      shipping.last_name ||
      billing.last_name ||
      '';

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

    const orderId = typeof body.id === 'number' ? body.id : null;
    const orderName = typeof body.name === 'string' ? body.name : null;
    const lineItems = Array.isArray(body.line_items) ? body.line_items : [];

    console.log(`Processing order for: ${email} (${fullName})`, {
      orderId,
      orderName,
      rawPhone,
      countryCode,
      whatsappPhone,
      lineItemsCount: lineItems.length,
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
          throw new Error(
            'Error updating owner: ' + updateOwnerError.message
          );
        }
      }
    }

    if (!owner) {
      throw new Error('Could not establish owner');
    }

    let createdCount = 0;
    let recoveredCount = 0;
    let skippedCount = 0;

    for (const lineItem of lineItems) {
      const productId =
        typeof lineItem?.product_id === 'number' ? lineItem.product_id : null;

      const variantId =
        typeof lineItem?.variant_id === 'number' ? lineItem.variant_id : null;

      const lineItemId =
        typeof lineItem?.id === 'number' ? lineItem.id : null;

      const quantity = Math.max(1, Number(lineItem?.quantity || 1));

      const productTitle =
        typeof lineItem?.title === 'string' ? lineItem.title : null;

      const variantTitle =
        typeof lineItem?.variant_title === 'string'
          ? lineItem.variant_title
          : null;

      if (!orderId || !lineItemId) {
        console.warn('Skipping line item because orderId or lineItemId is missing', {
          orderId,
          lineItemId,
          productId,
          quantity,
        });
        skippedCount += quantity;
        continue;
      }

      const shopifyProductType = await getShopifyProductType(productId);

      console.log('Inspecting line item', {
        lineItemId,
        quantity,
        productId,
        variantId,
        productTitle,
        variantTitle,
        shopifyProductType,
      });

      if (!isSmartPetTagType(shopifyProductType)) {
        skippedCount += quantity;
        continue;
      }

      for (let unitIndex = 1; unitIndex <= quantity; unitIndex++) {
        const { data: existingPet, error: existingPetError } =
          await supabaseAdmin
            .from('pets')
            .select('id, slug, qr_code_url')
            .match({
              shopify_order_id: orderId,
              shopify_line_item_id: lineItemId,
              shopify_quantity_index: unitIndex,
            })
            .maybeSingle();

        if (existingPetError) {
          throw new Error(
            'Error checking existing pet: ' + existingPetError.message
          );
        }

        if (existingPet) {
          if (!existingPet.qr_code_url) {
            await ensureQrForPet(existingPet.id, existingPet.slug);
            recoveredCount += 1;
          }
          continue;
        }

        const slug = generateUniqueSlug();

        const { data: pet, error: petError } = await supabaseAdmin
          .from('pets')
          .insert([
            {
              owner_id: owner.id,
              slug,
              pet_name: 'New Pet',
              shopify_order_id: orderId,
              shopify_order_name: orderName,
              shopify_line_item_id: lineItemId,
              shopify_quantity_index: unitIndex,
              shopify_product_id: productId,
              shopify_variant_id: variantId,
              shopify_product_title: productTitle,
              shopify_variant_title: variantTitle,
              shopify_product_type: shopifyProductType,
            },
          ])
          .select()
          .single();

        if (petError) {
          throw new Error('Error creating pet profile: ' + petError.message);
        }

        await ensureQrForPet(pet.id, slug);
        createdCount += 1;

        console.log(
          `Success! Tag created for ${email} with slug ${slug} (unit ${unitIndex}/${quantity})`
        );
      }
    }

    if (createdCount === 0 && recoveredCount === 0) {
      return NextResponse.json(
        {
          message: 'No Smart Pet Tag items found in order',
          skippedCount,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        message: 'Tag(s) processed successfully',
        createdCount,
        recoveredCount,
        skippedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in process:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}