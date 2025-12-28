"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Pencil, Trash2, AlertTriangle } from "lucide-react";

interface Board {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface Props {
  board: Board;
  hasDrawEvents: boolean;
}

const statusColors = {
  draft: "bg-gray-500",
  live: "bg-green-500",
  paused: "bg-yellow-500",
  closed: "bg-red-500",
};

const statusLabels = {
  draft: "초안",
  live: "진행중",
  paused: "일시중지",
  closed: "종료",
};

export function BoardCard({ board, hasDrawEvents }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canEdit = !hasDrawEvents && board.status === "draft";

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // 관련 데이터 먼저 삭제
      await supabase.from("draw_events").delete().eq("board_id", board.id);
      await supabase.from("prizes").delete().eq("board_id", board.id);
      await supabase.from("overlay_states").delete().eq("board_id", board.id);

      const { error } = await supabase
        .from("boards")
        .delete()
        .eq("id", board.id);

      if (error) throw error;

      toast.success("쿠지판이 삭제되었습니다");
      setShowDeleteModal(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("삭제에 실패했습니다");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors relative group">
        <Link href={`/seller/boards/${board.id}`}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-white text-lg pr-8">
                {board.title}
              </CardTitle>
              <Badge
                className={`${statusColors[board.status as keyof typeof statusColors]} text-white`}
              >
                {statusLabels[board.status as keyof typeof statusLabels]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm line-clamp-2">
              {board.description || "설명 없음"}
            </p>
            <p className="text-gray-500 text-xs mt-2">
              {new Date(board.created_at).toLocaleDateString("ko-KR")}
            </p>
          </CardContent>
        </Link>

        {/* 액션 버튼 */}
        <div className="absolute top-3 right-12 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canEdit ? (
            <Link href={`/seller/boards/${board.id}/edit`}>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700"
                onClick={(e) => e.stopPropagation()}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-gray-600 cursor-not-allowed"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toast.error("추첨이 진행된 쿠지판은 수정할 수 없습니다");
              }}
              title="추첨이 진행된 쿠지판은 수정할 수 없습니다"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-900/20"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowDeleteModal(true);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-700 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">쿠지판 삭제</h3>
                <p className="text-gray-400 text-sm">이 작업은 되돌릴 수 없습니다</p>
              </div>
            </div>

            <p className="text-gray-300 mb-6">
              <span className="font-semibold text-white">"{board.title}"</span> 쿠지판을 정말 삭제하시겠습니까?
              <br />
              <span className="text-gray-400 text-sm">
                모든 경품 정보와 추첨 기록이 함께 삭제됩니다.
              </span>
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-gray-600"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                취소
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
