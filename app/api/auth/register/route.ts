import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { supabaseAdmin } from '../../../../lib/supabase-admin';


export async function POST(request: Request) {
  try {
    // 1. Recibimos el correo y la contraseña que el usuario escribió
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Correo y contraseña son obligatorios' }, { status: 400 });
    }

    console.log(`Intentando registrar cuenta para: ${email}`);

    // 2. SEGURIDAD: Verificamos que este correo realmente haya hecho una compra en Shopify
    const { data: owner, error: searchError } = await supabaseAdmin
      .from('owners')
      .select('id')
      .eq('email', email)
      .single();

    if (!owner || searchError) {
      return NextResponse.json({ 
        error: 'No encontramos una compra asociada a este correo. Asegúrate de usar el mismo correo con el que compraste en Shopify.' 
      }, { status: 403 }); // 403 significa "Prohibido"
    }

    // 3. Si el correo es válido, creamos su usuario seguro en Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (signUpError) {
      console.error('Error de Supabase Auth:', signUpError.message);
      return NextResponse.json({ error: 'Hubo un problema al crear tu cuenta. ' + signUpError.message }, { status: 500 });
    }

    // 4. ¡Éxito!
    return NextResponse.json({ message: 'Cuenta creada con éxito. Ya puedes configurar el perfil de tu mascota.' }, { status: 200 });

  } catch (error) {
    console.error('Error general en registro:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}