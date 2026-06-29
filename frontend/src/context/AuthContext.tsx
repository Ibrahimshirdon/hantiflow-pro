import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import {
  getMe,
  registerCustomer as registerCustomerApi,
  type RegisterCustomerInput,
} from "@/api/auth.api";
import type { UserProfile } from "@/types/auth.types";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  registerCustomer: (input: RegisterCustomerInput) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          setProfile(await getMe());
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(firebaseAuth, email, password);
    const userProfile = await getMe();
    setProfile(userProfile);
    return userProfile;
  }

  async function registerCustomer(input: RegisterCustomerInput) {
    await registerCustomerApi(input);
    await signInWithEmailAndPassword(firebaseAuth, input.email, input.password);
    const userProfile = await getMe();
    setProfile(userProfile);
    return userProfile;
  }

  async function logout() {
    await signOut(firebaseAuth);
  }

  async function refreshProfile() {
    setProfile(await getMe());
  }

  return (
    <AuthContext.Provider
      value={{ firebaseUser, profile, loading, login, registerCustomer, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context + hook co-location is intentional
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
