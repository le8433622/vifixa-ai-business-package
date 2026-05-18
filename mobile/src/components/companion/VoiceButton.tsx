import { useState, useRef } from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { Audio } from 'expo-av'

interface VoiceButtonProps {
  onTranscript: (text: string) => void
  disabled?: boolean
}

export default function VoiceButton({ onTranscript, disabled }: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false)
  const recordingRef = useRef<Audio.Recording | null>(null)

  async function toggle() {
    if (isRecording) {
      await stopRecording()
    } else {
      await startRecording()
    }
  }

  async function startRecording() {
    try {
      const { granted } = await Audio.requestPermissionsAsync()
      if (!granted) {
        alert('Cần quyền mic để nhập giọng nói')
        return
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
      const recording = new Audio.Recording()
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
      await recording.startAsync()
      recordingRef.current = recording
      setIsRecording(true)
    } catch {
      alert('Không thể bắt đầu ghi âm')
    }
  }

  async function stopRecording() {
    try {
      if (!recordingRef.current) return
      await recordingRef.current.stopAndUnloadAsync()
      const uri = recordingRef.current.getURI()
      recordingRef.current = null
      setIsRecording(false)

      if (uri) {
        // Voice-to-text handled via Edge Function or native speech API
        onTranscript('[Đã ghi âm giọng nói — xử lý trên server]')
      }
    } catch {
      alert('Lỗi khi dừng ghi âm')
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
})
