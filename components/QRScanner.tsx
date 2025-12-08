import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import { CameraView, Camera } from 'expo-camera';

interface ScannedUserData {
  userId: string;
  email: string | undefined;
  organizationId: number | null;
  beneficiaryId: number | null;
  timestamp: number;
}

interface QRScannerProps {
  visible: boolean;
  onClose: () => void;
  onUserScanned: (userData: ScannedUserData) => void;
}

export default function QRScanner({ visible, onClose, onUserScanned }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) {
      requestCameraPermission();
      setScanned(false);
    }
  }, [visible]);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;

    setScanned(true);

    try {
      // Parse the QR code data
      const userData: ScannedUserData = JSON.parse(data);

      // Validate the data structure
      if (!userData.userId || !userData.email) {
        Alert.alert(
          'Invalid QR Code',
          'This QR code does not contain valid user information.',
          [{ text: 'Try Again', onPress: () => setScanned(false) }]
        );
        return;
      }

      // Check if the QR code is not too old (optional: 5 minutes validity)
      const currentTime = Date.now();
      const qrAge = currentTime - userData.timestamp;
      const maxAge = 5 * 60 * 1000; // 5 minutes in milliseconds

      if (qrAge > maxAge) {
        Alert.alert(
          'QR Code Expired',
          'This QR code has expired. Please ask the customer to refresh their QR code.',
          [{ text: 'Try Again', onPress: () => setScanned(false) }]
        );
        return;
      }

      // Successfully scanned
      onUserScanned(userData);
      onClose();
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to read QR code. Please try again.',
        [{ text: 'Try Again', onPress: () => setScanned(false) }]
      );
    }
  };

  if (hasPermission === null) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <Text style={styles.message}>Requesting camera permission...</Text>
        </View>
      </Modal>
    );
  }

  if (hasPermission === false) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <Text style={styles.message}>No access to camera</Text>
          <Text style={styles.submessage}>
            Please enable camera permissions in your device settings.
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan Customer QR Code</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />

          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            Position the customer's QR code within the frame
          </Text>
          {scanned && (
            <TouchableOpacity
              style={styles.scanAgainButton}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.scanAgainButtonText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1F2937',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#3B82F6',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructions: {
    padding: 20,
    backgroundColor: '#1F2937',
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  submessage: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  scanAgainButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  scanAgainButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
