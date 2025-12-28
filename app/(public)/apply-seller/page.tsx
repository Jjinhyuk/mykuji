"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";
import { CheckCircle, Clock, XCircle, Check } from "lucide-react";

const PLATFORMS = [
  { id: "youtube", name: "YouTube", icon: "🎬", color: "bg-red-500/20 border-red-500/50 hover:bg-red-500/30" },
  { id: "twitch", name: "Twitch", icon: "🟣", color: "bg-purple-500/20 border-purple-500/50 hover:bg-purple-500/30" },
  { id: "afreeca", name: "아프리카TV", icon: "🔵", color: "bg-blue-500/20 border-blue-500/50 hover:bg-blue-500/30" },
  { id: "soop", name: "SOOP", icon: "🟢", color: "bg-green-500/20 border-green-500/50 hover:bg-green-500/30" },
  { id: "chzzk", name: "치지직", icon: "🟩", color: "bg-emerald-500/20 border-emerald-500/50 hover:bg-emerald-500/30" },
  { id: "tiktok", name: "TikTok", icon: "🎵", color: "bg-pink-500/20 border-pink-500/50 hover:bg-pink-500/30" },
  { id: "instagram", name: "Instagram", icon: "📸", color: "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-pink-500/50 hover:from-purple-500/30 hover:to-pink-500/30" },
  { id: "facebook", name: "Facebook", icon: "📘", color: "bg-blue-600/20 border-blue-600/50 hover:bg-blue-600/30" },
  { id: "naver", name: "네이버 쇼핑라이브", icon: "🛒", color: "bg-green-600/20 border-green-600/50 hover:bg-green-600/30" },
  { id: "kakao", name: "카카오 쇼핑라이브", icon: "💬", color: "bg-yellow-500/20 border-yellow-500/50 hover:bg-yellow-500/30" },
  { id: "bigo", name: "BIGO LIVE", icon: "🌟", color: "bg-cyan-500/20 border-cyan-500/50 hover:bg-cyan-500/30" },
  { id: "kick", name: "Kick", icon: "💚", color: "bg-lime-500/20 border-lime-500/50 hover:bg-lime-500/30" },
  { id: "other", name: "기타", icon: "📺", color: "bg-gray-500/20 border-gray-500/50 hover:bg-gray-500/30" },
];

export default function ApplySellerPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [existingApplication, setExistingApplication] = useState<{
    status: string;
  } | null>(null);
  const [profile, setProfile] = useState<{ role: string } | null>(null);

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [channelUrl, setChannelUrl] = useState("");
  const [channelName, setChannelName] = useState("");
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setIsLoggedIn(true);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = profileData?.role;
        setProfile(profileData);

        if (role === "seller" || role === "admin") {
          router.push("/seller");
          return;
        }

        const { data: application } = await supabase
          .from("seller_applications")
          .select("status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        setExistingApplication(application);
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [supabase, router]);

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedPlatforms.length === 0) {
      toast.error("최소 하나의 플랫폼을 선택해주세요");
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("로그인이 필요합니다");
        return;
      }

      const platformNames = selectedPlatforms
        .map((id) => PLATFORMS.find((p) => p.id === id)?.name)
        .filter(Boolean)
        .join(", ");

      const { error } = await supabase.from("seller_applications").insert({
        user_id: user.id,
        channel_url: channelUrl || null,
        channel_name: `[${platformNames}] ${channelName || ""}`.trim(),
        memo: memo || null,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("이미 신청하셨습니다");
        } else {
          throw error;
        }
        return;
      }

      toast.success("신청이 완료되었습니다!");
      setExistingApplication({ status: "pending" });
    } catch (error) {
      console.error(error);
      toast.error("신청에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <p className="text-gray-400">로딩 중...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800/80 backdrop-blur-xl border-gray-700/50 rounded-3xl">
          <CardHeader className="text-center">
            <Link href="/">
              <h1 className="text-2xl font-bold text-indigo-400 mb-2">Mykuzi</h1>
            </Link>
            <CardTitle className="text-white">판매자 신청</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-400 mb-6">
              판매자 신청을 하려면 먼저 로그인해주세요
            </p>
            <Link href="/login">
              <Button className="bg-indigo-600 hover:bg-indigo-700">로그인하기</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (existingApplication) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800/80 backdrop-blur-xl border-gray-700/50 rounded-3xl">
          <CardHeader className="text-center">
            <Link href="/">
              <h1 className="text-2xl font-bold text-indigo-400 mb-2">Mykuzi</h1>
            </Link>
            <CardTitle className="text-white">신청 현황</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            {existingApplication.status === "pending" && (
              <div className="py-8">
                <Clock className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
                <p className="text-xl text-white font-semibold">심사 중</p>
                <p className="text-gray-400 mt-2">
                  신청이 접수되었습니다. 심사 후 결과를 알려드릴게요.
                </p>
              </div>
            )}
            {existingApplication.status === "approved" && (
              <div className="py-8">
                <CheckCircle className="w-16 h-16 mx-auto text-green-400 mb-4" />
                <p className="text-xl text-white font-semibold">승인됨</p>
                <p className="text-gray-400 mt-2">
                  축하합니다! 이제 쿠지판을 만들 수 있습니다.
                </p>
                <Link href="/seller">
                  <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700">
                    대시보드로 이동
                  </Button>
                </Link>
              </div>
            )}
            {existingApplication.status === "rejected" && (
              <div className="py-8">
                <XCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
                <p className="text-xl text-white font-semibold">반려됨</p>
                <p className="text-gray-400 mt-2">
                  신청이 반려되었습니다. 문의사항은 관리자에게 연락해주세요.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-black flex items-center justify-center p-4 py-12">
      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <Card className="relative w-full max-w-2xl bg-gray-800/80 backdrop-blur-xl border-gray-700/50 rounded-3xl shadow-2xl">
        <CardHeader className="text-center pb-2">
          <Link href="/">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
              Mykuzi
            </h1>
          </Link>
          <CardTitle className="text-2xl text-white">판매자 신청</CardTitle>
          <p className="text-gray-400 mt-2">
            방송 플랫폼을 선택하고 정보를 입력해주세요
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 플랫폼 선택 */}
            <div>
              <Label className="text-gray-300 text-base font-medium">
                방송 플랫폼 선택 <span className="text-red-400">*</span>
              </Label>
              <p className="text-gray-500 text-sm mb-3">
                활동 중인 플랫폼을 모두 선택해주세요 (복수 선택 가능)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PLATFORMS.map((platform) => {
                  const isSelected = selectedPlatforms.includes(platform.id);
                  return (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => togglePlatform(platform.id)}
                      className={`relative flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                        isSelected
                          ? "bg-indigo-600/30 border-indigo-500 text-white"
                          : `${platform.color} border-transparent text-gray-300`
                      }`}
                    >
                      <span className="text-xl">{platform.icon}</span>
                      <span className="font-medium text-sm">{platform.name}</span>
                      {isSelected && (
                        <Check className="absolute top-2 right-2 w-4 h-4 text-indigo-400" />
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedPlatforms.length > 0 && (
                <p className="text-indigo-400 text-sm mt-2">
                  {selectedPlatforms.length}개 플랫폼 선택됨
                </p>
              )}
            </div>

            {/* 채널명 */}
            <div>
              <Label className="text-gray-300">채널명 / 활동명 (선택)</Label>
              <Input
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="방송에서 사용하는 이름"
                className="bg-gray-700/50 border-gray-600 text-white mt-1 h-12 rounded-xl"
              />
            </div>

            {/* 채널 URL */}
            <div>
              <Label className="text-gray-300">채널 URL (선택)</Label>
              <Input
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                placeholder="https://..."
                className="bg-gray-700/50 border-gray-600 text-white mt-1 h-12 rounded-xl"
              />
              <p className="text-gray-500 text-xs mt-1">
                대표 채널 주소가 있다면 입력해주세요
              </p>
            </div>

            {/* 메모 */}
            <div>
              <Label className="text-gray-300">추가 메모 (선택)</Label>
              <Textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="하고 싶은 말이 있다면 적어주세요"
                className="bg-gray-700/50 border-gray-600 text-white mt-1 rounded-xl min-h-[100px]"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || selectedPlatforms.length === 0}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-lg font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
            >
              {isSubmitting ? "신청 중..." : "판매자 신청하기"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
