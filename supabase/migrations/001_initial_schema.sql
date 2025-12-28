-- Mykuzi 초기 스키마

-- 1. profiles (users 확장)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'seller', 'admin')),
  seller_handle TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. seller_applications (판매자 신청)
CREATE TABLE IF NOT EXISTS seller_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  channel_url TEXT,
  channel_name TEXT,
  memo TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. boards (쿠지판)
CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'paused', 'closed')),
  mode TEXT DEFAULT 'manual' CHECK (mode IN ('manual', 'random')),
  public_slug TEXT UNIQUE,
  overlay_token TEXT DEFAULT encode(gen_random_bytes(16), 'hex'),
  sound_enabled BOOLEAN DEFAULT true,
  theme JSONB DEFAULT '{"primary": "#6366f1", "background": "#000000"}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. prizes (경품)
CREATE TABLE IF NOT EXISTS prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  qty_total INTEGER NOT NULL DEFAULT 1,
  qty_left INTEGER NOT NULL DEFAULT 1,
  images TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. draw_events (추첨 기록)
CREATE TABLE IF NOT EXISTS draw_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  prize_id UUID REFERENCES prizes(id),
  viewer_name TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. overlay_states (오버레이 상태 - 실시간)
CREATE TABLE IF NOT EXISTS overlay_states (
  board_id UUID PRIMARY KEY REFERENCES boards(id) ON DELETE CASCADE,
  is_modal_open BOOLEAN DEFAULT false,
  focused_prize_id UUID REFERENCES prizes(id),
  show_last_result BOOLEAN DEFAULT false,
  connection_status TEXT DEFAULT 'connected',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_boards_seller_id ON boards(seller_id);
CREATE INDEX IF NOT EXISTS idx_boards_status ON boards(status);
CREATE INDEX IF NOT EXISTS idx_prizes_board_id ON prizes(board_id);
CREATE INDEX IF NOT EXISTS idx_draw_events_board_id ON draw_events(board_id);
CREATE INDEX IF NOT EXISTS idx_seller_applications_user_id ON seller_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_applications_status ON seller_applications(status);

-- RLS 정책
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE overlay_states ENABLE ROW LEVEL SECURITY;

-- profiles 정책
CREATE POLICY "Public profiles are viewable" ON profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- seller_applications 정책
CREATE POLICY "Users can view own applications" ON seller_applications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own applications" ON seller_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all applications" ON seller_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can update applications" ON seller_applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- boards 정책
CREATE POLICY "Sellers can CRUD own boards" ON boards
  FOR ALL USING (auth.uid() = seller_id);
CREATE POLICY "Public can view live boards" ON boards
  FOR SELECT USING (status IN ('live', 'paused'));

-- prizes 정책
CREATE POLICY "Board owners can CRUD prizes" ON prizes
  FOR ALL USING (
    board_id IN (SELECT id FROM boards WHERE seller_id = auth.uid())
  );
CREATE POLICY "Public can view prizes of live boards" ON prizes
  FOR SELECT USING (
    board_id IN (SELECT id FROM boards WHERE status IN ('live', 'paused'))
  );

-- draw_events 정책
CREATE POLICY "Board owners can insert draw_events" ON draw_events
  FOR INSERT WITH CHECK (
    board_id IN (SELECT id FROM boards WHERE seller_id = auth.uid())
  );
CREATE POLICY "Public can view draw_events" ON draw_events
  FOR SELECT USING (true);

-- overlay_states 정책
CREATE POLICY "Board owners can manage overlay_states" ON overlay_states
  FOR ALL USING (
    board_id IN (SELECT id FROM boards WHERE seller_id = auth.uid())
  );
CREATE POLICY "Public can view overlay_states" ON overlay_states
  FOR SELECT USING (true);

-- 프로필 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE draw_events;
ALTER PUBLICATION supabase_realtime ADD TABLE overlay_states;
ALTER PUBLICATION supabase_realtime ADD TABLE prizes;

-- Storage 버킷 생성 (Supabase Dashboard에서 수동으로 생성 필요)
-- 버킷 이름: prize-images
-- Public: true
