"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Check, X, ExternalLink } from "lucide-react";
import { Profile, SellerApplication } from "@/lib/types/database";

interface ApplicationWithProfile extends SellerApplication {
  profiles: Profile | null;
}

interface Props {
  applications: ApplicationWithProfile[];
}

export function AdminApplicationList({ applications }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const handleApprove = async (application: ApplicationWithProfile) => {
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

  const handleReject = async (application: ApplicationWithProfile) => {
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

  if (applications.length === 0) {
    return <p className="text-gray-400 text-center py-8">신청 내역이 없습니다</p>;
  }

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
          className="bg-gray-700/50 rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <p className="text-white font-medium">
                {app.profiles?.display_name || "Unknown"}
              </p>
              <Badge
                className={`${statusColors[app.status as keyof typeof statusColors]} text-white`}
              >
                {statusLabels[app.status as keyof typeof statusLabels]}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <a
                href={app.channel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-indigo-400"
              >
                {app.channel_name || app.channel_url}
                <ExternalLink className="w-3 h-3" />
              </a>
              <span>
                {new Date(app.created_at).toLocaleDateString("ko-KR")}
              </span>
            </div>
            {app.memo && (
              <p className="text-gray-500 text-sm mt-2">{app.memo}</p>
            )}
          </div>

          {app.status === "pending" && (
            <div className="flex gap-2">
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
