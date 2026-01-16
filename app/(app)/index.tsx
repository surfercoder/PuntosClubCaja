import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

export default function HomeScreen() {
  const { appUser, signOut } = useAuth();
  const [qrModalVisible, setQrModalVisible] = useState(false);

  const organizationName = (appUser?.organization as any)?.name || 'Sin organizacion';
  const qrData = JSON.stringify({
    type: 'organization',
    id: appUser?.organization_id,
    name: organizationName,
  });

  const handleSignOut = async () => {
    Alert.alert(
      'Cerrar Sesion',
      'Estas seguro que deseas cerrar sesion?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesion',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/sign-in');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.greeting}>
          Hola, {appUser?.first_name || 'Cajero'}!
        </Text>
        <View style={styles.orgContainer}>
          <Text style={styles.orgLabel}>Organizacion</Text>
          <View style={styles.orgNameRow}>
            <Text style={styles.orgName}>
              {organizationName}
            </Text>
            {appUser?.organization_id && (
              <TouchableOpacity
                onPress={() => setQrModalVisible(true)}
                style={styles.qrIconButton}
              >
                <Ionicons name="qr-code" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.infoCard}
        onPress={() => router.push('/(app)/profile')}
        activeOpacity={0.7}
      >
        <View style={styles.infoHeader}>
          <Text style={styles.infoTitle}>Informacion de tu cuenta</Text>
          <Text style={styles.editLink}>Editar →</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nombre:</Text>
          <Text style={styles.infoValue}>
            {appUser?.first_name} {appUser?.last_name}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{appUser?.email}</Text>
        </View>
        {appUser?.username && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Usuario:</Text>
            <Text style={styles.infoValue}>{appUser.username}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Estado:</Text>
          <View style={[styles.statusBadge, appUser?.active ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={[styles.statusText, appUser?.active ? styles.activeText : styles.inactiveText]}>
              {appUser?.active ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Main QR Scanner Button */}
      <TouchableOpacity
        style={styles.scannerCard}
        onPress={() => router.push('/(app)/scanner')}
        activeOpacity={0.8}
      >
        <View style={styles.scannerIconContainer}>
          <Ionicons name="qr-code" size={48} color="#FFFFFF" />
        </View>
        <View style={styles.scannerTextContainer}>
          <Text style={styles.scannerTitle}>Escanear Cliente</Text>
          <Text style={styles.scannerSubtitle}>
            Escanea el QR del cliente para registrar ventas o canjear puntos
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#059669" />
      </TouchableOpacity>

      <View style={styles.actionsCard}>
        <Text style={styles.actionsTitle}>Acciones rapidas</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(app)/scanner')}
          >
            <Ionicons name="add-circle" size={28} color="#059669" />
            <Text style={styles.actionText}>Nueva Venta</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(app)/scanner')}
          >
            <Ionicons name="gift" size={28} color="#059669" />
            <Text style={styles.actionText}>Canjear Puntos</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Cerrar Sesion</Text>
      </TouchableOpacity>

      <Modal
        visible={qrModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setQrModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setQrModalVisible(false)}
            >
              <Ionicons name="close-circle" size={32} color="#6B7280" />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>QR de {organizationName}</Text>
            <Text style={styles.modalSubtitle}>
              Los clientes pueden escanear este codigo para unirse
            </Text>
            
            <View style={styles.qrContainer}>
              <QRCode
                value={qrData}
                size={280}
                backgroundColor="white"
                color="#059669"
              />
            </View>
            
            <Text style={styles.modalHint}>
              Toca fuera del cuadro para cerrar
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  card: {
    backgroundColor: '#059669',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  orgContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  orgLabel: {
    fontSize: 12,
    color: '#D1FAE5',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  orgNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orgName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  qrIconButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 6,
  },
  infoCard: {
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
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  editLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: {
    color: '#059669',
  },
  inactiveText: {
    color: '#DC2626',
  },
  scannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#059669',
  },
  scannerIconContainer: {
    backgroundColor: '#059669',
    borderRadius: 12,
    padding: 12,
    marginRight: 16,
  },
  scannerTextContainer: {
    flex: 1,
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  scannerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  actionsCard: {
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
  actionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  qrContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#059669',
    marginBottom: 16,
  },
  modalHint: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  signOutButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 'auto',
  },
  signOutText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
});
