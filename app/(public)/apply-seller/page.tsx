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
import { CheckCircle, Clock, XCircle } from "lucide-react";

export default function ApplySellerPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [existingApplication, setExistingApplication] = useState<{
    status: string;
  } | null>(null);
  const [profile, setProfile] = useState<{ role: string } | null>(null);

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

        // 프로필 확인
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const role = profileData?.role;
        setProfile(profileData);

        // 이미 판매자인 경우
        if (role === "seller" || role === "admin") {
          router.push("/seller");
          return;
        }

        // 기존 신청 확인
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!channelUrl.trim()) {
      toast.error("방송 채널 URL을 입력해주세요");
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

      const { error } = await supabase.from("seller_applications").insert({
        user_id: user.id,
        channel_url: channelUrl,
        channel_name: channelName || null,
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

  // 로그인 안 된 경우
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
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

  // 기존 신청이 있는 경우
  if (existingApplication) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <Link href="/">
            <h1 className="text-2xl font-bold text-indigo-400 mb-2">Mykuzi</h1>
          </Link>
          <CardTitle className="text-white">판매자 신청</CardTitle>
          <p className="text-gray-400 text-sm mt-2">
            라이브 방송 채널 정보를 입력해주세요
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-gray-300">방송 채널 URL *</Label>
              <Input
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                placeholder="https://..."
                className="bg-gray-700 border-gray-600 text-white mt-1"
                required
              />
              <p className="text-gray-500 text-xs mt-1">
                유튜브, 트위치, 아프리카TV 등 방송 채널 주소
              </p>
            </div>

            <div>
              <Label className="text-gray-300">채널명 (선택)</Label>
              <Input
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="채널 이름"
                className="bg-gray-700 border-gray-600 text-white mt-1"
              />
            </div>

            <div>
              <Label className="text-gray-300">추가 메모 (선택)</Label>
              <Textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="하고 싶은 말이 있다면 적어주세요"
                className="bg-gray-700 border-gray-600 text-white mt-1"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {isSubmitting ? "신청 중..." : "신청하기"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
