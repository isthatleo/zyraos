import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { systemSettingsTable } from '@/lib/db-schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const settings = await db.select().from(systemSettingsTable)
    
    // Transform into a key-value object for easier consumption
    const formattedSettings = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json(formattedSettings)
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { key, value, category, description } = body

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 })
    }

    // Upsert logic
    const existing = await db
      .select()
      .from(systemSettingsTable)
      .where(eq(systemSettingsTable.key, key))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(systemSettingsTable)
        .set({ 
          value, 
          category: category || existing[0].category,
          description: description || existing[0].description,
          updatedAt: new Date() 
        })
        .where(eq(systemSettingsTable.key, key))
    } else {
      await db.insert(systemSettingsTable).values({
        id: crypto.randomUUID(),
        key,
        value,
        category: category || 'general',
        description: description || '',
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save setting:', error)
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 })
  }
}
