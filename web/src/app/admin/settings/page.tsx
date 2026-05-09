// Settings Index Page - Redirect to General
// Per Step 2: Admin Settings UI

import { redirect } from 'next/navigation'

export default function SettingsIndex() {
  redirect('/admin/settings/general')
}
