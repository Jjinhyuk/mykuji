import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Square, Copy, ExternalLink, Settings } from "lucide-react";
import { BoardStatusButtons } from "@/components/control/BoardStatusButtons";

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

export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: board } = await supabase
    .from("boards")
    .select("*")
    .eq("id", boardId)
    .eq("seller_id", user.id)
    .single();

  if (!board) notFound();

  const { data: prizes } = await supabase
    .from("prizes")
    .select("*")
    .eq("board_id", boardId)
    .order("sort_order");

  const { data: drawEvents } = await supabase
    .from("draw_events")
    .select("*, prizes(*)")
    .eq("board_id", boardId)
    .order("created_at", { ascending: false })
    .limit(10);

  const totalDraws = prizes?.reduce((sum, p) => sum + p.qty_total, 0) || 0;
  const remainingDraws = prizes?.reduce((sum, p) => sum + p.qty_left, 0) || 0;
  const overlayUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/o/${board.id}?token=${board.overlay_token}`;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">{board.title}</h1>
            <Badge
              className={`${statusColors[board.status as keyof typeof statusColors]} text-white`}
            >
              {statusLabels[board.status as keyof typeof statusLabels]}
            </Badge>
          </div>
          <p className="text-gray-400 mt-1">{board.description || "설명 없음"}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/seller/boards/${boardId}/control`}>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Play className="w-4 h-4 mr-2" />
              컨트롤룸
            </Button>
          </Link>
        </div>
      </div>

      {/* 현황 카드 */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <p className="text-gray-400 text-sm">총 뽑기</p>
            <p className="text-3xl font-bold text-white">{totalDraws}</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <p className="text-gray-400 text-sm">남은 뽑기</p>
            <p className="text-3xl font-bold text-indigo-400">{remainingDraws}</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <p className="text-gray-400 text-sm">진행률</p>
            <p className="text-3xl font-bold text-green-400">
              {totalDraws > 0 ? Math.round(((totalDraws - remainingDraws) / totalDraws) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <p className="text-gray-400 text-sm">추첨 횟수</p>
            <p className="text-3xl font-bold text-purple-400">{drawEvents?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* 상태 변경 */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">보드 상태</CardTitle>
        </CardHeader>
        <CardContent>
          <BoardStatusButtons boardId={board.id} currentStatus={board.status} />
        </CardContent>
      </Card>

      {/* 오버레이 URL */}
      <Card className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border-indigo-700">
        <CardHeader>
          <CardTitle className="text-white">OBS 오버레이 URL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <code className="flex-1 bg-gray-900 px-4 py-3 rounded-lg text-gray-300 text-sm overflow-x-auto">
              {overlayUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/o/${board.id}?token=${board.overlay_token}`}
            </code>
            <Button
              variant="outline"
              className="border-gray-600"
              onClick={() => {
                navigator.clipboard.writeText(overlayUrl);
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Link href={`/o/${board.id}?token=${board.overlay_token}`} target="_blank">
              <Button variant="outline" className="border-gray-600">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            이 URL을 OBS 브라우저 소스에 추가하세요. 크기: 1920x1080 권장
          </p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 경품 목록 */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">경품 현황</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {prizes?.map((prize) => (
              <div
                key={prize.id}
                className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3"
              >
                <div className="flex items-center gap-3">
                  {prize.images?.[0] && (
                    <img
                      src={prize.images[0]}
                      alt=""
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  <div>
                    <p className="text-white font-medium">{prize.tier}</p>
                    <p className="text-gray-400 text-sm">{prize.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">
                    {prize.qty_left} / {prize.qty_total}
                  </p>
                  <div className="w-20 h-2 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500"
                      style={{
                        width: `${(prize.qty_left / prize.qty_total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 최근 추첨 기록 */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">최근 추첨 기록</CardTitle>
          </CardHeader>
          <CardContent>
            {drawEvents && drawEvents.length > 0 ? (
              <div className="space-y-2">
                {drawEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3"
                  >
                    <div>
                      <p className="text-white font-medium">{event.viewer_name}</p>
                      <p className="text-gray-400 text-sm">
                        {new Date(event.created_at).toLocaleTimeString("ko-KR")}
                      </p>
                    </div>
                    <Badge className="bg-indigo-600">
                      {(event.prizes as { tier: string; name: string } | null)?.tier || "꽝"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">아직 추첨 기록이 없습니다</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
