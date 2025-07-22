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

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setAuthState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }

      try {
        const response = await apiRequest('GET', '/api/auth/me');
        const user = await response.json();
        setAuthState({ user, isLoading: false, isAuthenticated: true });
      } catch (error) {
        // Auth check failed, remove token and set unauthenticated
        localStorage.removeItem('token');
        setAuthState({ user: null, isLoading: false, isAuthenticated: false });
      }
    };

    initAuth();
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('token', token);
    setAuthState({ user, isLoading: false, isAuthenticated: true });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setAuthState({ user: null, isLoading: false, isAuthenticated: false });
  };

  const updateUser = (updatedUser: User) => {
    setAuthState(prev => ({ ...prev, user: updatedUser }));
  };

  return {
    ...authState,
    login,
    logout,
    updateUser,
  };
}