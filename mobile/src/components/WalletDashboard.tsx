import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, Modal, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

const PRESET_AMOUNTS = [100000, 200000, 500000, 1000000, 2000000];
const GATEWAYS = [
  { id: 'vnpay', name: 'VNPay', icon: '💳' },
  { id: 'stripe', name: 'Stripe', icon: '💳' },
  { id: 'mock', name: 'Test', icon: '🧪' },
];

export default function WalletDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState(100000);
  const [gateway, setGateway] = useState('mock');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/wallet-manager`, {
      method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'balance' }),
    });
    const result = await res.json();
    if (result.wallets) setData(result);
    setLoading(false);
  }

  async function handleDeposit() {
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${SUPABASE_URL}/functions/v1/wallet-manager`, {
      method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deposit', amount, gateway }),
    });
    setSubmitting(false);
    setShowDeposit(false);
    Alert.alert('✅', 'Nạp tiền thành công');
    load();
  }

  async function handleWithdraw() {
    if (amount < 50000) { Alert.alert('Lỗi', 'Tối thiểu 50,000₫'); return; }
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${SUPABASE_URL}/functions/v1/wallet-manager`, {
      method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'withdraw', amount, walletType: 'txn' }),
    });
    setSubmitting(false);
    setShowWithdraw(false);
    Alert.alert('✅', 'Rút tiền thành công');
    load();
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;

  const wallets = data?.wallets || { txn: 0, stake: 0, reward: 0, treasury: 0 };
  const vfc = data?.vfc || { balance: 0, tier: 'bronze' };

  return (
    <View style={styles.container}>
      {/* 4 Wallet Cards */}
      <View style={styles.grid}>
        <WalletCard name="Giao dịch" value={wallets.txn} icon="💳" color="#3b82f6" />
        <WalletCard name="Đầu tư" value={wallets.stake} icon="🏦" color="#059669" />
        <WalletCard name="Thưởng" value={wallets.reward} icon="🎁" color="#d97706" suffix="VFC" />
        <WalletCard name="Kho bạc" value={wallets.treasury} icon="🏛️" color="#7c3aed" />
      </View>

      {/* VFC Points */}
      <View style={styles.vfcCard}>
        <View style={styles.vfcRow}>
          <Text style={styles.vfcLabel}>⭐ VFC Points</Text>
          <Text style={[styles.vfcBadge, { 
            color: vfc.tier === 'diamond' ? '#22d3ee' : vfc.tier === 'gold' ? '#f59e0b' : vfc.tier === 'silver' ? '#9ca3af' : '#ea580c'
          }]}>{vfc.tier}</Text>
        </View>
        <Text style={styles.vfcValue}>{vfc.balance.toLocaleString()} VFC</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.depositBtn} onPress={() => setShowDeposit(true)}>
          <Text style={styles.actionText}>💳 Nạp tiền</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.withdrawBtn} onPress={() => setShowWithdraw(true)}>
          <Text style={[styles.actionText, { color: '#059669' }]}>💰 Rút tiền</Text>
        </TouchableOpacity>
      </View>

      {/* Deposit Modal */}
      <Modal visible={showDeposit} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>💳 Nạp tiền</Text>
            <ScrollView horizontal style={styles.amountRow}>
              {PRESET_AMOUNTS.map(a => (
                <TouchableOpacity key={a} onPress={() => setAmount(a)}
                  style={[styles.amountChip, amount === a && styles.amountChipActive]}>
                  <Text style={[styles.amountText, amount === a && styles.amountTextActive]}>{(a/1000).toFixed(0)}k</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput value={String(amount)} onChangeText={v => setAmount(Number(v) || 0)}
              style={styles.input} keyboardType="numeric" />
            <View style={styles.gatewayRow}>
              {GATEWAYS.map(g => (
                <TouchableOpacity key={g.id} onPress={() => setGateway(g.id)}
                  style={[styles.gatewayChip, gateway === g.id && styles.gatewayChipActive]}>
                  <Text style={styles.gatewayText}>{g.icon} {g.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowDeposit(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeposit} disabled={submitting} style={styles.confirmBtn}>
                <Text style={styles.confirmText}>{submitting ? '...' : `Nạp ${amount.toLocaleString()}₫`}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Withdraw Modal */}
      <Modal visible={showWithdraw} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>💰 Rút tiền</Text>
            <Text style={styles.hint}>Phí 2% · Tối thiểu 50,000₫</Text>
            <TextInput value={String(amount)} onChangeText={v => setAmount(Number(v) || 0)}
              style={styles.input} keyboardType="numeric" placeholder="Số tiền rút" />
            {amount >= 50000 && (
              <View style={styles.feePreview}>
                <Text style={styles.feeText}>Phí: {Math.round(amount * 0.02).toLocaleString()}₫</Text>
                <Text style={styles.feeText}>Nhận: {(amount - Math.round(amount * 0.02)).toLocaleString()}₫</Text>
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowWithdraw(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleWithdraw} disabled={submitting || amount < 50000} style={styles.confirmBtn}>
                <Text style={styles.confirmText}>{submitting ? '...' : 'Rút tiền'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function WalletCard({ name, value, icon, color, suffix = '₫' }: { name: string; value: number; icon: string; color: string; suffix?: string }) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <Text style={styles.cardIcon}>{icon}</Text>
      <Text style={styles.cardValue}>{value.toLocaleString()}{suffix}</Text>
      <Text style={styles.cardLabel}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { padding: 40, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { width: '48%', backgroundColor: 'white', padding: 12, borderRadius: 12, borderLeftWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  cardIcon: { fontSize: 20, marginBottom: 4 },
  cardValue: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  cardLabel: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  vfcCard: { backgroundColor: 'white', padding: 16, borderRadius: 12, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  vfcRow: { flexDirection: 'row', justifyContent: 'space-between' },
  vfcLabel: { fontSize: 14, fontWeight: '600' },
  vfcBadge: { fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
  vfcValue: { fontSize: 22, fontWeight: 'bold', color: '#d97706', marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  depositBtn: { flex: 1, backgroundColor: '#3b82f6', padding: 14, borderRadius: 12, alignItems: 'center' },
  withdrawBtn: { flex: 1, borderWidth: 1, borderColor: '#059669', padding: 14, borderRadius: 12, alignItems: 'center' },
  actionText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '70%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  amountRow: { flexDirection: 'row', marginBottom: 12 },
  amountChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', marginRight: 8 },
  amountChipActive: { backgroundColor: '#3b82f6' },
  amountText: { fontSize: 14, color: '#374151' },
  amountTextActive: { color: 'white' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 },
  gatewayRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  gatewayChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f3f4f6' },
  gatewayChipActive: { backgroundColor: '#dbeafe' },
  gatewayText: { fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#f3f4f6' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  confirmBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#3b82f6' },
  confirmText: { fontSize: 14, fontWeight: 'bold', color: 'white' },
  hint: { fontSize: 12, color: '#9ca3af', marginBottom: 12 },
  feePreview: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8, marginBottom: 12 },
  feeText: { fontSize: 13, color: '#374151', marginBottom: 2 },
});
