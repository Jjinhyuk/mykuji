"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Play, Pause, Square, RotateCcw } from "lucide-react";

interface Props {
  boardId: string;
  currentStatus: string;
}

export function BoardStatusButtons({ boardId, currentStatus }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const updateStatus = async (newStatus: string) => {
    const { error } = await supabase
      .from("boards")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", boardId);

    if (error) {
      toast.error("상태 변경에 실패했습니다");
      return;
    }

    toast.success(
      newStatus === "live"
        ? "방송 시작!"
        : newStatus === "paused"
          ? "일시중지됨"
          : newStatus === "closed"
            ? "종료됨"
            : "초안으로 변경"
    );
    router.refresh();
  };

  return (
    <div className="flex flex-wrap gap-3">
      {currentStatus !== "live" && currentStatus !== "closed" && (
        <Button
          onClick={() => updateStatus("live")}
          className="bg-green-600 hover:bg-green-700"
        >
          <Play className="w-4 h-4 mr-2" />
          방송 시작
        </Button>
      )}

      {currentStatus === "live" && (
        <Button
          onClick={() => updateStatus("paused")}
          className="bg-yellow-600 hover:bg-yellow-700"
        >
          <Pause className="w-4 h-4 mr-2" />
          일시중지
        </Button>
      )}

      {currentStatus === "paused" && (
        <Button
          onClick={() => updateStatus("live")}
          className="bg-green-600 hover:bg-green-700"
        >
          <Play className="w-4 h-4 mr-2" />
          재개
        </Button>
      )}

      {(currentStatus === "live" || currentStatus === "paused") && (
        <Button
          onClick={() => updateStatus("closed")}
          variant="outline"
          className="border-red-600 text-red-400 hover:bg-red-900/20"
        >
          <Square className="w-4 h-4 mr-2" />
          종료
        </Button>
      )}

      {currentStatus === "closed" && (
        <Button
          onClick={() => updateStatus("draft")}
          variant="outline"
          className="border-gray-600"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          초안으로 되돌리기
        </Button>
      )}
    </div>
  );
}
