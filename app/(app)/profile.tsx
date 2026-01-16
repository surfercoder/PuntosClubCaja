import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { appUser, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: appUser?.first_name || '',
    last_name: appUser?.last_name || '',
    email: appUser?.email || '',
    username: appUser?.username || '',
  });

  const handleSave = async () => {
    if (!appUser?.id) return;

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('app_user')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          username: formData.username,
        })
        .eq('id', appUser.id);

      if (updateError) {
        throw updateError;
      }

      if (formData.email !== appUser.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email,
        });

        if (emailError) {
          throw emailError;
        }

        Alert.alert(
          'Email actualizado',
          'Por favor revisa tu nuevo correo electronico para confirmar el cambio.'
        );
      }

      Alert.alert('Exito', 'Tu perfil ha sido actualizado correctamente.');
      router.back();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'No se pudo actualizar el perfil'
      );
    } finally {
      setIsLoading(false);
    }
  };

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

  const organizationName = (appUser?.organization as any)?.name || 'Sin organizacion';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Mi Perfil</Text>
          <Text style={styles.subtitle}>Actualiza tu informacion personal</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={formData.first_name}
              onChangeText={(text) => setFormData({ ...formData, first_name: text })}
              placeholder="Nombre"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Apellido</Text>
            <TextInput
              style={styles.input}
              value={formData.last_name}
              onChangeText={(text) => setFormData({ ...formData, last_name: text })}
              placeholder="Apellido"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Usuario</Text>
            <TextInput
              style={styles.input}
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text })}
              placeholder="Usuario"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Organizacion</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={organizationName}
              editable={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Estado</Text>
            <View style={[styles.statusBadge, appUser?.active ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={[styles.statusText, appUser?.active ? styles.activeText : styles.inactiveText]}>
                {appUser?.active ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Guardar Cambios</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Cerrar Sesion</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  inputDisabled: {
    backgroundColor: '#E5E7EB',
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeText: {
    color: '#059669',
  },
  inactiveText: {
    color: '#DC2626',
  },
  saveButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
});
