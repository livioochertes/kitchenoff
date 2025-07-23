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
  companyZip?: string;
  companyCountry?: string;
  billingEmail?: string;
  billingPhone?: string;
  // Delivery address
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryState?: string;
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

// Global authentication state to persist across component re-renders
let globalAuthState: AuthState | null = null;

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

  useEffect(() => {
    // If we already have authentication state, don't re-initialize
    if (globalAuthState && !globalAuthState.isLoading) {
      return;
    }

    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        const newState = { user: null, isLoading: false, isAuthenticated: false };
        setAuthState(newState);
        globalAuthState = newState;
        return;
      }

      try {
        const response = await apiRequest('GET', '/api/auth/me');
        const user = await response.json();
        const newState = { user, isLoading: false, isAuthenticated: true };
        setAuthState(newState);
        globalAuthState = newState;
      } catch (error) {
        // Auth check failed, remove token and set unauthenticated
        localStorage.removeItem('token');
        const newState = { user: null, isLoading: false, isAuthenticated: false };
        setAuthState(newState);
        globalAuthState = newState;
      }
    };

    initAuth();
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('token', token);
    const newState = { user, isLoading: false, isAuthenticated: true };
    setAuthState(newState);
    globalAuthState = newState;
  };

  const logout = () => {
    localStorage.removeItem('token');
    const newState = { user: null, isLoading: false, isAuthenticated: false };
    setAuthState(newState);
    globalAuthState = newState;
  };

  const updateUser = (updatedUser: User) => {
    const newState = { ...authState, user: updatedUser };
    setAuthState(newState);
    globalAuthState = newState;
  };

  return {
    ...authState,
    login,
    logout,
    updateUser,
  };
}