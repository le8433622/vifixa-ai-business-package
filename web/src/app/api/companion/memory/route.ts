import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Create server client
    const supabase = createServerClient()
    
    // Get the user from the session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    
    if (userError) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const requestedUserId = searchParams.get('user_id')
    const category = searchParams.get('category')

    // Verify the user can only access their own memories
    if (requestedUserId && requestedUserId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Build query
    let query = supabase
      .from('companion_memories')
      .select('key, value, category')
      .eq('user_id', user.id)

    // Filter by category if provided
    if (category) {
      query = query.eq('category', category)
    }

    // Exclude expired memories (where expires_at is in the past) unless expires_at is null
    query = query
      .is('expires_at', null)
      .or(`expires_at.gt.${new Date().toISOString()}`)

    // Order by creation time (newest first)
    query = query.order('created_at', { ascending: false })

    // Execute query
    const { data: memories, error } = await query

    if (error) {
      console.error('Error fetching memories:', error)
      return NextResponse.json(
        { error: 'Failed to fetch memories' },
        { status: 500 }
      )
    }

    // Format response as per spec
    const response = {
      memories: memories || []
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Companion memory error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Create server client
    const supabase = createServerClient()
    
    // Get the user from the session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    
    if (userError) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    let body: {
      user_id: string
      key: string
      value: string
      category: string
      importance?: number
      expires_at?: string
    }
    
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { user_id, key, value, category, importance = 1, expires_at } = body
    
    if (!user_id || !key || value === undefined || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify the user can only store their own memories
    if (user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Store the memory
    const { data, error } = await supabase
      .from('companion_memories')
      .upsert({
        user_id,
        key,
        value,
        category,
        importance,
        expires_at: expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Default 30 days
      }, { onConflict: 'user_id,key' })

    if (error) {
      console.error('Error storing memory:', error)
      return NextResponse.json(
        { error: 'Failed to store memory' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Companion memory error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}