import React, { useEffect, useState } from 'react';
import { Text, View, ActivityIndicator, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import QRScanner from '../components/QRScanner';
import PurchaseForm from '../components/PurchaseForm';
import StoreMembershipCheck from '../components/StoreMembershipCheck';
import InviteToStoreModal from '../components/InviteToStoreModal';

interface ScannedUserData {
  userId: string;
  email: string | undefined;
  organizationId: number | null;
  beneficiaryId: number | null;
  timestamp: number;
}

export default function Index() {
  const { user, loading, signOut } = useAuth();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [purchaseFormVisible, setPurchaseFormVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [scannedUser, setScannedUser] = useState<ScannedUserData | null>(null);
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [cashierOrgId, setCashierOrgId] = useState<number | null>(null);
  const [organizationName, setOrganizationName] = useState<string>('');

  useEffect(() => {
    if (!loading && !user) {
      // User is not authenticated, redirect to login
      router.replace('/login');
    } else if (user) {
      // Fetch cashier's organization
      fetchCashierOrganization();
    }
  }, [user, loading]);

  const fetchCashierOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from('app_user')
        .select('organization_id, organization:organization(name)')
        .eq('email', user?.email)
        .single();

      if (error) {
        console.error('Error fetching cashier organization:', error);
        return;
      }

      if (data) {
        setCashierOrgId(data.organization_id);
        const org = data.organization as any;
        setOrganizationName(org?.name || 'Unknown Store');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    // This will briefly show while redirecting to login
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleOpenScanner = () => {
    setScannerVisible(true);
  };

  const handleCloseScanner = () => {
    setScannerVisible(false);
  };

  const handleUserScanned = (userData: ScannedUserData) => {
    setScannedUser(userData);
    setIsMember(null); // Reset membership status
  };

  const handleClearScannedUser = () => {
    setScannedUser(null);
    setIsMember(null);
  };

  const handleMembershipVerified = (memberStatus: boolean, membershipData?: any) => {
    setIsMember(memberStatus);
    
    if (!memberStatus) {
      // User is not a member, show invite modal
      setInviteModalVisible(true);
    }
  };

  const handleInviteSuccess = () => {
    // Refresh membership status
    setIsMember(true);
  };

  const handleOpenPurchaseForm = () => {
    if (scannedUser && isMember) {
      setPurchaseFormVisible(true);
    }
  };

  const handleClosePurchaseForm = () => {
    setPurchaseFormVisible(false);
  };

  const handlePurchaseComplete = (data: any) => {
    console.log('Purchase completed:', data);
    // Optionally clear the scanned user after purchase
    // setScannedUser(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>PuntosClub Caja</Text>
            <Text style={styles.subtitle}>Cashier: {user.email}</Text>
          </View>

          {/* Scan QR Code Button */}
          <TouchableOpacity style={styles.scanButton} onPress={handleOpenScanner}>
            <Text style={styles.scanButtonIcon}>📷</Text>
            <Text style={styles.scanButtonText}>Scan Customer QR Code</Text>
          </TouchableOpacity>

          {/* Scanned User Information */}
          {scannedUser && (
            <View style={styles.scannedUserCard}>
              <View style={styles.scannedUserHeader}>
                <Text style={styles.scannedUserTitle}>Current Customer</Text>
                <TouchableOpacity onPress={handleClearScannedUser}>
                  <Text style={styles.clearButton}>Clear</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.scannedUserInfo}>
                <Text style={styles.scannedUserLabel}>Email:</Text>
                <Text style={styles.scannedUserValue}>{scannedUser.email}</Text>
              </View>

              <View style={styles.scannedUserInfo}>
                <Text style={styles.scannedUserLabel}>User ID:</Text>
                <Text style={styles.scannedUserValue}>
                  {scannedUser.userId.slice(0, 8)}...
                </Text>
              </View>

              <View style={styles.scannedUserInfo}>
                <Text style={styles.scannedUserLabel}>Scanned:</Text>
                <Text style={styles.scannedUserValue}>
                  {new Date(scannedUser.timestamp).toLocaleTimeString()}
                </Text>
              </View>

              {scannedUser.organizationId && (
                <View style={styles.scannedUserInfo}>
                  <Text style={styles.scannedUserLabel}>Organization ID:</Text>
                  <Text style={styles.scannedUserValue}>
                    {scannedUser.organizationId}
                  </Text>
                </View>
              )}

              {/* Membership Check */}
              {scannedUser.beneficiaryId && cashierOrgId && (
                <StoreMembershipCheck
                  beneficiaryId={scannedUser.beneficiaryId}
                  organizationId={cashierOrgId}
                  onMembershipVerified={handleMembershipVerified}
                />
              )}

              {/* Membership Status Badge */}
              {isMember === true && (
                <View style={styles.memberBadge}>
                  <Text style={styles.memberBadgeText}>✓ Store Member</Text>
                </View>
              )}
              {isMember === false && (
                <View style={styles.nonMemberBadge}>
                  <Text style={styles.nonMemberBadgeText}>⚠ Not a Member</Text>
                </View>
              )}

              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, !isMember && styles.disabledButton]} 
                  onPress={handleOpenPurchaseForm}
                  disabled={!isMember}
                >
                  <Text style={styles.actionButtonText}>Add Purchase</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.redeemButton, !isMember && styles.disabledButton]}
                  disabled={!isMember}
                >
                  <Text style={styles.actionButtonText}>Redeem Points</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.mainContent}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Cashier Dashboard</Text>
              <Text style={styles.cardDescription}>
                Scan customer QR codes to process transactions and manage point accounts.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Quick Actions</Text>
              <Text style={styles.cardDescription}>
                Process customer purchases, redeem points, and handle customer inquiries.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Reports</Text>
              <Text style={styles.cardDescription}>
                View daily transaction summaries and customer activity reports.
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* QR Scanner Modal */}
      <QRScanner
        visible={scannerVisible}
        onClose={handleCloseScanner}
        onUserScanned={handleUserScanned}
      />

      {/* Purchase Form Modal */}
      {scannedUser && (
        <PurchaseForm
          visible={purchaseFormVisible}
          onClose={handleClosePurchaseForm}
          beneficiaryEmail={scannedUser.email || ''}
          beneficiaryId={scannedUser.beneficiaryId || undefined}
          organizationId={cashierOrgId || undefined}
          branchId={13} // Using Main Branch ID from database
          onPurchaseComplete={handlePurchaseComplete}
        />
      )}

      {/* Invite to Store Modal */}
      {scannedUser && scannedUser.beneficiaryId && cashierOrgId && (
        <InviteToStoreModal
          visible={inviteModalVisible}
          onClose={() => setInviteModalVisible(false)}
          beneficiaryId={scannedUser.beneficiaryId}
          beneficiaryEmail={scannedUser.email || ''}
          organizationId={cashierOrgId}
          organizationName={organizationName}
          onInviteSuccess={handleInviteSuccess}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  scanButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scanButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  scannedUserCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#10B981',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  scannedUserHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  scannedUserTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10B981',
  },
  clearButton: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  scannedUserInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  scannedUserLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  scannedUserValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  redeemButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  memberBadge: {
    backgroundColor: '#D1FAE5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  memberBadgeText: {
    color: '#065F46',
    fontSize: 14,
    fontWeight: '600',
  },
  nonMemberBadge: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  nonMemberBadgeText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '600',
  },
  mainContent: {
    gap: 16,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  signOutButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
