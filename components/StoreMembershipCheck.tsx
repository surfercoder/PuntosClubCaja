import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../utils/supabase';

interface StoreMembershipCheckProps {
  beneficiaryId: number | null;
  organizationId: number | null;
  onMembershipVerified: (isMember: boolean, membershipData?: any) => void;
}

export default function StoreMembershipCheck({
  beneficiaryId,
  organizationId,
  onMembershipVerified,
}: StoreMembershipCheckProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (beneficiaryId && organizationId) {
      checkMembership();
    }
  }, [beneficiaryId, organizationId]);

  const checkMembership = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if beneficiary belongs to this organization
      const { data, error: fetchError } = await supabase
        .from('beneficiary_organization')
        .select('*')
        .eq('beneficiary_id', beneficiaryId)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();

      if (fetchError) {
        // If no record found, user is not a member
        if (fetchError.code === 'PGRST116') {
          onMembershipVerified(false);
        } else {
          console.error('Error checking membership:', fetchError);
          setError('Failed to verify membership');
        }
      } else if (data) {
        // User is a member
        onMembershipVerified(true, data);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#3B82F6" />
        <Text style={styles.loadingText}>Verifying membership...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginVertical: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
  },
});
