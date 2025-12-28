"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Prize, DrawEvent, Board, OverlayState } from "@/lib/types/database";
import { motion, AnimatePresence } from "framer-motion";

const TIER_COLORS: Record<string, { bg: string; glow: string; text: string }> = {
  "1등": { bg: "from-yellow-400 via-amber-500 to-yellow-600", glow: "shadow-yellow-500/50", text: "text-yellow-400" },
  "2등": { bg: "from-gray-200 via-gray-300 to-gray-400", glow: "shadow-gray-400/50", text: "text-gray-300" },
  "3등": { bg: "from-orange-400 via-orange-500 to-orange-600", glow: "shadow-orange-500/50", text: "text-orange-400" },
  "4등": { bg: "from-indigo-400 via-indigo-500 to-indigo-600", glow: "shadow-indigo-500/50", text: "text-indigo-400" },
  "5등": { bg: "from-emerald-400 via-emerald-500 to-emerald-600", glow: "shadow-emerald-500/50", text: "text-emerald-400" },
  꽝: { bg: "from-gray-500 via-gray-600 to-gray-700", glow: "shadow-gray-600/50", text: "text-gray-400" },
};

interface DrawEventWithPrize extends DrawEvent {
  prizes: Prize | null;
}

export default function OverlayPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const boardId = params.boardId as string;
  const token = searchParams.get("token");
  const supabase = createClient();

  const [board, setBoard] = useState<Board | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [overlayState, setOverlayState] = useState<OverlayState | null>(null);
  const [lastDraw, setLastDraw] = useState<DrawEventWithPrize | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [focusedPrize, setFocusedPrize] = useState<Prize | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // 데이터 로드
  const loadData = useCallback(async () => {
    const [boardRes, prizesRes, overlayRes, lastDrawRes] = await Promise.all([
      supabase.from("boards").select("*").eq("id", boardId).single(),
      supabase.from("prizes").select("*").eq("board_id", boardId).order("sort_order"),
      supabase.from("overlay_states").select("*").eq("board_id", boardId).single(),
      supabase
        .from("draw_events")
        .select("*, prizes(*)")
        .eq("board_id", boardId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single(),
    ]);

    if (boardRes.data) setBoard(boardRes.data);
    if (prizesRes.data) setPrizes(prizesRes.data);
    if (overlayRes.data) {
      const newState = overlayRes.data;

      // 모달 상태 변경
      if (newState.is_modal_open !== overlayState?.is_modal_open) {
        setShowModal(newState.is_modal_open);
        if (newState.focused_prize_id && prizesRes.data) {
          const prize = prizesRes.data.find((p) => p.id === newState.focused_prize_id);
          setFocusedPrize(prize || null);
        }
      }

      // 결과 표시 상태 변경
      if (newState.show_last_result && !overlayState?.show_last_result) {
        // 새 결과가 나왔을 때 애니메이션 시작
        setIsAnimating(true);
        setTimeout(() => {
          setShowResult(true);
          setIsAnimating(false);
        }, 500);
      } else if (!newState.show_last_result && overlayState?.show_last_result) {
        setShowResult(false);
      }

      setOverlayState(newState);
    }
    if (lastDrawRes.data) {
      setLastDraw(lastDrawRes.data as DrawEventWithPrize);
    }
  }, [boardId, supabase, overlayState]);

  useEffect(() => {
    loadData();

    // Realtime 구독
    const channel = supabase
      .channel(`overlay-${boardId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "overlay_states", filter: `board_id=eq.${boardId}` },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "draw_events", filter: `board_id=eq.${boardId}` },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prizes", filter: `board_id=eq.${boardId}` },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, loadData, supabase]);

  // 토큰 검증
  if (board && board.overlay_token !== token) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <p className="text-red-500 text-xl">접근 권한이 없습니다</p>
      </div>
    );
  }

  const tierColor = lastDraw?.prizes?.tier
    ? TIER_COLORS[lastDraw.prizes.tier] || TIER_COLORS["꽝"]
    : TIER_COLORS["꽝"];

  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden">
      {/* 배경 파티클 효과 (당첨 시) */}
      <AnimatePresence>
        {showResult && lastDraw?.prizes?.tier !== "꽝" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: -20,
                  rotate: 0,
                  scale: Math.random() * 0.5 + 0.5,
                }}
                animate={{
                  y: window.innerHeight + 20,
                  rotate: 360,
                }}
                transition={{
                  duration: Math.random() * 3 + 2,
                  delay: Math.random() * 0.5,
                  ease: "linear",
                }}
                className={`absolute w-4 h-4 ${
                  i % 3 === 0
                    ? "bg-yellow-400"
                    : i % 3 === 1
                      ? "bg-indigo-400"
                      : "bg-pink-400"
                } rounded-sm opacity-80`}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 하단 정보 바 */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="flex items-end justify-between">
          {/* 경품 현황 */}
          <div className="flex gap-2">
            {prizes.filter(p => p.tier !== "꽝").map((prize) => (
              <motion.div
                key={prize.id}
                layout
                className={`bg-black/70 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 ${
                  prize.qty_left === 0 ? "opacity-50" : ""
                }`}
              >
                <p className={`font-bold ${TIER_COLORS[prize.tier]?.text || "text-gray-400"}`}>
                  {prize.tier}
                </p>
                <p className="text-white text-lg font-mono">
                  {prize.qty_left}/{prize.qty_total}
                </p>
              </motion.div>
            ))}
          </div>

          {/* 최근 당첨 (작은 표시) */}
          <AnimatePresence>
            {lastDraw && !showResult && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-black/70 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10"
              >
                <p className="text-gray-400 text-xs">최근 당첨</p>
                <p className="text-white font-medium">{lastDraw.viewer_name}</p>
                <p className={TIER_COLORS[lastDraw.prizes?.tier || "꽝"]?.text}>
                  {lastDraw.prizes?.tier || "꽝"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 추첨 결과 애니메이션 (중앙) */}
      <AnimatePresence>
        {(isAnimating || showResult) && lastDraw && (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* 배경 글로우 */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 1], opacity: [0, 0.5, 0.3] }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className={`absolute w-[600px] h-[600px] rounded-full bg-gradient-radial ${
                tierColor.bg
              } blur-3xl`}
            />

            {/* 메인 결과 카드 */}
            <motion.div
              initial={{ scale: 0, rotateY: 180, opacity: 0 }}
              animate={{
                scale: [0, 1.2, 1],
                rotateY: [180, 0],
                opacity: 1,
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                duration: 0.8,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              className={`relative bg-gradient-to-br ${tierColor.bg} rounded-3xl p-1 shadow-2xl ${tierColor.glow}`}
            >
              <div className="bg-gray-900/90 backdrop-blur-sm rounded-3xl px-16 py-12 text-center">
                {/* 등급 */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <span
                    className={`text-6xl font-black bg-gradient-to-r ${tierColor.bg} bg-clip-text text-transparent`}
                  >
                    {lastDraw.prizes?.tier || "꽝"}
                  </span>
                </motion.div>

                {/* 경품명 */}
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-3xl text-white font-bold mt-4"
                >
                  {lastDraw.prizes?.name || "꽝"}
                </motion.p>

                {/* 당첨자 */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6 pt-6 border-t border-white/10"
                >
                  <p className="text-gray-400">당첨자</p>
                  <p className="text-4xl font-bold text-white mt-1">
                    {lastDraw.viewer_name}
                  </p>
                </motion.div>

                {/* 경품 이미지 */}
                {lastDraw.prizes?.images?.[0] && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-6"
                  >
                    <img
                      src={lastDraw.prizes.images[0]}
                      alt=""
                      className="w-48 h-48 mx-auto object-cover rounded-xl border-4 border-white/20"
                    />
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* 축하 이펙트 (1등일 때) */}
            {lastDraw.prizes?.tier === "1등" && (
              <>
                {/* 불꽃 */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      scale: 0,
                      x: 0,
                      y: 0,
                    }}
                    animate={{
                      scale: [0, 1, 0],
                      x: Math.cos((i * Math.PI * 2) / 8) * 300,
                      y: Math.sin((i * Math.PI * 2) / 8) * 300,
                    }}
                    transition={{
                      duration: 1,
                      delay: 0.2 + i * 0.05,
                      ease: "easeOut",
                    }}
                    className="absolute w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"
                  />
                ))}

                {/* 별 */}
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={`star-${i}`}
                    initial={{
                      scale: 0,
                      rotate: 0,
                      x: 0,
                      y: 0,
                      opacity: 1,
                    }}
                    animate={{
                      scale: [0, 1.5, 0],
                      rotate: 180,
                      x: Math.cos((i * Math.PI * 2) / 12) * 400,
                      y: Math.sin((i * Math.PI * 2) / 12) * 400,
                      opacity: [1, 1, 0],
                    }}
                    transition={{
                      duration: 1.2,
                      delay: 0.3 + i * 0.03,
                      ease: "easeOut",
                    }}
                    className="absolute text-4xl"
                  >
                    ⭐
                  </motion.div>
                ))}
              </>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* 경품 모달 */}
      <AnimatePresence>
        {showModal && focusedPrize && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gray-900/95 rounded-3xl p-8 max-w-2xl w-full mx-8 border border-white/10"
            >
              <div className="flex items-start gap-6">
                {focusedPrize.images?.[0] && (
                  <img
                    src={focusedPrize.images[0]}
                    alt=""
                    className="w-48 h-48 object-cover rounded-2xl"
                  />
                )}
                <div className="flex-1">
                  <span
                    className={`text-3xl font-black bg-gradient-to-r ${
                      TIER_COLORS[focusedPrize.tier]?.bg || "from-gray-400 to-gray-500"
                    } bg-clip-text text-transparent`}
                  >
                    {focusedPrize.tier}
                  </span>
                  <h2 className="text-4xl font-bold text-white mt-2">
                    {focusedPrize.name}
                  </h2>
                  {focusedPrize.description && (
                    <p className="text-gray-400 mt-4">{focusedPrize.description}</p>
                  )}
                  <div className="mt-6 flex items-center gap-4">
                    <div className="bg-gray-800 rounded-xl px-4 py-2">
                      <p className="text-gray-400 text-sm">남은 수량</p>
                      <p className="text-2xl font-bold text-white">
                        {focusedPrize.qty_left}/{focusedPrize.qty_total}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 보드 이름 (좌상단) */}
      <div className="absolute top-6 left-6">
        <div className="bg-black/70 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
          <p className="text-indigo-400 font-bold text-xl">{board?.title}</p>
        </div>
      </div>
    </div>
  );
}
