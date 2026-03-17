import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/crypto';
import { getUserById, addPaidCredits } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = verifyToken(token);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const user = getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        freeQuota: user.free_quota,
        paidCredits: user.paid_credits,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Error getting user:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = verifyToken(token);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const { credits } = await request.json();
    
    if (!credits || credits <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid credits amount' },
        { status: 400 }
      );
    }

    const success = addPaidCredits(userId, credits);
    if (!success) {
      return NextResponse.json(
        { success: false, message: 'Failed to add credits' },
        { status: 500 }
      );
    }

    const user = getUserById(userId);
    return NextResponse.json({
      success: true,
      user: {
        id: user!.id,
        email: user!.email,
        freeQuota: user!.free_quota,
        paidCredits: user!.paid_credits,
        createdAt: user!.created_at,
      },
    });
  } catch (error) {
    console.error('Error adding credits:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
