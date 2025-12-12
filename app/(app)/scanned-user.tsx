import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';

export default function ScannedUserScreen() {
  const params = useLocalSearchParams<{
    beneficiaryId: string;
    beneficiaryName: string;
    beneficiaryEmail: string;
    isMember: string;
    membershipId: string;
    availablePoints: string;
  }>();

  const { appUser } = useAuth();
  const [inviting, setInviting] = useState(false);
  const [hasPointsRules, setHasPointsRules] = useState(true);
  const [checkingRules, setCheckingRules] = useState(false);

  const isMember = params.isMember === 'true';
  const availablePoints = parseInt(params.availablePoints || '0', 10);

  useEffect(() => {
    if (isMember) {
      checkPointsRules();
    }
  }, [isMember]);

  const checkPointsRules = async () => {
    if (!appUser?.organization_id) return;

    setCheckingRules(true);
    try {
      // Use RPC function to properly check for rules that match the organization
      // This includes global rules (organization_id IS NULL) and org-specific rules
      const { data: rulesData, error: rulesError } = await supabase.rpc('get_active_offers', {
        p_organization_id: parseInt(appUser.organization_id),
        p_branch_id: null,
        p_check_time: new Date().toISOString(),
      });

      setHasPointsRules(!rulesError && rulesData && rulesData.length > 0);
    } catch (error) {
      console.error('Error checking points rules:', error);
      setHasPointsRules(false);
    } finally {
      setCheckingRules(false);
    }
  };

  const handleInviteUser = async () => {
    if (!params.beneficiaryId || !appUser?.organization_id) return;

    setInviting(true);
    try {
      const { error } = await supabase
        .from('beneficiary_organization')
        .insert({
          beneficiary_id: params.beneficiaryId,
          organization_id: appUser.organization_id,
          available_points: 0,
          total_points_earned: 0,
          total_points_redeemed: 0,
          is_active: true,
        });

      if (error) {
        if (error.code === '23505') {
          const { error: updateError } = await supabase
            .from('beneficiary_organization')
            .update({ is_active: true })
            .eq('beneficiary_id', params.beneficiaryId)
            .eq('organization_id', appUser.organization_id);

          if (updateError) {
            throw updateError;
          }
        } else {
          throw error;
        }
      }

      Alert.alert(
        'Usuario agregado',
        `${params.beneficiaryName} ahora es miembro de tu organizacion`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error inviting user:', error);
      Alert.alert('Error', 'No se pudo agregar al usuario');
    } finally {
      setInviting(false);
    }
  };

  const handleNewSale = () => {
    router.push({
      pathname: '/(app)/new-sale',
      params: {
        beneficiaryId: params.beneficiaryId,
        beneficiaryName: params.beneficiaryName || 'Cliente',
        beneficiaryEmail: params.beneficiaryEmail || '',
        availablePoints: params.availablePoints || '0',
      },
    });
  };

  const handleRedeemPoints = () => {
    Alert.alert(
      'Proximamente',
      'La funcionalidad de canje de puntos estara disponible pronto',
      [{ text: 'OK' }]
    );
  };

  const handleScanAnother = () => {
    router.replace('/(app)/scanner');
  };

  const handleGoHome = () => {
    router.replace('/(app)');
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Cliente Escaneado',
          headerStyle: { backgroundColor: '#059669' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
          headerLeft: () => (
            <TouchableOpacity onPress={handleGoHome} style={styles.headerButton}>
              <Ionicons name="home" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={[
          styles.statusBadge,
          isMember ? styles.memberBadge : styles.nonMemberBadge
        ]}>
          <Text style={[
            styles.statusText,
            isMember ? styles.memberText : styles.nonMemberText
          ]}>
            {isMember ? 'MIEMBRO' : 'NO ES MIEMBRO'}
          </Text>
        </View>

        <View style={styles.userCard}>
          <Ionicons name="person-circle" size={64} color="#059669" />
          <Text style={styles.userName}>{params.beneficiaryName || 'Usuario'}</Text>
          <Text style={styles.userEmail}>{params.beneficiaryEmail}</Text>
        </View>

        {isMember ? (
          <>
            <View style={styles.pointsDisplay}>
              <Text style={styles.pointsLabel}>Puntos disponibles</Text>
              <Text style={styles.pointsValue}>
                {availablePoints.toLocaleString()}
              </Text>
            </View>

            {!hasPointsRules && !checkingRules && (
              <View style={styles.noRulesWarning}>
                <Text style={styles.noRulesIcon}>⚠️</Text>
                <Text style={styles.noRulesText}>
                  No hay reglas de puntos configuradas para tu organizacion. Contacta a un administrador para crear reglas antes de registrar ventas.
                </Text>
              </View>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  !hasPointsRules && styles.actionButtonDisabled
                ]}
                onPress={handleNewSale}
                disabled={!hasPointsRules || checkingRules}
              >
                {checkingRules ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cart" size={24} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Nueva Venta</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.redeemButton]}
                onPress={handleRedeemPoints}
              >
                <Ionicons name="gift" size={24} color="#059669" />
                <Text style={[styles.actionButtonText, styles.redeemButtonText]}>
                  Canjear Puntos
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.inviteCard}>
              <Ionicons name="person-add" size={48} color="#D97706" style={styles.inviteIcon} />
              <Text style={styles.inviteMessage}>
                Este usuario no pertenece a tu organizacion. Puedes invitarlo para que empiece a acumular puntos.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.inviteButton}
              onPress={handleInviteUser}
              disabled={inviting}
            >
              {inviting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="person-add" size={20} color="#FFFFFF" />
                  <Text style={styles.inviteButtonText}>Invitar Usuario</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.scanAgainButton} onPress={handleScanAnother}>
            <Ionicons name="qr-code" size={20} color="#059669" />
            <Text style={styles.scanAgainText}>Escanear otro</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
            <Text style={styles.homeButtonText}>Volver a inicio</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: 24,
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 16,
    padding: 4,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  memberBadge: {
    backgroundColor: '#D1FAE5',
  },
  nonMemberBadge: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  memberText: {
    color: '#059669',
  },
  nonMemberText: {
    color: '#D97706',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  pointsDisplay: {
    backgroundColor: '#059669',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  pointsLabel: {
    fontSize: 14,
    color: '#D1FAE5',
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  noRulesWarning: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  noRulesIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  noRulesText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  actionButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  redeemButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#059669',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  redeemButtonText: {
    color: '#059669',
  },
  inviteCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  inviteIcon: {
    marginBottom: 16,
  },
  inviteMessage: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 22,
  },
  inviteButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomActions: {
    width: '100%',
    gap: 12,
  },
  scanAgainButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#059669',
    gap: 8,
  },
  scanAgainText: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '600',
  },
  homeButton: {
    padding: 16,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#6B7280',
    fontSize: 16,
  },
});
