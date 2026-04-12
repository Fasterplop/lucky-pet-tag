import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAuthorizedSupabaseClient(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    }
  );
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ petId: string }> }
) {
  try {
    const supabase = getAuthorizedSupabaseClient(request);

    if (!supabase) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { petId } = await context.params;
    const body = await request.json();
    const { isLostModeActive } = body as { isLostModeActive?: boolean };

    if (typeof isLostModeActive !== 'boolean') {
      return NextResponse.json(
        { error: 'isLostModeActive must be a boolean.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('pets')
      .update({ is_lost_mode_active: isLostModeActive })
      .eq('id', petId)
      .select('id, is_lost_mode_active')
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to update lost mode.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      pet: data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}