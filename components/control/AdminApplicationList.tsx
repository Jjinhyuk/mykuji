"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Check, X, ExternalLink, User } from "lucide-react";

interface ApplicationProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
}

interface Application {
  id: string;
  user_id: string;
  channel_url: string | null;
  channel_name: string | null;
  memo: string | null;
  status: string;
  created_at: string;
  profiles: ApplicationProfile | null;
}

interface Props {
  applications: Application[];
}

export function AdminApplicationList({ applications }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const handleApprove = async (application: Application) => {
    try {
      // 1. 신청 상태 업데이트
      const { error: appError } = await supabase
        .from("seller_applications")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (appError) throw appError;

      // 2. 사용자 역할 업데이트
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role: "seller" })
        .eq("id", application.user_id);

      if (profileError) throw profileError;

      toast.success("승인되었습니다");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("승인에 실패했습니다");
    }
  };

  const handleReject = async (application: Application) => {
    try {
      const { error } = await supabase
        .from("seller_applications")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (error) throw error;

      toast.success("반려되었습니다");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("반려에 실패했습니다");
    }
  };

  const statusColors = {
    pending: "bg-yellow-500",
    approved: "bg-green-500",
    rejected: "bg-red-500",
  };

  const statusLabels = {
    pending: "대기중",
    approved: "승인됨",
    rejected: "반려됨",
  };

  return (
    <div className="space-y-4">
      {applications.map((app) => (
        <div
          key={app.id}
          className="bg-gray-700/50 rounded-xl p-4 flex items-start justify-between gap-4"
        >
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* 프로필 이미지 */}
            <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {app.profiles?.avatar_url ? (
                <img
                  src={app.profiles.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-gray-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <p className="text-white font-medium">
                  {app.profiles?.display_name || "이름 없음"}
                </p>
                <Badge
                  className={`${statusColors[app.status as keyof typeof statusColors]} text-white text-xs`}
                >
                  {statusLabels[app.status as keyof typeof statusLabels]}
                </Badge>
              </div>

              <div className="text-sm text-gray-400 space-y-1">
                {/* 채널 정보 */}
                <p className="truncate">
                  {app.channel_name || "(채널명 없음)"}
                </p>

                {app.channel_url && (
                  <a
                    href={app.channel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-indigo-400 truncate"
                  >
                    {app.channel_url}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                )}

                <p className="text-gray-500">
                  {new Date(app.created_at).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              {app.memo && (
                <p className="text-gray-500 text-sm mt-2 bg-gray-800/50 rounded-lg p-2">
                  {app.memo}
                </p>
              )}
            </div>
          </div>

          {app.status === "pending" && (
            <div className="flex gap-2 flex-shrink-0">
              <Button
                onClick={() => handleApprove(app)}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-1" />
                승인
              </Button>
              <Button
                onClick={() => handleReject(app)}
                size="sm"
                variant="outline"
                className="border-red-600 text-red-400 hover:bg-red-900/20"
              >
                <X className="w-4 h-4 mr-1" />
                반려
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
