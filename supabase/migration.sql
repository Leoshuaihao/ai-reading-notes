-- AI精读笔记 - Supabase 数据库迁移
-- 在 Supabase SQL Editor 中执行

-- 1. 用户档案表
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  membership_level TEXT DEFAULT 'free' CHECK (membership_level IN ('free', 'premium')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 用户数据表（通用 key-value，兼容 localStorage 模型）
CREATE TABLE IF NOT EXISTS public.user_data (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key TEXT NOT NULL,           -- 如 'reading_progress', 'my_principles', 'investment_journal'
  value JSONB NOT NULL,        -- JSON 数据
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- 3. 阅读笔记表（独立索引，可搜索）
CREATE TABLE IF NOT EXISTS public.reading_notes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_slug TEXT NOT NULL,
  chapter_id TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_data_user ON user_data(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_notes_user ON reading_notes(user_id, book_slug);
CREATE INDEX IF NOT EXISTS idx_user_profiles_membership ON user_profiles(membership_level);

-- 4. 埋点事件表
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_name TEXT NOT NULL,
  anonymous_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  page_url TEXT,
  user_agent TEXT,
  properties JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_ae_event ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_ae_ts ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_ae_aid ON analytics_events(anonymous_id);

-- 埋点表不需要 RLS（匿名写入，anon key 可 INSERT）
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon insert"
  ON analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated select"
  ON analytics_events FOR SELECT USING (auth.role() = 'authenticated');

-- RLS 策略：用户只能读写自己的数据
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_notes ENABLE ROW LEVEL SECURITY;

-- 用户档案 RLS
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 用户数据 RLS
CREATE POLICY "Users can read own data"
  ON user_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own data"
  ON user_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own data"
  ON user_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own data"
  ON user_data FOR DELETE USING (auth.uid() = user_id);

-- 笔记 RLS
CREATE POLICY "Users can read own notes"
  ON reading_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes"
  ON reading_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes"
  ON reading_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes"
  ON reading_notes FOR DELETE USING (auth.uid() = user_id);

-- 触发器：在新用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, membership_level)
  VALUES (NEW.id, NEW.email, 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
