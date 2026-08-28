"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { 
  ShieldAlert, 
  Database, 
  Activity, 
  HardDrive, 
  Terminal, 
  Settings, 
  Loader2, 
  Shield, 
  CheckCircle,
  Inbox,
  UserCheck,
  UserX,
  UserPlus,
  Clock,
  Check,
  X,
  Filter,
  Users
} from "lucide-react";
import { updateUserRoleAction, updateUserStatusAction, createFacultyAccountAction } from "@/lib/admin/actions";
import { RoleGuard } from "@/components/auth/role-guard";
import { AccessDenied } from "@/components/auth/access-denied";
import { cn } from "@/lib/utils";

export default function UsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "faculty" | "students">("all");

  // Invite/Create Faculty Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "panelist" as "adviser" | "panelist" | "coordinator",
    employeeNumber: "",
    specialization: "",
    academicRank: "Assistant Professor",
    password: "",
  });

  const loadUsersData = async () => {
    setLoading(true);
    try {
      // Fetch profiles, roles, and faculty records
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          first_name,
          last_name,
          email,
          status,
          created_at,
          user_roles (
            roles ( code, name )
          ),
          faculty (
            employee_number,
            specialization,
            academic_rank
          ),
          departments ( name )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to fetch profiles registry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersData();
  }, []);

  const handleRoleChange = async (profileId: string, roleCode: string) => {
    setUpdatingId(profileId);
    try {
      await updateUserRoleAction(profileId, roleCode);
      toast.success("User role reassigned successfully!");
      loadUsersData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to reassign role.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusChange = async (profileId: string, newStatus: "approved" | "rejected" | "suspended" | "pending") => {
    setUpdatingId(profileId);
    try {
      await updateUserStatusAction(profileId, newStatus);
      toast.success(`Account status updated to "${newStatus}"!`);
      loadUsersData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.firstName || !inviteForm.lastName || !inviteForm.email || !inviteForm.employeeNumber) {
      toast.error("Please fill in all required fields (Name, Email, Employee ID)");
      return;
    }

    setInviting(true);
    try {
      const result = await createFacultyAccountAction({
        firstName: inviteForm.firstName,
        lastName: inviteForm.lastName,
        email: inviteForm.email,
        role: inviteForm.role,
        employeeNumber: inviteForm.employeeNumber,
        specialization: inviteForm.specialization,
        academicRank: inviteForm.academicRank,
        password: inviteForm.password || undefined,
      });

      if (result.temporaryPassword) {
        toast.success(`Faculty account created! Temp Password: ${result.temporaryPassword}`, { duration: 10000 });
      } else {
        toast.success("Faculty member created and verified successfully!");
      }

      setInviteModalOpen(false);
      setInviteForm({
        firstName: "",
        lastName: "",
        email: "",
        role: "panelist",
        employeeNumber: "",
        specialization: "",
        academicRank: "Assistant Professor",
        password: "",
      });
      loadUsersData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create faculty member.");
    } finally {
      setInviting(false);
    }
  };

  const pendingUsers = users.filter((u) => u.status === "pending");
  const facultyUsers = users.filter((u) => {
    const code = u.user_roles?.[0]?.roles?.code;
    return ["adviser", "panelist", "coordinator", "dean", "sys_admin"].includes(code);
  });
  const studentUsers = users.filter((u) => {
    const code = u.user_roles?.[0]?.roles?.code;
    return code === "student" || !code;
  });

  const displayedUsers = 
    activeTab === "pending" ? pendingUsers :
    activeTab === "faculty" ? facultyUsers :
    activeTab === "students" ? studentUsers :
    users;

  return (
    <RoleGuard allowedRoles={["sys_admin", "coordinator"]} fallback={<AccessDenied />}>
      <div className="mx-auto max-w-7xl space-y-6 text-xs font-semibold text-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management &amp; Security Console</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Verify faculty registration applications, onboard authorized evaluators, and manage university RBAC permissions.
            </p>
          </div>

          {/* Option B: Direct Add / Invite Faculty Button */}
          <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-bold shadow-sm self-start sm:self-auto">
                <UserPlus className="h-4 w-4" />
                Add / Invite Faculty Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Onboard Verified Faculty Member
                </DialogTitle>
                <CardDescription className="text-xs">
                  Create a pre-approved faculty account (Panelist, Adviser, or Coordinator) for official university evaluation duties.
                </CardDescription>
              </DialogHeader>

              <form onSubmit={handleCreateFaculty} className="space-y-3.5 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">First Name *</Label>
                    <Input
                      placeholder="e.g. Maria"
                      value={inviteForm.firstName}
                      onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Last Name *</Label>
                    <Input
                      placeholder="e.g. Santos"
                      value={inviteForm.lastName}
                      onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">University Email *</Label>
                  <Input
                    type="email"
                    placeholder="e.g. msantos@parsu.edu.ph"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Faculty Role *</Label>
                    <select
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="panelist">Defense Panelist</option>
                      <option value="adviser">Research Adviser</option>
                      <option value="coordinator">Research Coordinator</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Employee ID Number *</Label>
                    <Input
                      placeholder="e.g. PSU-FAC-2026-042"
                      value={inviteForm.employeeNumber}
                      onChange={(e) => setInviteForm({ ...inviteForm, employeeNumber: e.target.value })}
                      required
                    />
                  </div>
                </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Academic Rank (Optional)</Label>
                    <Input
                      placeholder="e.g. Associate Professor"
                      value={inviteForm.academicRank}
                      onChange={(e) => setInviteForm({ ...inviteForm, academicRank: e.target.value })}
                    />
                  </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">Initial Password (Optional)</Label>
                  <Input
                    type="password"
                    placeholder="Leave blank to auto-generate"
                    value={inviteForm.password}
                    onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                  />
                  <p className="text-[10px] text-muted-foreground">If left blank, a secure temporary password will be generated.</p>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setInviteModalOpen(false)}
                    disabled={inviting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={inviting} className="gap-1.5 font-bold">
                    {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Create Verified Account
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Pending Verification Notice Banner */}
        {pendingUsers.length > 0 && (
          <div className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700">
                <Clock className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-bold">
                  {pendingUsers.length} Faculty Registration {pendingUsers.length === 1 ? "Application" : "Applications"} Pending Verification
                </p>
                <p className="text-xs text-amber-800/80 mt-0.5">
                  These accounts are quarantined and cannot access defense workspaces, manuscripts, or evaluations until approved.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-400 bg-amber-100/50 text-amber-950 font-bold hover:bg-amber-100"
              onClick={() => setActiveTab("pending")}
            >
              Review Pending ({pendingUsers.length})
            </Button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
              activeTab === "all" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            All Accounts ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors relative",
              activeTab === "pending" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            Pending Verification
            {pendingUsers.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[9px] font-black">
                {pendingUsers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("faculty")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
              activeTab === "faculty" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Shield className="h-3.5 w-3.5" />
            Faculty &amp; Evaluators ({facultyUsers.length})
          </button>
          <button
            onClick={() => setActiveTab("students")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
              activeTab === "students" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Students ({studentUsers.length})
          </button>
        </div>

        {/* User Directory Table / Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center justify-between uppercase text-slate-800">
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-primary" /> 
                {activeTab === "pending" ? "Pending Faculty Applications" : "User Directory & Access Control"}
              </span>
              <span className="text-[10px] text-muted-foreground normal-case font-medium">
                Showing {displayedUsers.length} of {users.length} accounts
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : displayedUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-xs text-muted-foreground">
                <Inbox className="h-8 w-8 opacity-30 mb-2" />
                <p>No user accounts found in this view.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {displayedUsers.map((user) => {
                  const roleLink = user.user_roles?.[0]?.roles;
                  const currentRole = roleLink?.code || "student";
                  const currentRoleName = roleLink?.name || "Student";
                  const name = `${user.first_name} ${user.last_name}`;
                  const isPending = user.status === "pending";
                  const isFaculty = ["adviser", "panelist", "coordinator"].includes(currentRole);
                  const employeeNum = user.faculty?.[0]?.employee_number || user.faculty?.employee_number;

                  return (
                    <div 
                      key={user.id} 
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 text-xs font-semibold transition-colors",
                        isPending && "bg-amber-500/5 hover:bg-amber-500/10"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className={cn(isPending && "ring-2 ring-amber-500/50")}>
                          <AvatarFallback className="font-extrabold uppercase">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900">{name}</p>
                            {isPending && (
                              <Badge variant="warning" className="text-[8px] font-black uppercase">
                                Action Required: Pending Verification
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                          
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <Badge variant="info" className="text-[8px] font-extrabold uppercase">
                              {currentRoleName}
                            </Badge>

                            <Badge 
                              variant={
                                user.status === "approved" ? "success" : 
                                user.status === "pending" ? "warning" : 
                                user.status === "rejected" ? "danger" : "outline"
                              } 
                              className="text-[8px] font-extrabold uppercase capitalize"
                            >
                              Status: {user.status}
                            </Badge>

                            {employeeNum && (
                              <span className="text-[9px] text-muted-foreground font-mono">
                                ID: {employeeNum}
                              </span>
                            )}

                            {user.departments?.name && (
                              <span className="text-[9px] text-muted-foreground">
                                • {user.departments.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons / Controls */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        {updatingId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : isPending ? (
                          /* Quick Verification Approval / Rejection buttons */
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="h-8 text-xs gap-1 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleStatusChange(user.id, "approved")}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Approve Faculty
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1 font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
                              onClick={() => handleStatusChange(user.id, "rejected")}
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          /* Standard RBAC & Status selectors */
                          <div className="flex items-center gap-2">
                            <select
                              value={user.status}
                              onChange={(e) => handleStatusChange(user.id, e.target.value as any)}
                              className="h-8 rounded-lg border border-border bg-card px-2 text-[10px] font-bold focus:outline-none cursor-pointer"
                              title="Account Status"
                            >
                              <option value="approved">Approved</option>
                              <option value="pending">Pending</option>
                              <option value="suspended">Suspended</option>
                              <option value="rejected">Rejected</option>
                            </select>

                            <select
                              value={currentRole}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              className="h-8 rounded-lg border border-border bg-card px-2 text-[10px] font-bold focus:outline-none cursor-pointer"
                              title="Reassign Role"
                            >
                              <option value="student">Student</option>
                              <option value="adviser">Adviser</option>
                              <option value="panelist">Panelist</option>
                              <option value="coordinator">Coordinator</option>
                              <option value="sys_admin">System Admin</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
