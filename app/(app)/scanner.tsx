import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';

type ScannedBeneficiary = {
  id: string;
  email: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  isMember: boolean;
  membershipId?: string;
  availablePoints?: number;
};

export default function ScannerScreen() {
  const { appUser } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scannedUser, setScannedUser] = useState<ScannedBeneficiary | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [inviting, setInviting] = useState(false);

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (scanned || loading) return;

    setScanned(true);
    setLoading(true);

    try {
      // Parse the QR code data
      const qrData = JSON.parse(result.data);

      if (qrData.type !== 'beneficiary' || !qrData.id) {
        Alert.alert('Error', 'Codigo QR no valido', [
          { text: 'OK', onPress: () => setScanned(false) }
        ]);
        setLoading(false);
        return;
      }

      // Fetch beneficiary info
      const { data: beneficiary, error: beneficiaryError } = await supabase
        .from('beneficiary')
        .select('id, email, first_name, last_name')
        .eq('id', qrData.id)
        .single();

      if (beneficiaryError || !beneficiary) {
        Alert.alert('Error', 'Usuario no encontrado', [
          { text: 'OK', onPress: () => setScanned(false) }
        ]);
        setLoading(false);
        return;
      }

      // Check if user is a member of the cashier's organization
      const { data: membership, error: membershipError } = await supabase
        .from('beneficiary_organization')
        .select('id, available_points, is_active')
        .eq('beneficiary_id', qrData.id)
        .eq('organization_id', appUser?.organization_id)
        .single();

      const isMember = !membershipError && membership && membership.is_active;

      setScannedUser({
        id: beneficiary.id,
        email: beneficiary.email || '',
        name: `${beneficiary.first_name || ''} ${beneficiary.last_name || ''}`.trim(),
        first_name: beneficiary.first_name,
        last_name: beneficiary.last_name,
        isMember,
        membershipId: membership?.id,
        availablePoints: membership?.available_points,
      });
      setShowResultModal(true);
    } catch (error) {
      console.error('Error parsing QR:', error);
      Alert.alert('Error', 'No se pudo leer el codigo QR', [
        { text: 'OK', onPress: () => setScanned(false) }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!scannedUser || !appUser?.organization_id) return;

    setInviting(true);
    try {
      // Create pending invitation/membership
      const { error } = await supabase
        .from('beneficiary_organization')
        .insert({
          beneficiary_id: scannedUser.id,
          organization_id: appUser.organization_id,
          available_points: 0,
          total_points_earned: 0,
          total_points_redeemed: 0,
          is_active: true, // For now, auto-accept. Later can add pending state
        });

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation - already exists
          // Try to reactivate
          const { error: updateError } = await supabase
            .from('beneficiary_organization')
            .update({ is_active: true })
            .eq('beneficiary_id', scannedUser.id)
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
        `${scannedUser.name} ahora es miembro de tu organizacion`,
        [{ text: 'OK', onPress: () => {
          setShowResultModal(false);
          setScannedUser(null);
          setScanned(false);
        }}]
      );
    } catch (error) {
      console.error('Error inviting user:', error);
      Alert.alert('Error', 'No se pudo agregar al usuario');
    } finally {
      setInviting(false);
    }
  };

  const handleNewSale = () => {
    if (!scannedUser) return;

    setShowResultModal(false);
    router.push({
      pathname: '/(app)/new-sale',
      params: {
        beneficiaryId: scannedUser.id,
        beneficiaryName: scannedUser.name || 'Cliente',
        beneficiaryEmail: scannedUser.email || '',
        availablePoints: (scannedUser.availablePoints || 0).toString(),
      },
    });
  };

  const handleRedeemPoints = () => {
    // TODO: Navigate to redeem points screen with scannedUser data
    Alert.alert(
      'Proximamente',
      'La funcionalidad de canje de puntos estara disponible pronto',
      [{ text: 'OK' }]
    );
  };

  const closeModal = () => {
    setShowResultModal(false);
    setScannedUser(null);
    setScanned(false);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Permiso de Camara</Text>
        <Text style={styles.permissionText}>
          Necesitamos acceso a la camara para escanear codigos QR
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Dar Permiso</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              Escanea el codigo QR del cliente
            </Text>
            {loading && (
              <ActivityIndicator size="small" color="#FFFFFF" style={styles.loadingIndicator} />
            )}
          </View>
        </View>
      </CameraView>

      {/* Result Modal */}
      <Modal
        visible={showResultModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {scannedUser && (
              <>
                <View style={[
                  styles.statusBadge,
                  scannedUser.isMember ? styles.memberBadge : styles.nonMemberBadge
                ]}>
                  <Text style={[
                    styles.statusText,
                    scannedUser.isMember ? styles.memberText : styles.nonMemberText
                  ]}>
                    {scannedUser.isMember ? 'MIEMBRO' : 'NO ES MIEMBRO'}
                  </Text>
                </View>

                <Text style={styles.modalUserName}>{scannedUser.name || 'Usuario'}</Text>
                <Text style={styles.modalUserEmail}>{scannedUser.email}</Text>

                {scannedUser.isMember ? (
                  <>
                    <View style={styles.pointsDisplay}>
                      <Text style={styles.pointsLabel}>Puntos disponibles</Text>
                      <Text style={styles.pointsValue}>
                        {scannedUser.availablePoints?.toLocaleString() || 0}
                      </Text>
                    </View>

                    <View style={styles.actionButtons}>
                      <TouchableOpacity style={styles.actionButton} onPress={handleNewSale}>
                        <Text style={styles.actionIcon}>+</Text>
                        <Text style={styles.actionButtonText}>Nueva Venta</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.redeemButton]}
                        onPress={handleRedeemPoints}
                      >
                        <Text style={[styles.actionIcon, styles.redeemIcon]}>*</Text>
                        <Text style={[styles.actionButtonText, styles.redeemButtonText]}>
                          Canjear Puntos
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.inviteMessage}>
                      Este usuario no pertenece a tu organizacion. Puedes invitarlo para que empiece a acumular puntos.
                    </Text>

                    <TouchableOpacity
                      style={styles.inviteButton}
                      onPress={handleInviteUser}
                      disabled={inviting}
                    >
                      {inviting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.inviteButtonText}>Invitar Usuario</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity style={styles.scanAgainButton} onPress={closeModal}>
                  <Text style={styles.scanAgainText}>Escanear otro</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#059669',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  instructions: {
    paddingBottom: 100,
    alignItems: 'center',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  loadingIndicator: {
    marginTop: 16,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  backButtonText: {
    color: '#6B7280',
    fontSize: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
    minHeight: 400,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  memberBadge: {
    backgroundColor: '#D1FAE5',
  },
  nonMemberBadge: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  memberText: {
    color: '#059669',
  },
  nonMemberText: {
    color: '#D97706',
  },
  modalUserName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  modalUserEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  pointsDisplay: {
    backgroundColor: '#059669',
    borderRadius: 16,
    padding: 20,
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
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  redeemButton: {
    backgroundColor: '#F3F4F6',
  },
  actionIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  redeemIcon: {
    color: '#059669',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  redeemButtonText: {
    color: '#374151',
  },
  inviteMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  inviteButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scanAgainButton: {
    paddingVertical: 12,
  },
  scanAgainText: {
    color: '#6B7280',
    fontSize: 16,
  },
});
