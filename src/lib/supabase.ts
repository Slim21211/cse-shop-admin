import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://wjjwuljhrjxpqytsbstd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqand1bGpocmp4cHF5dHNic3RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5MjcxNzUsImV4cCI6MjA2NjUwMzE3NX0.-qsrGWDUtrFXwXO6ZhvcSENUt12rkBEmsUOybsyCq24'
)
