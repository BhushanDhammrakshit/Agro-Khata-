"use client";

import { useEffect, useState } from "react";
import { api, AuthUser, TeamMember } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { inputClass } from "@/components/ui/styles";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { PhoneInput, withPrefix, stripPrefix } from "@/components/PhoneInput";

const ROLE_LABELS: Record<AuthUser["role"], string> = {
  owner: "Owner",
  staff: "Staff (can edit)",
  viewer: "Viewer (read-only)",
};

const ROLE_BADGE: Record<AuthUser["role"], string> = {
  owner: "bg-emerald-100 text-emerald-700",
  staff: "bg-blue-100 text-blue-700",
  viewer: "bg-slate-100 text-slate-600",
};

export default function TeamPage() {
  const [me, setMe] = useState<AuthUser | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", role: "staff" as AuthUser["role"] });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const isOwner = me?.role === "owner";

  useEffect(() => {
    Promise.all([api.getMe(), api.listUsers()])
      .then(([user, list]) => { setMe(user); setMembers(list); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    try {
      const added = await api.inviteUser({
        name: form.name,
        phone: withPrefix(form.phone),
        email: form.email || undefined,
        role: form.role,
      });
      setMembers((prev) => [...prev, added]);
      setForm({ name: "", phone: "", email: "", role: "staff" });
      setShowInvite(false);
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite user.");
    } finally {
      setInviting(false);
    }
  }

  async function toggleActive(member: TeamMember) {
    try {
      const updated = await api.updateUser(member.id, { isActive: !member.isActive });
      setMembers((prev) => prev.map((m) => (m.id === member.id ? updated : m)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update user.");
    }
  }

  async function changeRole(member: TeamMember, role: AuthUser["role"]) {
    try {
      const updated = await api.updateUser(member.id, { role });
      setMembers((prev) => prev.map((m) => (m.id === member.id ? updated : m)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update role.");
    }
  }

  return (
    <AppShell title="Team">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Team Members</h2>
            <p className="text-sm text-slate-500">
              {isOwner ? "Manage who can access your company." : "People who have access to this company."}
            </p>
          </div>
          {isOwner && !showInvite && (
            <Button onClick={() => setShowInvite(true)}>+ Invite Member</Button>
          )}
        </div>

        {/* Invite form */}
        {isOwner && showInvite && (
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-slate-700">Invite a new member</h3>
            <form onSubmit={handleInvite} className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Name
                <input
                  required
                  className={inputClass}
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Mobile Number
                <PhoneInput
                  required
                  value={form.phone}
                  onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Email (optional)
                <input
                  type="email"
                  className={inputClass}
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Role
                <CustomSelect
                  value={form.role}
                  onChange={(val) => setForm((f) => ({ ...f, role: val as AuthUser["role"] }))}
                  options={[
                    { value: "staff", label: "Staff (can edit)" },
                    { value: "viewer", label: "Viewer (read-only)" },
                  ]}
                />
              </label>

              {inviteError && (
                <p className="col-span-2 text-sm text-red-600">{inviteError}</p>
              )}

              <div className="col-span-2 flex gap-3">
                <Button type="submit" disabled={inviting}>
                  {inviting ? "Inviting…" : "Send Invite"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setShowInvite(false); setInviteError(null); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Members list */}
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <Card>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Mobile</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4">Status</th>
                  {isOwner && <th className="pb-2">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {members.map((member) => (
                  <tr key={member.id} className="align-middle">
                    <td className="py-3 pr-4 font-medium text-slate-800">
                      {member.name}
                      {member.id === me?.id && (
                        <span className="ml-2 text-xs text-slate-400">(you)</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-500">
                      {stripPrefix(member.phone)}
                    </td>
                    <td className="py-3 pr-4">
                      {isOwner && member.id !== me?.id && member.role !== "owner" ? (
                        <CustomSelect
                          value={member.role}
                          onChange={(val) => changeRole(member, val as AuthUser["role"])}
                          options={[
                            { value: "staff", label: "Staff" },
                            { value: "viewer", label: "Viewer" },
                          ]}
                        />
                      ) : (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[member.role]}`}>
                          {ROLE_LABELS[member.role]}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${member.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-500"}`}>
                        {member.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {isOwner && (
                      <td className="py-3">
                        {member.id !== me?.id && member.role !== "owner" && (
                          <button
                            onClick={() => toggleActive(member)}
                            className="cursor-pointer text-xs font-medium text-slate-500 hover:text-red-600 hover:underline"
                          >
                            {member.isActive ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
