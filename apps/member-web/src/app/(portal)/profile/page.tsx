"use client";

import Link from "next/link";
import { LogOut, User, Phone, Mail, Bell, Shield } from "lucide-react";
import { Card, CardContent } from "@grwfit/ui";
import { useAuth } from "@/providers/auth-provider";

export default function ProfilePage() {
  const { session, logout } = useAuth();

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2">
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center py-4">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
          {session?.name.charAt(0).toUpperCase() ?? "?"}
        </div>
        <p className="text-lg font-bold mt-3">{session?.name}</p>
        {session?.planName && (
          <span className="text-xs bg-primary/10 text-primary rounded-full px-3 py-1 mt-1.5">{session.planName}</span>
        )}
      </div>

      {/* Info */}
      <Card>
        <CardContent className="pt-4 pb-4 divide-y">
          <div className="flex items-center gap-3 pb-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm font-medium">{session?.phone}</p>
            </div>
          </div>
          {session?.email && (
            <div className="flex items-center gap-3 pt-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{session.email}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardContent className="pt-2 pb-2 divide-y">
          <button className="flex items-center gap-3 w-full py-3 text-left">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Notification preferences</span>
          </button>
          <button className="flex items-center gap-3 w-full py-3 text-left">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Edit profile</span>
          </button>
          <Link href="/privacy" className="flex items-center gap-3 w-full py-3 text-left">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Privacy & Data</span>
          </Link>
        </CardContent>
      </Card>

      {/* Logout */}
      <button
        onClick={() => void logout()}
        className="w-full flex items-center justify-center gap-2 border border-destructive/50 text-destructive rounded-xl py-3 text-sm font-medium hover:bg-destructive/5 transition-colors"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}
