'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  userId: string
  currentPhone?: string
  phoneVerified?: boolean
  onVerified?: () => void
}

export default function OTPVerification({ userId, currentPhone, phoneVerified, onVerified }: Props) {
  const [phone, setPhone] = useState(currentPhone || '')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [step, setStep] = useState<'input' | 'otp' | 'done'>('input')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (phoneVerified) setStep('done')
  }, [phoneVerified])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  async function sendOTP() {
    if (phone.length < 10) { setError('Số điện thoại không hợp lệ'); return }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, phone }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setStep('otp')
      setCountdown(60)
      if (data.debug_code) console.log('[OTP Debug]', data.debug_code)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  async function verifyOTP() {
    const code = otp.join('')
    if (code.length !== 6) { setError('Nhập đủ 6 số'); return }
    setVerifying(true)
    setError('')
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, phone, otp_code: code }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setStep('done')
      onVerified?.()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setVerifying(false)
    }
  }

  const handleOtpInput = (index: number, value: string) => {
    if (!/^\d$/.test(value) && value !== '') return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
    if (index === 5 && value) setTimeout(verifyOTP, 300)
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  if (step === 'done') {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
        <span>✅</span>
        <span>Số điện thoại đã xác thực</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-900">
        {step === 'input' ? '📱 Xác thực số điện thoại' : 'Nhập mã OTP'}
      </p>

      {step === 'input' ? (
        <div className="flex gap-2">
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="Số điện thoại" maxLength={11}
            className="flex-1 px-3 py-2 border rounded-lg text-sm" />
          <button onClick={sendOTP} disabled={sending || phone.length < 10}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap">
            {sending ? 'Đang gửi...' : 'Gửi mã'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Mã OTP đã gửi đến <strong>{phone}</strong></p>
          <div className="flex gap-2 justify-center">
            {otp.map((digit, i) => (
              <input key={i} ref={el => { inputRefs.current[i] = el }}
                type="text" inputMode="numeric" maxLength={1} value={digit}
                onChange={e => handleOtpInput(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                className="w-10 h-12 text-center text-lg font-bold border rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            ))}
          </div>
          <div className="flex justify-between items-center">
            {countdown > 0 ? (
              <span className="text-xs text-gray-400">Gửi lại sau {countdown}s</span>
            ) : (
              <button onClick={sendOTP} className="text-xs text-blue-600 hover:underline">Gửi lại mã</button>
            )}
            <button onClick={verifyOTP} disabled={verifying || otp.join('').length !== 6}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {verifying ? '...' : 'Xác nhận'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
