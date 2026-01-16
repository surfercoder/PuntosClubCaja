import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../contexts/AuthContext';

export default function OrganizationQRScreen() {
  const { appUser } = useAuth();

  if (!appUser?.organization_id) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'QR de Organizacion',
            headerStyle: { backgroundColor: '#059669' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
          <Text style={styles.errorText}>
            No se pudo cargar la informacion de la organizacion
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const organizationName = (appUser.organization as any)?.name || 'Organizacion';
  const qrData = JSON.stringify({
    type: 'organization',
    id: appUser.organization_id,
    name: organizationName,
  });

  const handleInfo = () => {
    Alert.alert(
      'Como usar este QR',
      'Los clientes pueden escanear este codigo QR desde la app PuntosClub para unirse automaticamente a tu organizacion y comenzar a acumular puntos.\n\nPuedes:\n• Mostrar este QR en la pantalla del dispositivo\n• Imprimirlo y colocarlo en un lugar visible\n• Usarlo como sticker en tu local',
      [{ text: 'Entendido' }]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'QR de Organizacion',
          headerStyle: { backgroundColor: '#059669' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
          headerRight: () => (
            <TouchableOpacity onPress={handleInfo} style={styles.infoButton}>
              <Ionicons name="information-circle-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Ionicons name="qr-code" size={48} color="#059669" />
          <Text style={styles.headerTitle}>Codigo QR de tu Organizacion</Text>
          <Text style={styles.headerSubtitle}>
            Los clientes pueden escanear este codigo para unirse a {organizationName}
          </Text>
        </View>

        <View style={styles.qrCard}>
          <View style={styles.qrContainer}>
            <QRCode
              value={qrData}
              size={280}
              backgroundColor="white"
              color="#059669"
            />
          </View>
          <View style={styles.orgInfo}>
            <Text style={styles.orgName}>{organizationName}</Text>
            <Text style={styles.orgId}>ID: {appUser.organization_id}</Text>
          </View>
        </View>

        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Instrucciones</Text>
          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>1</Text>
            </View>
            <Text style={styles.instructionText}>
              El cliente debe abrir la app PuntosClub
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>2</Text>
            </View>
            <Text style={styles.instructionText}>
              Ir a la seccion &quot;Explorar&quot; y tocar el boton de escanear QR
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>3</Text>
            </View>
            <Text style={styles.instructionText}>
              Escanear este codigo QR para unirse automaticamente
            </Text>
          </View>
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Sugerencias</Text>
          <Text style={styles.tipText}>
            • Imprime este QR y colócalo en un lugar visible de tu local
          </Text>
          <Text style={styles.tipText}>
            • Puedes crear stickers con este QR para distribuir
          </Text>
          <Text style={styles.tipText}>
            • Mantén el QR limpio y sin obstrucciones para facilitar el escaneo
          </Text>
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
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoButton: {
    marginRight: 8,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 12,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#059669',
  },
  orgInfo: {
    marginTop: 20,
    alignItems: 'center',
  },
  orgName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  orgId: {
    fontSize: 14,
    color: '#6B7280',
  },
  instructionsCard: {
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
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  instructionNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    paddingTop: 4,
  },
  tipsCard: {
    backgroundColor: '#D1FAE5',
    borderRadius: 16,
    padding: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
    marginBottom: 8,
  },
});
