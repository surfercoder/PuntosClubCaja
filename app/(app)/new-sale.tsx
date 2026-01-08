import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';

type ActiveOffer = {
  id: number;
  display_name: string;
  description: string;
  display_icon: string;
  display_color: string;
  config: { points_per_dollar?: number; percentage?: number };
};

export default function NewSaleScreen() {
  const params = useLocalSearchParams<{
    beneficiaryId: string;
    beneficiaryName: string;
    beneficiaryEmail: string;
    availablePoints: string;
  }>();

  const { appUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [calculatedPoints, setCalculatedPoints] = useState<number | null>(null);
  const [activeOffers, setActiveOffers] = useState<ActiveOffer[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);

  const fetchActiveOffers = useCallback(async () => {
    try {
      // Get the cashier's branch
      const { data: branchData } = await supabase
        .from('branch')
        .select('id')
        .eq('organization_id', appUser?.organization_id || 0)
        .limit(1)
        .single();

      const { data, error } = await supabase.rpc('get_active_offers', {
        p_organization_id: appUser?.organization_id ? parseInt(appUser.organization_id) : null,
        p_branch_id: branchData?.id || null,
        p_check_time: new Date().toISOString(),
      });

      if (!error && data) {
        setActiveOffers(data);
      }
    } catch {
      // Silent error handling
    }
  }, [appUser?.organization_id]);

  const calculatePoints = useCallback(async (purchaseAmount: number) => {
    setCalculating(true);
    try {
      // Get the cashier's branch
      const { data: branchData } = await supabase
        .from('branch')
        .select('id')
        .eq('organization_id', appUser?.organization_id || 0)
        .limit(1)
        .single();

      const { data, error } = await supabase.rpc('calculate_points_for_amount', {
        p_amount: purchaseAmount,
        p_organization_id: appUser?.organization_id ? parseInt(appUser.organization_id) : null,
        p_branch_id: branchData?.id || null,
        p_category_id: null,
        p_purchase_time: new Date().toISOString(),
      });

      if (!error) {
        setCalculatedPoints(data || 0);
      }
    } catch {
      // Silent error handling
    } finally {
      setCalculating(false);
    }
  }, [appUser?.organization_id]);

  useEffect(() => {
    fetchActiveOffers();
  }, [fetchActiveOffers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (amount && parseFloat(amount) > 0) {
        calculatePoints(parseFloat(amount));
      } else {
        setCalculatedPoints(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [amount, calculatePoints]);

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Por favor ingresa un monto valido');
      return;
    }

    if (!params.beneficiaryId || !appUser?.organization_id) {
      Alert.alert('Error', 'Datos incompletos. Por favor escanea al cliente nuevamente.');
      return;
    }

    setLoading(true);
    try {
      const purchaseAmount = parseFloat(amount);

      // First, get the cashier's branch (use the first branch of the org)
      const { data: branchData, error: branchError } = await supabase
        .from('branch')
        .select('id')
        .eq('organization_id', appUser.organization_id)
        .limit(1)
        .single();

      if (branchError && branchError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned", which we'll handle
        throw branchError;
      }

      // Get the calculated points using the branch_id
      const { data: pointsData, error: pointsError } = await supabase.rpc('calculate_points_for_amount', {
        p_amount: purchaseAmount,
        p_organization_id: parseInt(appUser.organization_id),
        p_branch_id: branchData?.id || null,
        p_category_id: null,
        p_purchase_time: new Date().toISOString(),
      });

      if (pointsError) {
        throw pointsError;
      }

      const pointsEarned = pointsData || 0;

      // Create the purchase - the trigger will update beneficiary_organization points
      const { error: purchaseError } = await supabase
        .from('purchase')
        .insert({
          beneficiary_id: parseInt(params.beneficiaryId),
          cashier_id: parseInt(appUser.id),
          branch_id: branchData?.id || null,
          organization_id: parseInt(appUser.organization_id),
          total_amount: purchaseAmount,
          points_earned: pointsEarned,
          notes: `Venta desde app caja`,
        });

      if (purchaseError) {
        throw purchaseError;
      }

      // Show success
      setEarnedPoints(pointsEarned);
      setShowSuccess(true);

    } catch {
      Alert.alert('Error', 'No se pudo registrar la venta. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    router.replace('/(app)');
  };

  const handleScanAnother = () => {
    router.replace('/(app)/scanner');
  };

  if (showSuccess) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Venta Registrada',
            headerStyle: { backgroundColor: '#059669' },
            headerTintColor: '#FFFFFF',
            headerLeft: () => null,
          }}
        />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color="#059669" />
          </View>
          <Text style={styles.successTitle}>Venta Exitosa!</Text>
          <Text style={styles.successCustomer}>{params.beneficiaryName}</Text>

          <View style={styles.pointsEarnedCard}>
            <Text style={styles.pointsEarnedLabel}>Puntos ganados</Text>
            <Text style={styles.pointsEarnedValue}>{earnedPoints.toLocaleString()}</Text>
          </View>

          <View style={styles.purchaseDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Monto de compra</Text>
              <Text style={styles.detailValue}>${parseFloat(amount).toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.successActions}>
            <TouchableOpacity style={styles.scanAnotherButton} onPress={handleScanAnother}>
              <Ionicons name="qr-code" size={20} color="#059669" />
              <Text style={styles.scanAnotherText}>Escanear Otro</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
              <Text style={styles.doneText}>Finalizar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Nueva Venta',
          headerStyle: { backgroundColor: '#059669' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Customer Info */}
          <View style={styles.customerCard}>
            <View style={styles.customerIcon}>
              <Ionicons name="person-circle" size={48} color="#059669" />
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{params.beneficiaryName || 'Cliente'}</Text>
              <Text style={styles.customerEmail}>{params.beneficiaryEmail}</Text>
              <View style={styles.currentPointsBadge}>
                <Text style={styles.currentPointsText}>
                  {parseInt(params.availablePoints || '0').toLocaleString()} pts actuales
                </Text>
              </View>
            </View>
          </View>

          {/* Active Offers */}
          {activeOffers.length > 0 && (
            <View style={styles.offersCard}>
              <Text style={styles.offersTitle}>Ofertas Activas</Text>
              {activeOffers.map((offer) => (
                <View key={offer.id} style={styles.offerItem}>
                  <Text style={styles.offerIcon}>{offer.display_icon || '🎉'}</Text>
                  <View style={styles.offerInfo}>
                    <Text style={styles.offerName}>{offer.display_name}</Text>
                    <Text style={styles.offerDesc}>{offer.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Amount Input */}
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Monto de la compra</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
                autoFocus
              />
            </View>
          </View>

          {/* Points Preview */}
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Puntos a ganar</Text>
            {calculating ? (
              <ActivityIndicator size="small" color="#059669" />
            ) : (
              <Text style={styles.previewValue}>
                {calculatedPoints !== null ? calculatedPoints.toLocaleString() : '-'}
              </Text>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, (!amount || loading) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!amount || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text style={styles.submitText}>Registrar Venta</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 16,
  },
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerIcon: {
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  customerEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  currentPointsBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  currentPointsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  offersCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  offersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 12,
  },
  offerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  offerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  offerInfo: {
    flex: 1,
  },
  offerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  offerDesc: {
    fontSize: 12,
    color: '#B45309',
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#111827',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 48,
    fontWeight: 'bold',
    color: '#111827',
    padding: 0,
  },
  previewCard: {
    backgroundColor: '#059669',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    color: '#D1FAE5',
    marginBottom: 8,
  },
  previewValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
  // Success styles
  successContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  successCustomer: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 24,
  },
  pointsEarnedCard: {
    backgroundColor: '#059669',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 48,
    alignItems: 'center',
    marginBottom: 24,
  },
  pointsEarnedLabel: {
    fontSize: 14,
    color: '#D1FAE5',
    marginBottom: 8,
  },
  pointsEarnedValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  purchaseDetails: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  successActions: {
    width: '100%',
    gap: 12,
  },
  scanAnotherButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#059669',
  },
  scanAnotherText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 8,
  },
  doneButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
