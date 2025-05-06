import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Remove password from User type for client-side
type UserWithoutPassword = {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string;
  telegramUsername?: string;
  telegramChatId?: string;
  points: number;
  lastLogin?: number;
  createdAt: number;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
};

interface AuthContextValue {
  user: UserWithoutPassword | null;
  isLoading: boolean;
  error: Error | null;
  login: (credentials: LoginData) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
}

// Create a default value for the context
const defaultContext: AuthContextValue = {
  user: null,
  isLoading: false,
  error: null,
  login: async () => {},
  logout: async () => {},
  register: async () => {}
};

const AuthContext = createContext<AuthContextValue>(defaultContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserWithoutPassword | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  // Check if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/user', {
          credentials: 'include',
        });

        if (res.status === 401) {
          setUser(null);
          return;
        }

        if (!res.ok) {
          throw new Error(`${res.status}: ${res.statusText}`);
        }

        const userData = await res.json();
        setUser(userData);
      } catch (err) {
        console.error('Error fetching user:', err);
        setUser(null);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();
  }, []);

  const login = async (credentials: LoginData) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiRequest('POST', '/api/login', credentials);
      const userData = await res.json();
      
      setUser(userData);
      toast({
        title: 'Login successful',
        description: `Welcome back, ${userData.firstName}!`,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Login failed'));
      toast({
        title: 'Login failed',
        description: err instanceof Error ? err.message : 'An error occurred during login',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiRequest('POST', '/api/register', userData);
      const newUser = await res.json();
      
      setUser(newUser);
      toast({
        title: 'Registration successful',
        description: `Welcome to KODJO ENGLISH BOT, ${newUser.firstName}!`,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Registration failed'));
      toast({
        title: 'Registration failed',
        description: err instanceof Error ? err.message : 'An error occurred during registration',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await apiRequest('POST', '/api/logout');
      
      setUser(null);
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Logout failed'));
      toast({
        title: 'Logout failed',
        description: err instanceof Error ? err.message : 'An error occurred during logout',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    error,
    login,
    logout,
    register
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
