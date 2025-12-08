import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../utils/supabase';

interface PurchaseFormProps {
  visible: boolean;
  onClose: () => void;
  beneficiaryEmail: string;
  beneficiaryId?: number;
  organizationId?: number;
  branchId: number;
  onPurchaseComplete: (data: any) => void;
}

export default function PurchaseForm({
  visible,
  onClose,
  beneficiaryEmail,
  beneficiaryId,
  organizationId,
  branchId,
  onPurchaseComplete,
}: PurchaseFormProps) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifiedBeneficiaryId, setVerifiedBeneficiaryId] = useState<number | null>(
    beneficiaryId || null
  );
  const [activeOffers, setActiveOffers] = useState<any[]>([]);

  // Verify beneficiary and load active offers when modal opens
  React.useEffect(() => {
    if (visible) {
      // Always verify when modal opens to ensure fresh data
      verifyBeneficiary();
      loadActiveOffers();
    } else {
      // Reset verified ID when modal closes
      setVerifiedBeneficiaryId(beneficiaryId || null);
    }
  }, [visible]);

  const verifyBeneficiary = async () => {
    try {
      console.log('Verifying beneficiary:', beneficiaryEmail);
      console.log('API URL:', process.env.EXPO_PUBLIC_API_URL);
      
      // Get the current user's session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        Alert.alert('Error', 'Not authenticated. Please log in again.');
        onClose();
        return;
      }
      
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/beneficiary/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ email: beneficiaryEmail }),
        }
      );

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);

      if (result.success && result.data) {
        console.log('Beneficiary verified, ID:', result.data.id);
        setVerifiedBeneficiaryId(result.data.id);
      } else {
        console.error('Verification failed:', result);
        Alert.alert('Error', result.error || 'Could not verify customer');
        onClose();
      }
    } catch (error) {
      console.error('Error verifying beneficiary:', error);
      Alert.alert('Error', 'Failed to verify customer');
      onClose();
    }
  };

  const loadActiveOffers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_offers', {
        p_organization_id: null,
        p_branch_id: branchId,
        p_check_time: new Date().toISOString(),
      });

      if (!error && data) {
        setActiveOffers(data);
      }
    } catch (error) {
      console.error('Error loading active offers:', error);
    }
  };

  const parseAmount = (): number => {
    const parsed = parseFloat(amount);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleSubmit = async () => {
    // Validate amount
    const totalAmount = parseAmount();
    
    if (totalAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid purchase amount');
      return;
    }

    if (!verifiedBeneficiaryId) {
      Alert.alert('Error', 'Customer not verified');
      return;
    }

    setLoading(true);

    try {
      // Get the current user's session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        Alert.alert('Error', 'Not authenticated. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/purchase/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            beneficiary_id: verifiedBeneficiaryId,
            organization_id: organizationId,
            branch_id: branchId,
            amount: totalAmount,
            notes: notes.trim() || undefined,
          }),
        }
      );

      const result = await response.json();

      if (result.success && result.data) {
        const offerInfo = activeOffers.length > 0 
          ? `\n🎁 Active Offer: ${activeOffers[0].display_name}`
          : '';
        
        Alert.alert(
          '✅ Purchase Complete!',
          `Total: $${result.data.total_amount.toFixed(2)}\n` +
            `Points Earned: ${result.data.points_earned}${offerInfo}\n` +
            `New Balance: ${result.data.beneficiary_new_balance} points`,
          [
            {
              text: 'OK',
              onPress: () => {
                onPurchaseComplete(result.data);
                resetForm();
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create purchase');
      }
    } catch (error) {
      console.error('Error creating purchase:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setNotes('');
    setVerifiedBeneficiaryId(beneficiaryId || null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>New Purchase</Text>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.closeButton}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.customerInfo}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <Text style={styles.customerEmail}>{beneficiaryEmail}</Text>
          </View>

          {activeOffers.length > 0 && (
            <View style={styles.offersSection}>
              <Text style={styles.offersBadge}>🎁 Active Offers</Text>
              {activeOffers.map((offer, idx) => (
                <View key={idx} style={styles.offerCard}>
                  <Text style={styles.offerText}>
                    {offer.display_icon} {offer.display_name}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Purchase Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />
            </View>
            <Text style={styles.helperText}>
              Enter the total purchase amount
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Add any notes about this purchase..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalValue}>${parseAmount().toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Complete Purchase</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  customerInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customerEmail: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    marginTop: 4,
  },
  offersSection: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  offersBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 8,
  },
  offerCard: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  offerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: '#3B82F6',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    padding: 12,
  },
  helperText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 12,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  totalSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
