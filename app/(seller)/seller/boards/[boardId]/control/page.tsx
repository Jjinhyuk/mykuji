"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Prize, Board, OverlayState } from "@/lib/types/database";
import {
  ArrowLeft,
  Send,
  Eye,
  EyeOff,
  RotateCcw,
  Volume2,
  VolumeX,
  Keyboard,
} from "lucide-react";
import Link from "next/link";

const TIER_COLORS: Record<string, string> = {
  "1등": "from-yellow-400 to-amber-500",
  "2등": "from-gray-300 to-gray-400",
  "3등": "from-orange-400 to-orange-600",
  "4등": "from-indigo-400 to-indigo-600",
  "5등": "from-emerald-400 to-emerald-600",
  꽝: "from-gray-500 to-gray-600",
};

export default function ControlRoomPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [board, setBoard] = useState<Board | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [drawEvents, setDrawEvents] = useState<any[]>([]);
  const [overlayState, setOverlayState] = useState<OverlayState | null>(null);

  const [viewerName, setViewerName] = useState("");
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // 데이터 로드
  const loadData = useCallback(async () => {
    const [boardRes, prizesRes, eventsRes, overlayRes] = await Promise.all([
      supabase.from("boards").select("*").eq("id", boardId).single(),
      supabase.from("prizes").select("*").eq("board_id", boardId).order("sort_order"),
      supabase
        .from("draw_events")
        .select("*, prizes(*)")
        .eq("board_id", boardId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("overlay_states").select("*").eq("board_id", boardId).single(),
    ]);

    if (boardRes.data) setBoard(boardRes.data);
    if (prizesRes.data) setPrizes(prizesRes.data);
    if (eventsRes.data) setDrawEvents(eventsRes.data);
    if (overlayRes.data) setOverlayState(overlayRes.data);
  }, [boardId, supabase]);

  useEffect(() => {
    loadData();

    // Realtime 구독
    const channel = supabase
      .channel(`control-${boardId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prizes", filter: `board_id=eq.${boardId}` },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "draw_events", filter: `board_id=eq.${boardId}` },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, loadData, supabase]);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 중이면 무시
      if (document.activeElement === inputRef.current) {
        if (e.key === "Enter" && selectedPrize) {
          e.preventDefault();
          handleDraw();
        }
        return;
      }

      // 숫자키로 경품 선택
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= prizes.length) {
        setSelectedPrize(prizes[num - 1]);
        inputRef.current?.focus();
      }

      // Escape로 선택 해제
      if (e.key === "Escape") {
        setSelectedPrize(null);
        setViewerName("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prizes, selectedPrize]);

  // 추첨 실행
  const handleDraw = async () => {
    if (!selectedPrize || !viewerName.trim()) {
      toast.error("경품과 시청자 이름을 입력해주세요");
      return;
    }

    if (selectedPrize.qty_left <= 0) {
      toast.error("남은 수량이 없습니다");
      return;
    }

    setIsDrawing(true);

    try {
      // 1. 추첨 이벤트 생성
      await supabase.from("draw_events").insert({
        board_id: boardId,
        prize_id: selectedPrize.id,
        viewer_name: viewerName.trim(),
      });

      // 2. 경품 수량 감소
      await supabase
        .from("prizes")
        .update({ qty_left: selectedPrize.qty_left - 1 })
        .eq("id", selectedPrize.id);

      // 3. 오버레이 상태 업데이트 (결과 표시)
      await supabase.from("overlay_states").update({
        show_last_result: true,
        focused_prize_id: selectedPrize.id,
        updated_at: new Date().toISOString(),
      }).eq("board_id", boardId);

      toast.success(`${viewerName}님 - ${selectedPrize.tier} 당첨!`);

      // 초기화
      setViewerName("");
      setSelectedPrize(null);
      inputRef.current?.focus();

      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("추첨에 실패했습니다");
    } finally {
      setIsDrawing(false);
    }
  };

  // 오버레이 제어
  const toggleModal = async (open: boolean, prizeId?: string) => {
    await supabase.from("overlay_states").update({
      is_modal_open: open,
      focused_prize_id: prizeId || null,
      updated_at: new Date().toISOString(),
    }).eq("board_id", boardId);
    await loadData();
  };

  const hideResult = async () => {
    await supabase.from("overlay_states").update({
      show_last_result: false,
      updated_at: new Date().toISOString(),
    }).eq("board_id", boardId);
    await loadData();
  };

  if (!board) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    );
  }

  const totalRemaining = prizes.reduce((sum, p) => sum + p.qty_left, 0);
  const totalPrizes = prizes.reduce((sum, p) => sum + p.qty_total, 0);

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/seller/boards/${boardId}`}>
            <Button variant="ghost" size="icon" className="text-gray-400">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{board.title}</h1>
            <p className="text-gray-400">
              컨트롤룸 · 남은 뽑기: {totalRemaining}/{totalPrizes}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="border-gray-600"
          >
            <Keyboard className="w-4 h-4 mr-1" />
            단축키
          </Button>
          <Link href={`/o/${boardId}?token=${board.overlay_token}`} target="_blank">
            <Button variant="outline" size="sm" className="border-gray-600">
              <Eye className="w-4 h-4 mr-1" />
              오버레이
            </Button>
          </Link>
        </div>
      </div>

      {/* 단축키 안내 */}
      {showShortcuts && (
        <Card className="bg-indigo-900/30 border-indigo-700">
          <CardContent className="py-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-gray-300">
                <kbd className="px-2 py-1 bg-gray-700 rounded mr-1">1-9</kbd> 경품 선택
              </span>
              <span className="text-gray-300">
                <kbd className="px-2 py-1 bg-gray-700 rounded mr-1">Enter</kbd> 추첨
              </span>
              <span className="text-gray-300">
                <kbd className="px-2 py-1 bg-gray-700 rounded mr-1">Esc</kbd> 선택 해제
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* 빠른 추첨 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 경품 선택 그리드 */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg">경품 선택</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {prizes.filter(p => p.tier !== "꽝").map((prize, index) => (
                  <button
                    key={prize.id}
                    onClick={() => {
                      setSelectedPrize(prize);
                      inputRef.current?.focus();
                    }}
                    disabled={prize.qty_left <= 0}
                    className={`relative p-4 rounded-xl transition-all ${
                      selectedPrize?.id === prize.id
                        ? "ring-2 ring-indigo-500 bg-indigo-900/30"
                        : "bg-gray-700/50 hover:bg-gray-700"
                    } ${prize.qty_left <= 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {/* 숫자 키 표시 */}
                    <div className="absolute top-2 right-2 w-6 h-6 rounded bg-gray-600 flex items-center justify-center text-xs text-gray-300">
                      {index + 1}
                    </div>

                    {/* 경품 정보 */}
                    <div
                      className={`w-14 h-14 mx-auto rounded-xl bg-gradient-to-br ${TIER_COLORS[prize.tier] || "from-gray-500 to-gray-600"} flex items-center justify-center mb-2`}
                    >
                      {prize.images?.[0] ? (
                        <img
                          src={prize.images[0]}
                          alt=""
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      ) : (
                        <span className="text-white font-bold">{prize.tier}</span>
                      )}
                    </div>
                    <p className="text-white font-medium text-sm truncate">{prize.name}</p>
                    <p className="text-gray-400 text-xs">
                      남은 수량:{" "}
                      <span className={prize.qty_left > 0 ? "text-green-400" : "text-red-400"}>
                        {prize.qty_left}
                      </span>
                      /{prize.qty_total}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 추첨 입력 */}
          <Card
            className={`border-2 transition-colors ${
              selectedPrize
                ? "bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border-indigo-500"
                : "bg-gray-800 border-gray-700"
            }`}
          >
            <CardContent className="py-6">
              {selectedPrize ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 h-16 rounded-xl bg-gradient-to-br ${TIER_COLORS[selectedPrize.tier]} flex items-center justify-center`}
                    >
                      <span className="text-white font-bold text-lg">{selectedPrize.tier}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold text-xl">{selectedPrize.name}</p>
                      <p className="text-gray-400">당첨자 이름을 입력하세요</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Input
                      ref={inputRef}
                      value={viewerName}
                      onChange={(e) => setViewerName(e.target.value)}
                      placeholder="시청자 닉네임"
                      className="flex-1 bg-gray-700 border-gray-600 text-white text-lg h-12"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleDraw();
                        }
                      }}
                    />
                    <Button
                      onClick={handleDraw}
                      disabled={isDrawing || !viewerName.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 h-12 px-8"
                    >
                      <Send className="w-5 h-5 mr-2" />
                      {isDrawing ? "처리중..." : "추첨"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-lg">위에서 경품을 선택하세요</p>
                  <p className="text-gray-500 text-sm mt-1">또는 숫자 키(1-9)로 빠르게 선택</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 사이드바 */}
        <div className="space-y-4">
          {/* 오버레이 제어 */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg">오버레이 제어</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => toggleModal(!overlayState?.is_modal_open)}
                variant="outline"
                className="w-full border-gray-600"
              >
                {overlayState?.is_modal_open ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    경품 모달 닫기
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    경품 모달 열기
                  </>
                )}
              </Button>

              {overlayState?.show_last_result && (
                <Button
                  onClick={hideResult}
                  variant="outline"
                  className="w-full border-gray-600"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  결과 숨기기
                </Button>
              )}

              <div className="grid grid-cols-2 gap-2">
                {prizes.filter(p => p.tier !== "꽝").slice(0, 4).map((prize) => (
                  <Button
                    key={prize.id}
                    onClick={() => toggleModal(true, prize.id)}
                    size="sm"
                    variant="ghost"
                    className="text-gray-300 text-xs"
                  >
                    {prize.tier} 보기
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 최근 추첨 기록 */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg">최근 추첨</CardTitle>
            </CardHeader>
            <CardContent>
              {drawEvents.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {drawEvents.slice(0, 10).map((event) => {
                    const prize = event.prizes as unknown as Prize | null;
                    return (
                      <div
                        key={event.id}
                        className="flex items-center justify-between bg-gray-700/50 rounded-lg p-2"
                      >
                        <div>
                          <p className="text-white text-sm font-medium">{event.viewer_name}</p>
                          <p className="text-gray-500 text-xs">
                            {new Date(event.created_at).toLocaleTimeString("ko-KR")}
                          </p>
                        </div>
                        <Badge
                          className={`bg-gradient-to-r ${TIER_COLORS[prize?.tier || "꽝"]} text-white text-xs`}
                        >
                          {prize?.tier || "꽝"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4 text-sm">추첨 기록 없음</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
