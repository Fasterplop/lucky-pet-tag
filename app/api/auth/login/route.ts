import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

export async function POST(request: Request) {
  try {
    // 1. Recibimos correo y contraseña
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Correo y contraseña son obligatorios' }, { status: 400 });
    }

    console.log(`Intentando iniciar sesión con: ${email}`);

    // 2. Intentamos abrir la puerta con Supabase Auth
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    // 3. Manejo de errores (Contraseña equivocada o correo no registrado)
    if (signInError) {
      return NextResponse.json({ 
        error: 'Correo o contraseña incorrectos. Si es tu primera vez aquí, ve a "Crear mi cuenta".' 
      }, { status: 401 }); // 401 significa "No Autorizado"
    }

    // 4. ¡Entró correctamente!
    // Supabase nos devuelve un "session token" (un gafete de visitante VIP) que el frontend usará
    return NextResponse.json({ 
      message: 'Inicio de sesión exitoso',
      session: data.session 
    }, { status: 200 });

  } catch (error) {
    console.error('Error general en login:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}