import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../utils/supabase';

interface InviteToStoreModalProps {
  visible: boolean;
  onClose: () => void;
  beneficiaryId: number;
  beneficiaryEmail: string;
  organizationId: number;
  organizationName: string;
  onInviteSuccess: () => void;
}

export default function InviteToStoreModal({
  visible,
  onClose,
  beneficiaryId,
  beneficiaryEmail,
  organizationId,
  organizationName,
  onInviteSuccess,
}: InviteToStoreModalProps) {
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    setLoading(true);

    try {
      // Create beneficiary_organization record
      const { data, error } = await supabase
        .from('beneficiary_organization')
        .insert({
          beneficiary_id: beneficiaryId,
          organization_id: organizationId,
          available_points: 0,
          total_points_earned: 0,
          total_points_redeemed: 0,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error inviting user:', error);
        Alert.alert('Error', 'Failed to invite customer to store');
        return;
      }

      Alert.alert(
        '✅ Success!',
        `${beneficiaryEmail} has been added to ${organizationName}!\n\nThey can now earn and redeem points at this store.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onInviteSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (err) {
      console.error('Unexpected error:', err);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Customer Not Found</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.icon}>🏪</Text>
            
            <Text style={styles.message}>
              This customer is not yet a member of{' '}
              <Text style={styles.storeName}>{organizationName}</Text>
            </Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Customer Email:</Text>
              <Text style={styles.infoValue}>{beneficiaryEmail}</Text>
            </View>

            <Text style={styles.question}>
              Would you like to invite them to join this store?
            </Text>

            <Text style={styles.description}>
              Once invited, they will be able to earn and redeem points at this store.
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.inviteButton]}
              onPress={handleInvite}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.inviteButtonText}>Invite to Store</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    backgroundColor: '#FEF3C7',
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#92400E',
    textAlign: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  storeName: {
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  infoBox: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  inviteButton: {
    backgroundColor: '#3B82F6',
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
