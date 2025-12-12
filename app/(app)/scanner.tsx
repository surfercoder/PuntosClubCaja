import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';

export default function ScannerScreen() {
  const { appUser } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

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
      const userName = `${beneficiary.first_name || ''} ${beneficiary.last_name || ''}`.trim();

      // Navigate to scanned-user screen with all data
      // Use replace instead of push to close the camera
      router.replace({
        pathname: '/(app)/scanned-user',
        params: {
          beneficiaryId: beneficiary.id,
          beneficiaryName: userName || 'Usuario',
          beneficiaryEmail: beneficiary.email || '',
          isMember: isMember ? 'true' : 'false',
          membershipId: membership?.id || '',
          availablePoints: (membership?.available_points || 0).toString(),
        },
      });
    } catch (error) {
      console.error('Error parsing QR:', error);
      Alert.alert('Error', 'No se pudo leer el codigo QR', [
        { text: 'OK', onPress: () => setScanned(false) }
      ]);
    } finally {
      setLoading(false);
      setScanned(false);
    }
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
});
