"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

import { Profile } from "@/types/database";

export interface StudentProfileData {
  student_number: string;
  college_id: string | null;
  department_id: string | null;
  program_id: string | null;
  year_level: number | null;
}

export interface FacultyProfileData {
  employee_number: string;
  college_id: string | null;
  department_id: string | null;
}

export interface CoordinatorProfileData {
  assigned_department: string | null;
  assigned_college: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  permissions: string[];
  studentProfile: StudentProfileData | null;
  facultyProfile: FacultyProfileData | null;
  coordinatorProfile: CoordinatorProfileData | null;
  isLoading: boolean;
  hasRole: (roleCodes: string | string[]) => boolean;
  hasPermission: (permissionCode: string) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const supabase = createClient();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [studentProfile, setStudentProfile] =
    useState<StudentProfileData | null>(null);
  const [facultyProfile, setFacultyProfile] =
    useState<FacultyProfileData | null>(null);
  const [coordinatorProfile, setCoordinatorProfile] =
    useState<CoordinatorProfileData | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const loadingRef = useRef<string | null>(null);

  const clearAuthState = () => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setPermissions([]);
    setStudentProfile(null);
    setFacultyProfile(null);
    setCoordinatorProfile(null);
    loadingRef.current = null;
  };

  const loadUserProfile = async (userId: string) => {
    if (profile && profile.id === userId && roles.length > 0) {
      console.log("AUTH: Profile already loaded for", userId);
      setIsLoading(false);
      return;
    }

    if (loadingRef.current === userId) {
      console.log("AUTH: Profile already loading for", userId);
      return;
    }
    loadingRef.current = userId;

    try {
      console.log("AUTH STEP 3: profile fetch started for", userId);

      // 1. PROFILE
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("AUTH PROFILE ERROR (STEP 3):", profileError.message);
        toast.error("Failed to load profile: " + profileError.message);
        clearAuthState();
        setIsLoading(false);
        return;
      }

      if (!profileData) {
        console.error("AUTH PROFILE ERROR (STEP 3): Profile not found in DB");
        toast.error("Profile not found");
        clearAuthState();
        setIsLoading(false);
        return;
      }

      if (profileData.status !== "approved") {
        console.warn("AUTH PROFILE (STEP 3) - Account status not approved:", profileData.status);
        toast.error(`Account is ${profileData.status}`);
        await supabase.auth.signOut();
        clearAuthState();
        setIsLoading(false);
        return;
      }

      setProfile(profileData);
      console.log("AUTH STEP 3: profile fetched successfully:", profileData);

      // 2. ROLES
      console.log("AUTH STEP 4: role fetch started");
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("roles(code)")
        .eq("profile_id", userId);

      if (rolesError) {
        console.error("AUTH ROLES ERROR (STEP 4):", rolesError.message);
        toast.error("Failed to load roles");
        setRoles([]);
      }

      const roleCodes =
        userRoles
          ?.map((r: any) => {
            const role = Array.isArray(r.roles) ? r.roles[0] : r.roles;
            return role?.code;
          })
          .filter(Boolean) ?? [];

      setRoles(roleCodes);
      console.log("AUTH STEP 4: roles fetched successfully:", roleCodes);

      // 3. STUDENT PROFILE
      if (roleCodes.includes("student")) {
        try {
          const { data, error: studentError } = await supabase
            .from("students")
            .select("*")
            .eq("profile_id", userId)
            .maybeSingle();

          if (studentError) {
            console.error("AUTH STUDENT PROFILE ERROR:", studentError.message);
          } else if (data) {
            setStudentProfile({
              student_number: data.student_number,
              college_id: profileData.college_id,
              department_id: profileData.department_id,
              program_id: data.program,
              year_level: data.year_level,
            });
          }
        } catch (studentErr) {
          console.error("AUTH STUDENT PROFILE EXCEPTION:", studentErr);
        }
      }

      // 4. FACULTY PROFILE
      const facultyRoles = [
        "sys_admin",
        "coordinator",
        "panelist",
        "adviser",
      ];

      if (roleCodes.some((r) => facultyRoles.includes(r))) {
        try {
          const { data, error: facultyError } = await supabase
            .from("faculty")
            .select("*")
            .eq("profile_id", userId)
            .maybeSingle();

          if (facultyError) {
            console.error("AUTH FACULTY PROFILE ERROR:", facultyError.message);
          } else if (data) {
            setFacultyProfile({
              employee_number: data.employee_number,
              college_id: profileData.college_id,
              department_id: profileData.department_id,
            });
          }
        } catch (facultyErr) {
          console.error("AUTH FACULTY PROFILE EXCEPTION:", facultyErr);
        }
      }

      console.log("AUTH STEP 5: final auth state populated");
      setIsLoading(false);
    } catch (err: any) {
      console.error("AUTH LOAD ERROR:", err);
      toast.error("Auth loading failed");
      clearAuthState();
      setIsLoading(false);
    } finally {
      loadingRef.current = null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Check session on mount
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("AUTH: Initial session check error:", error);
          setIsLoading(false);
          return;
        }

        if (!mounted) return;

        if (session) {
          console.log("AUTH STEP 2: session result found on init:", session.user.email);
          setSession(session);
          setUser(session.user);
          await loadUserProfile(session.user.id);
        } else {
          console.log("AUTH STEP 2: no session found on init");
          setIsLoading(false);
        }
      } catch (err) {
        console.error("AUTH: Session check exception:", err);
        setIsLoading(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AUTH EVENT:", event);

      if (!mounted) return;

      if (!session) {
        console.log("AUTH: No session in auth event, clearing state");
        clearAuthState();
        setIsLoading(false);
        return;
      }

      console.log("AUTH STEP 2: session result updated in listener:", session.user.email);
      setSession(session);
      setUser(session.user);

      if (event === "SIGNED_IN") {
        setIsLoading(true);
        await loadUserProfile(session.user.id);
      } else if (event === "TOKEN_REFRESHED") {
        if (!profile) {
          setIsLoading(true);
          await loadUserProfile(session.user.id);
        }
      } else if (event === "SIGNED_OUT") {
        clearAuthState();
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const hasRole = (roleCodes: string | string[]) => {
    const arr = Array.isArray(roleCodes) ? roleCodes : [roleCodes];
    return roles.some((r) => arr.includes(r));
  };

  const hasPermission = (perm: string) => {
    return permissions.includes(perm) || roles.includes("sys_admin");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearAuthState();
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        permissions,
        studentProfile,
        facultyProfile,
        coordinatorProfile,
        isLoading,
        hasRole,
        hasPermission,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}