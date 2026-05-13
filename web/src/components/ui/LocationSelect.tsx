'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Division {
  code: string
  name: string
  name_short: string
  type: string
  parent_code: string | null
}

interface LocationSelectProps {
  value?: { province: string; district: string; ward: string }
  onChange: (value: { province: string; district: string; ward: string; province_name?: string; district_name?: string; ward_name?: string }) => void
  showWard?: boolean
  placeholder?: string
  disabled?: boolean
}

export default function LocationSelect({ value, onChange, showWard = true, disabled }: LocationSelectProps) {
  const [provinces, setProvinces] = useState<Division[]>([])
  const [districts, setDistricts] = useState<Division[]>([])
  const [wards, setWards] = useState<Division[]>([])
  const [province, setProvince] = useState(value?.province || '')
  const [district, setDistrict] = useState(value?.district || '')
  const [ward, setWard] = useState(value?.ward || '')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('vietnam_administrative_divisions')
          .select('code, name, name_short, type, parent_code')
          .eq('type', 'province')
          .eq('is_active', true)
          .order('name')
        if (!error) setProvinces(data || [])
      } catch (err) {
        console.error('Failed to fetch provinces:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (!province) return
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('vietnam_administrative_divisions')
          .select('code, name, name_short, type, parent_code')
          .eq('type', 'district')
          .eq('parent_code', province)
          .eq('is_active', true)
          .order('name')
        if (!error) setDistricts(data || [])
      } catch (err) {
        console.error('Failed to fetch districts:', err)
      }
    })()
  }, [province])

  useEffect(() => {
    if (!district || !showWard) return
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('vietnam_administrative_divisions')
          .select('code, name, name_short, type, parent_code')
          .eq('type', 'ward')
          .eq('parent_code', district)
          .eq('is_active', true)
          .order('name')
        if (!error) setWards(data || [])
      } catch (err) {
        console.error('Failed to fetch wards:', err)
      }
    })()
  }, [district, showWard])

  function handleProvinceChange(code: string) {
    setProvince(code)
    setDistrict('')
    setWard('')
    setDistricts([])
    setWards([])
    const p = provinces.find(x => x.code === code)
    onChange({
      province: code,
      province_name: p?.name_short || p?.name || '',
      district: '',
      ward: '',
    })
  }

  function handleDistrictChange(code: string) {
    setDistrict(code)
    setWard('')
    setWards([])
    const d = districts.find(x => x.code === code)
    onChange({
      province,
      province_name: provinces.find(x => x.code === province)?.name_short || '',
      district: code,
      district_name: d?.name || '',
      ward: '',
    })
  }

  function handleWardChange(code: string) {
    setWard(code)
    const w = wards.find(x => x.code === code)
    onChange({
      province,
      province_name: provinces.find(x => x.code === province)?.name_short || '',
      district,
      district_name: districts.find(x => x.code === district)?.name || '',
      ward: code,
      ward_name: w?.name || '',
    })
  }

  if (loading) {
    return <div className="h-10 bg-gray-100 rounded animate-pulse" />
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh/Thành phố</label>
        <select
          value={province}
          onChange={(e) => handleProvinceChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        >
          <option value="">-- Chọn Tỉnh/Thành phố --</option>
          {provinces.map((p) => (
            <option key={p.code} value={p.code}>{p.name_short}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Quận/Huyện</label>
        <select
          value={district}
          onChange={(e) => handleDistrictChange(e.target.value)}
          disabled={disabled || !province}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        >
          <option value="">-- Chọn Quận/Huyện --</option>
          {districts.map((d) => (
            <option key={d.code} value={d.code}>{d.name}</option>
          ))}
        </select>
      </div>

      {showWard && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phường/Xã</label>
          <select
            value={ward}
            onChange={(e) => handleWardChange(e.target.value)}
            disabled={disabled || !district}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="">-- Chọn Phường/Xã --</option>
            {wards.map((w) => (
              <option key={w.code} value={w.code}>{w.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
