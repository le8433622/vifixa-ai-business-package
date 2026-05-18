import { useState, useEffect, useCallback } from 'react'
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native'
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice'

interface VoiceButtonProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}

export default function VoiceButton({ onTranscript, disabled }: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState('')

  const onSpeechResults = useCallback((e: SpeechResultsEvent) => {
    const transcript = e.value?.[0]
    if (transcript) {
      onTranscript(transcript)
    }
  }, [onTranscript])

  const onSpeechError = useCallback((e: SpeechErrorEvent) => {
    const msg = e.error?.message || 'Lỗi nhận dạng giọng nói'
    setError(msg)
    setIsRecording(false)
  }, [])

  useEffect(() => {
    Voice.onSpeechResults = onSpeechResults
    Voice.onSpeechError = onSpeechError
    return () => {
      Voice.destroy().then(() => Voice.removeAllListeners())
    }
  }, [onSpeechResults, onSpeechError])

  async function toggle() {
    if (isRecording) {
      await stopRecognition()
    } else {
      await startRecognition()
    }
  }

  async function startRecognition() {
    try {
      setError('')
      const available = await Voice.isAvailable()
      if (!available) {
        alert('Thiết bị không hỗ trợ nhận dạng giọng nói')
        return
      }
      await Voice.start('vi-VN')
      setIsRecording(true)
    } catch {
      alert('Không thể bắt đầu nhận dạng giọng nói')
    }
  }

  async function stopRecognition() {
    try {
      await Voice.stop()
      setIsRecording(false)
    } catch {
      setIsRecording(false)
    }
  }

  return (
    <TouchableOpacity
      onPress={toggle}
      disabled={disabled}
      style={[styles.button, isRecording && styles.recording]}
    >
      <Text style={[styles.icon, isRecording && styles.iconActive]}>
        {isRecording ? '🔴' : '🎤'}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  recording: {
    backgroundColor: '#fce4ec',
  },
  icon: {
    fontSize: 18,
  },
  iconActive: {
    color: '#e53935',
  },
  error: {
    position: 'absolute',
    bottom: -16,
    fontSize: 10,
    color: '#e53935',
    width: 80,
    textAlign: 'center',
  },
})
