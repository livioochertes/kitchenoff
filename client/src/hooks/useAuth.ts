import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  // Invoice details fields
  companyName?: string;
  vatNumber?: string;
  registrationNumber?: string;
  taxId?: string;
  companyAddress?: string;
  companyCity?: string;
  companyState?: string;
  companyCounty?: string; // Added missing county field
  companyZip?: string;
  companyCountry?: string;
  billingEmail?: string;
  billingPhone?: string;
  // Delivery address
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryCounty?: string; // Added missing delivery county field
  deliveryZip?: string;
  deliveryCountry?: string;
  deliveryInstructions?: string;
  // Notification preferences
  emailNotifications?: boolean;
  orderUpdates?: boolean;
  productRestocks?: boolean;
  priceDrops?: boolean;
  promotions?: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

import { createContext, useContext } from 'react';

// Create a context for authentication state
const AuthContext = createContext<{
  authState: AuthState;
  setAuthState: (state: AuthState) => void;
} | null>(null);

// Global authentication state to persist across component re-renders
let globalAuthState: AuthState | null = null;
let globalSetters: Set<(state: AuthState) => void> = new Set();

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(() => {
    // If we already have a global state, use it instead of starting with loading
    if (globalAuthState) {
      return globalAuthState;
    }
    return {
      user: null,
      isLoading: true,
      isAuthenticated: false,
    };
  });

  // Register this setter with global setters
  useEffect(() => {
    globalSetters.add(setAuthState);
    return () => {
      globalSetters.delete(setAuthState);
    };
  }, []);

  // Custom setState that updates all components
  const updateGlobalAuthState = (newState: AuthState) => {
    globalAuthState = newState;
    globalSetters.forEach(setter => setter(newState));
  };

  useEffect(() => {
    // If we already have authentication state, don't re-initialize
    if (globalAuthState && !globalAuthState.isLoading) {
      return;
    }

    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        const newState = { user: null, isLoading: false, isAuthenticated: false };
        updateGlobalAuthState(newState);
        return;
      }

      try {
        const response = await apiRequest('GET', '/api/auth/me');
        const user = await response.json();
        console.log('🔍 useAuth: Fetched complete user data:', {
          companyName: user.companyName,
          companyCounty: user.companyCounty,
          deliveryCounty: user.deliveryCounty,
          companyAddress: user.companyAddress
        });
        const newState = { user, isLoading: false, isAuthenticated: true };
        updateGlobalAuthState(newState);
      } catch (error) {
        // Auth check failed, remove token and set unauthenticated
        localStorage.removeItem('token');
        const newState = { user: null, isLoading: false, isAuthenticated: false };
        updateGlobalAuthState(newState);
      }
    };

    initAuth();
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('token', token);
    const newState = { user, isLoading: false, isAuthenticated: true };
    updateGlobalAuthState(newState);
  };

  const logout = () => {
    localStorage.removeItem('token');
    const newState = { user: null, isLoading: false, isAuthenticated: false };
    updateGlobalAuthState(newState);
  };

  const updateUser = (updatedUser: User) => {
    const newState = { ...authState, user: updatedUser };
    updateGlobalAuthState(newState);
  };

  return {
    ...authState,
    login,
    logout,
    updateUser,
  };
}