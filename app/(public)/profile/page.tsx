"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { User, LogOut, ArrowLeft } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setDisplayName(profileData.display_name || "");
      }

      setIsLoading(false);
    };

    loadProfile();
  }, [supabase, router]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("프로필이 저장되었습니다");
      setProfile({ ...profile, display_name: displayName });
    } catch (error) {
      console.error(error);
      toast.error("저장에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <p className="text-gray-400">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-black p-4 py-12">
      <div className="container max-w-lg mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </Link>

        <Card className="bg-gray-800/80 backdrop-blur-xl border-gray-700/50 rounded-3xl">
          <CardHeader className="text-center pb-2">
            <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-4 overflow-hidden">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="프로필"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-gray-400" />
              )}
            </div>
            <CardTitle className="text-xl text-white">내 프로필</CardTitle>
            <p className="text-gray-400 text-sm">{user?.email}</p>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div>
              <Label className="text-gray-300">닉네임</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="닉네임을 입력하세요"
                className="bg-gray-700/50 border-gray-600 text-white mt-1 h-12 rounded-xl"
              />
            </div>

            <div className="bg-gray-700/30 rounded-xl p-4">
              <p className="text-gray-400 text-sm">계정 상태</p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    profile?.role === "seller" || profile?.role === "admin"
                      ? "bg-green-400"
                      : "bg-gray-400"
                  }`}
                />
                <span className="text-white">
                  {profile?.role === "admin"
                    ? "관리자"
                    : profile?.role === "seller"
                    ? "판매자"
                    : "일반 회원"}
                </span>
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 rounded-xl"
            >
              {isSaving ? "저장 중..." : "저장하기"}
            </Button>

            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full h-12 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl"
            >
              <LogOut className="w-4 h-4 mr-2" />
              로그아웃
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
