-- =============================================
-- 패션 고객 대시보드 DB 스키마
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 1. 회원 테이블
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT,         -- 부서
  position TEXT,           -- 직책
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('viewer', 'editor', 'admin', 'master')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('active', 'pending', 'withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (LOWER(email));

-- 2. 이메일 인증 코드 테이블 (가입 OTP / 비밀번호 재설정 공용)
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,       -- 코드 평문 저장 금지, SHA-256 해시
  purpose TEXT NOT NULL DEFAULT 'signup'
    CHECK (purpose IN ('signup', 'reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed BOOLEAN NOT NULL DEFAULT false,
  attempts INT NOT NULL DEFAULT 0,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ev_email_purpose_idx ON email_verifications (email, purpose);

-- 3. 인증 로그 테이블 (보안 추적)
CREATE TABLE IF NOT EXISTS auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  -- 타입 예시: login_attempt, login_success, login_failure,
  --           signup_request, signup_complete,
  --           reset_request, reset_complete,
  --           admin_approve, admin_reject, logout
  email TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  ip TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_logs_email_idx ON auth_logs (email);
CREATE INDEX IF NOT EXISTS auth_logs_created_idx ON auth_logs (created_at DESC);

-- 4. updated_at 자동 갱신 함수 + 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. 완료 확인
SELECT 'users' AS table_name, COUNT(*) AS rows FROM users
UNION ALL
SELECT 'email_verifications', COUNT(*) FROM email_verifications
UNION ALL
SELECT 'auth_logs', COUNT(*) FROM auth_logs;
