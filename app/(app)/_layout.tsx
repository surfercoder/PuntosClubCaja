import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function AppLayout() {
  const { session, loading, appUser } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (!session || !appUser) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'PuntosClub Caja',
          headerStyle: { backgroundColor: '#059669' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="scanner"
        options={{
          title: 'Escanear QR',
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="scanned-user"
        options={{
          title: 'Cliente Escaneado',
          headerStyle: { backgroundColor: '#059669' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="new-sale"
        options={{
          title: 'Nueva Venta',
          headerStyle: { backgroundColor: '#059669' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: 'Mi Perfil',
          headerStyle: { backgroundColor: '#059669' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});
