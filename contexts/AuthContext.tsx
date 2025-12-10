import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';

type AppUser = {
  id: string;
  organization_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  username: string | null;
  active: boolean;
  role_id: string | null;
  auth_user_id: string | null;
};

type Organization = {
  id: string;
  name: string;
};

type AppUserWithOrg = AppUser & {
  organization?: Organization | null;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  appUser: AppUserWithOrg | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, userData: { first_name: string; last_name: string; username?: string; organization_id: string }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUserWithOrg | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAppUser(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchAppUser(session.user.id);
      } else {
        setAppUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAppUser = async (authUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('app_user')
        .select('*, user_role:role_id(name), organization:organization_id(id, name)')
        .eq('auth_user_id', authUserId)
        .single();

      if (error) {
        console.error('Error fetching app_user:', error);
        // User is authenticated but not an app_user - sign them out
        await supabase.auth.signOut();
        setAppUser(null);
      } else if (data) {
        // Verify user has cashier role
        const roleName = (data.user_role as any)?.name;
        if (roleName !== 'cashier') {
          console.error('User is not a cashier');
          await supabase.auth.signOut();
          setAppUser(null);
        } else {
          setAppUser(data);
        }
      }
    } catch (error) {
      console.error('Error in fetchAppUser:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        // Verify this user is an app_user with cashier role
        const { data: appUserData, error: appUserError } = await supabase
          .from('app_user')
          .select('*, user_role:role_id(name)')
          .eq('auth_user_id', data.user.id)
          .single();

        if (appUserError || !appUserData) {
          await supabase.auth.signOut();
          return { error: new Error('Esta cuenta no esta registrada como cajero. Por favor usa la app correcta.') };
        }

        const roleName = (appUserData.user_role as any)?.name;
        if (roleName !== 'cashier') {
          await supabase.auth.signOut();
          return { error: new Error('Esta cuenta no tiene permisos de cajero.') };
        }

        if (!appUserData.active) {
          await supabase.auth.signOut();
          return { error: new Error('Esta cuenta esta desactivada. Contacta a tu administrador.') };
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userData: { first_name: string; last_name: string; username?: string; organization_id: string }
  ): Promise<{ error: Error | null }> => {
    try {
      // First, create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        return { error: authError };
      }

      if (!authData.user) {
        return { error: new Error('Error al crear la cuenta') };
      }

      // Get the cashier role ID
      const { data: roleData, error: roleError } = await supabase
        .from('user_role')
        .select('id')
        .eq('name', 'cashier')
        .single();

      if (roleError || !roleData) {
        await supabase.auth.signOut();
        return { error: new Error('Error al obtener el rol de cajero') };
      }

      // Verify the organization exists
      const { data: orgData, error: orgError } = await supabase
        .from('organization')
        .select('id')
        .eq('id', userData.organization_id)
        .single();

      if (orgError || !orgData) {
        await supabase.auth.signOut();
        return { error: new Error('La organizacion especificada no existe') };
      }

      // Create the app_user record
      const { error: appUserError } = await supabase
        .from('app_user')
        .insert({
          email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          username: userData.username || null,
          organization_id: userData.organization_id,
          role_id: roleData.id,
          auth_user_id: authData.user.id,
          active: true,
        });

      if (appUserError) {
        await supabase.auth.signOut();
        return { error: new Error('Error al crear el perfil de cajero: ' + appUserError.message) };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setAppUser(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, appUser, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
