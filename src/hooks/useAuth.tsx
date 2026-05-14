import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";

type AppRole = Enums<"app_role">;

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  isHost: boolean;
  isClient: boolean;
  isAdmin: boolean;
  isBackOffice: boolean;
  isStaff: boolean;
  phoneVerified: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  refreshPhoneVerified: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRoles = async (uid: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data || []).map((r) => r.role as AppRole));
  };

  const loadPhoneVerified = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("phone_verified").eq("user_id", uid).maybeSingle();
    setPhoneVerified(!!data?.phone_verified);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => {
          loadRoles(s.user.id);
          loadPhoneVerified(s.user.id);
        }, 0);
      } else {
        setRoles([]);
        setPhoneVerified(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        Promise.all([loadRoles(s.user.id), loadPhoneVerified(s.user.id)]).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setPhoneVerified(false);
  };

  const refreshRoles = async () => {
    if (user) await loadRoles(user.id);
  };

  const refreshPhoneVerified = async () => {
    if (user) await loadPhoneVerified(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        roles,
        loading,
        isHost: roles.includes("host"),
        isClient: roles.includes("client"),
        isAdmin: roles.includes("admin"),
        isBackOffice: roles.includes("back_office" as AppRole),
        isStaff: roles.includes("admin") || roles.includes("back_office" as AppRole),
        phoneVerified,
        signOut,
        refreshRoles,
        refreshPhoneVerified,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
