import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';

type Product = {
  id: number;
  name: string;
  description: string | null;
  required_points: number;
  active: boolean;
  category: {
    id: number;
    name: string;
  } | null;
  stock: {
    id: number;
    branch_id: number;
    quantity: number;
    branch: {
      id: number;
      name: string;
    };
  }[] | null;
};

export default function RedeemPointsScreen() {
  const params = useLocalSearchParams<{
    beneficiaryId: string;
    beneficiaryName: string;
    beneficiaryEmail: string;
    availablePoints: string;
    membershipId: string;
  }>();

  const { appUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [redeemedProduct, setRedeemedProduct] = useState<Product | null>(null);

  const availablePoints = parseInt(params.availablePoints || '0', 10);

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const { data, error } = await supabase
        .from('product')
        .select(`
          *,
          category:category_id(id, name),
          stock:stock(
            id,
            branch_id,
            quantity,
            branch:branch(id, name)
          )
        `)
        .eq('organization_id', parseInt(appUser?.organization_id || '0'))
        .eq('active', true)
        .order('required_points', { ascending: true });

      if (!error && data) {
        setProducts(data);
      }
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los productos');
    } finally {
      setProductsLoading(false);
    }
  }, [appUser?.organization_id]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleProductSelect = (product: Product) => {
    const totalStock = product.stock?.reduce(
      (sum, s) => sum + (s.quantity || 0),
      0
    ) || 0;
    const canAfford = availablePoints >= product.required_points;
    const inStock = totalStock > 0;

    if (!canAfford) {
      Alert.alert(
        'Puntos insuficientes',
        `El cliente necesita ${product.required_points.toLocaleString()} puntos pero solo tiene ${availablePoints.toLocaleString()} puntos disponibles.`
      );
      return;
    }

    if (!inStock) {
      Alert.alert('Sin stock', 'Este producto no tiene stock disponible.');
      return;
    }

    confirmRedemption(product);
  };

  const confirmRedemption = (product: Product) => {
    Alert.alert(
      'Confirmar Canje',
      `¿Confirmas el canje de "${product.name}" por ${product.required_points.toLocaleString()} puntos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => handleRedeemProduct(product),
        },
      ]
    );
  };

  const handleRedeemProduct = async (product: Product) => {
    if (!params.beneficiaryId || !appUser?.organization_id) {
      Alert.alert('Error', 'Datos incompletos. Por favor escanea al cliente nuevamente.');
      return;
    }

    setRedeeming(true);
    try {
      // Create the redemption record
      const { error: redemptionError } = await supabase
        .from('redemption')
        .insert({
          beneficiary_id: parseInt(params.beneficiaryId),
          product_id: product.id,
          organization_id: parseInt(appUser.organization_id),
          points_redeemed: product.required_points,
          status: 'completed',
          redeemed_by: parseInt(appUser.id),
        })
        .select()
        .single();

      if (redemptionError) {
        throw redemptionError;
      }

      // Update beneficiary_organization points
      const { error: updateError } = await supabase
        .from('beneficiary_organization')
        .update({
          available_points: availablePoints - product.required_points,
          total_points_redeemed: supabase.rpc('increment_points', {
            current_value: 0,
            increment: product.required_points,
          }),
        })
        .eq('beneficiary_id', parseInt(params.beneficiaryId))
        .eq('organization_id', parseInt(appUser.organization_id));

      if (updateError) {
        throw updateError;
      }

      // Update stock (decrease by 1)
      if (product.stock && product.stock.length > 0) {
        const stockItem = product.stock.find(s => s.quantity > 0);
        if (stockItem) {
          const { error: stockError } = await supabase
            .from('stock')
            .update({
              quantity: stockItem.quantity - 1,
            })
            .eq('id', stockItem.id);

          if (stockError) {
            console.error('Error updating stock:', stockError);
          }
        }
      }

      setRedeemedProduct(product);
      setShowSuccess(true);
    } catch (error) {
      Alert.alert(
        'Error',
        `No se pudo completar el canje: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    } finally {
      setRedeeming(false);
    }
  };

  const handleDone = () => {
    router.replace('/(app)');
  };

  const handleScanAnother = () => {
    router.replace('/(app)/scanner');
  };

  if (showSuccess && redeemedProduct) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Canje Exitoso',
            headerStyle: { backgroundColor: '#059669' },
            headerTintColor: '#FFFFFF',
            headerLeft: () => null,
          }}
        />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color="#059669" />
          </View>
          <Text style={styles.successTitle}>Canje Exitoso!</Text>
          <Text style={styles.successCustomer}>{params.beneficiaryName}</Text>

          <View style={styles.productRedeemedCard}>
            <Text style={styles.productRedeemedLabel}>Producto canjeado</Text>
            <Text style={styles.productRedeemedName}>{redeemedProduct.name}</Text>
            <View style={styles.pointsRedeemedBadge}>
              <Text style={styles.pointsRedeemedText}>
                {redeemedProduct.required_points.toLocaleString()} pts
              </Text>
            </View>
          </View>

          <View style={styles.redemptionDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Puntos restantes</Text>
              <Text style={styles.detailValue}>
                {(availablePoints - redeemedProduct.required_points).toLocaleString()}
              </Text>
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
          title: 'Canjear Puntos',
          headerStyle: { backgroundColor: '#059669' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <View style={styles.container}>
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
                {availablePoints.toLocaleString()} pts disponibles
              </Text>
            </View>
          </View>
        </View>

        {/* Products List */}
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>Productos disponibles</Text>
          <Text style={styles.sectionSubtitle}>
            Selecciona un producto para canjear
          </Text>
        </View>

        {productsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingText}>Cargando productos...</Text>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎁</Text>
            <Text style={styles.emptyTitle}>No hay productos disponibles</Text>
            <Text style={styles.emptySubtitle}>
              Pronto habrá productos para canjear con puntos
            </Text>
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const totalStock = item.stock?.reduce(
                (sum, s) => sum + (s.quantity || 0),
                0
              ) || 0;
              const canAfford = availablePoints >= item.required_points;
              const inStock = totalStock > 0;
              const isAvailable = canAfford && inStock;

              return (
                <TouchableOpacity
                  style={[
                    styles.productItem,
                    !isAvailable && styles.productItemDisabled,
                  ]}
                  onPress={() => handleProductSelect(item)}
                  disabled={!isAvailable || redeeming}
                >
                  <View style={styles.productHeader}>
                    <View style={styles.productInfo}>
                      <Text style={[
                        styles.productName,
                        !isAvailable && styles.productNameDisabled,
                      ]}>
                        {item.name}
                      </Text>
                      {item.category && (
                        <Text style={styles.productCategory}>
                          {item.category.name}
                        </Text>
                      )}
                    </View>
                    <View style={styles.productPoints}>
                      <Text style={[
                        styles.productPointsValue,
                        !isAvailable && styles.productPointsDisabled,
                      ]}>
                        {item.required_points.toLocaleString()}
                      </Text>
                      <Text style={styles.productPointsLabel}>pts</Text>
                    </View>
                  </View>

                  {item.description && (
                    <Text style={styles.productDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}

                  <View style={styles.productFooter}>
                    <View
                      style={[
                        styles.stockBadge,
                        inStock ? styles.stockBadgeInStock : styles.stockBadgeOutOfStock,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stockBadgeText,
                          inStock ? styles.stockBadgeTextInStock : styles.stockBadgeTextOutOfStock,
                        ]}
                      >
                        {inStock ? `${totalStock} disponibles` : 'Sin stock'}
                      </Text>
                    </View>

                    {!canAfford && inStock && (
                      <Text style={styles.insufficientPointsText}>
                        Faltan {(item.required_points - availablePoints).toLocaleString()} pts
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  customerCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  productsSection: {
    padding: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  productItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  productItemDisabled: {
    opacity: 0.5,
    backgroundColor: '#F9FAFB',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  productNameDisabled: {
    color: '#9CA3AF',
  },
  productCategory: {
    fontSize: 12,
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  productPoints: {
    alignItems: 'flex-end',
  },
  productPointsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
  },
  productPointsDisabled: {
    color: '#9CA3AF',
  },
  productPointsLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  productDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stockBadgeInStock: {
    backgroundColor: '#D1FAE5',
  },
  stockBadgeOutOfStock: {
    backgroundColor: '#FEE2E2',
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stockBadgeTextInStock: {
    color: '#059669',
  },
  stockBadgeTextOutOfStock: {
    color: '#DC2626',
  },
  insufficientPointsText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
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
  productRedeemedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 48,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#059669',
  },
  productRedeemedLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  productRedeemedName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  pointsRedeemedBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  pointsRedeemedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  redemptionDetails: {
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
