"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step =
  | "email"        // 이메일 입력
  | "otp"          // OTP 입력 (가입)
  | "register"     // 이름+비번 입력 (가입 완료)
  | "password"     // 비번 입력 (로그인)
  | "pending"      // 승인 대기
  | "reset-email"  // 비번 재설정 이메일
  | "reset-otp"    // 비번 재설정 OTP
  | "reset-pw";    // 새 비번 입력

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [signupToken, setSignupToken] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  async function post(url: string, body: object) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  // 1. 이메일 제출 → 이미 가입된 유저면 비번 입력, 신규면 OTP 발송
  async function handleEmail() {
    setError(""); setLoading(true);
    try {
      // 1단계: 이메일 존재 여부 확인
      const check = await post("/api/auth/check-email", { email });
      if (check.error) { setError(check.error); return; }

      if (check.exists) {
        // 이미 가입된 계정
        if (check.status === "pending") { setStep("pending"); return; }
        setStep("password"); return;
      }

      // 신규 → OTP 발송
      const res = await post("/api/auth/signup-request", { email });
      if (res.error) { setError(res.error); return; }
      setStep("otp");
    } finally {
      setLoading(false);
    }
  }

  // 2. 로그인
  async function handleLogin() {
    setError(""); setLoading(true);
    try {
      const res = await post("/api/auth/login", { email, password, rememberMe });
      if (res.error) { setError(res.error); return; }
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  // 3. OTP 확인 (가입)
  async function handleOtp() {
    setError(""); setLoading(true);
    try {
      const res = await post("/api/auth/signup-verify", { email, code: otp });
      if (res.error) { setError(res.error); return; }
      setSignupToken(res.signupToken);
      setStep("register");
    } finally {
      setLoading(false);
    }
  }

  // 4. 회원가입 완료
  async function handleRegister() {
    setError("");
    if (password !== confirmPw) { setError("비밀번호가 일치하지 않습니다."); return; }
    setLoading(true);
    try {
      const res = await post("/api/auth/signup", { signupToken, name, password });
      if (res.error) { setError(res.error); return; }
      if (res.status === "active") {
        router.push("/dashboard");
      } else {
        setStep("pending");
      }
    } finally {
      setLoading(false);
    }
  }

  // 5. 비번 재설정 - OTP 발송
  async function handleResetRequest() {
    setError(""); setLoading(true);
    try {
      await post("/api/auth/reset-request", { email });
      setStep("reset-otp");
    } finally {
      setLoading(false);
    }
  }

  // 6. 비번 재설정 - OTP 확인
  async function handleResetOtp() {
    setError(""); setLoading(true);
    try {
      const res = await post("/api/auth/reset-verify", { email, code: otp });
      if (res.error) { setError(res.error); return; }
      setResetToken(res.resetToken);
      setStep("reset-pw");
    } finally {
      setLoading(false);
    }
  }

  // 7. 비번 재설정 - 새 비번 저장
  async function handleResetPw() {
    setError("");
    if (password !== confirmPw) { setError("비밀번호가 일치하지 않습니다."); return; }
    setLoading(true);
    try {
      const res = await post("/api/auth/reset-password", { resetToken, password });
      if (res.error) { setError(res.error); return; }
      setPassword(""); setConfirmPw(""); setStep("password");
      setError("");
    } finally {
      setLoading(false);
    }
  }

  const TITLES: Record<Step, string> = {
    email: "로그인 / 회원가입",
    password: "비밀번호 입력",
    otp: "이메일 인증",
    register: "정보 입력",
    pending: "승인 대기 중",
    "reset-email": "비밀번호 재설정",
    "reset-otp": "인증 코드 확인",
    "reset-pw": "새 비밀번호 설정",
  };

  const SUBTITLES: Record<Step, string> = {
    email: "이메일을 입력하세요",
    password: `${email}`,
    otp: `${email} 로 발송된 6자리 코드를 입력하세요`,
    register: "가입 정보를 입력하세요",
    pending: "관리자 승인 후 이용하실 수 있습니다",
    "reset-email": "가입하신 이메일을 입력하세요",
    "reset-otp": `${email} 로 발송된 코드를 입력하세요`,
    "reset-pw": "새 비밀번호를 입력하세요 (8~16자, 영문+숫자+특수문자)",
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* 로고/타이틀 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 mb-4">
            <span className="text-white text-xl font-bold">F</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{TITLES[step]}</h1>
          <p className="text-sm text-gray-500 mt-1 break-all">{SUBTITLES[step]}</p>
        </div>

        {/* 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* ── 이메일 입력 ── */}
          {step === "email" && (
            <>
              <input
                type="email"
                placeholder="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEmail()}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleEmail}
                disabled={loading || !email}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                {loading ? "확인 중..." : "계속"}
              </button>
            </>
          )}

          {/* ── 비밀번호 (로그인) ── */}
          {step === "password" && (
            <>
              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded"
                />
                30일간 로그인 유지
              </label>
              <button
                onClick={handleLogin}
                disabled={loading || !password}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                {loading ? "로그인 중..." : "로그인"}
              </button>
              <button
                onClick={() => { setStep("reset-email"); setError(""); }}
                className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                비밀번호를 잊으셨나요?
              </button>
            </>
          )}

          {/* ── OTP 입력 (가입) ── */}
          {step === "otp" && (
            <>
              <input
                type="text"
                placeholder="인증 코드 6자리"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && handleOtp()}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-center tracking-widest text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleOtp}
                disabled={loading || otp.length !== 6}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                {loading ? "확인 중..." : "인증 확인"}
              </button>
              <button
                onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                className="w-full text-sm text-gray-400 hover:text-gray-600"
              >
                ← 이메일 다시 입력
              </button>
            </>
          )}

          {/* ── 이름 + 비번 (가입 완료) ── */}
          {step === "register" && (
            <>
              <input
                type="text"
                placeholder="이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <input
                type="password"
                placeholder="비밀번호 (8~16자, 영문+숫자+특수문자)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                placeholder="비밀번호 확인"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleRegister}
                disabled={loading || !name || !password || !confirmPw}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                {loading ? "가입 중..." : "가입 완료"}
              </button>
            </>
          )}

          {/* ── 승인 대기 ── */}
          {step === "pending" && (
            <>
              <div className="text-center py-4">
                <div className="text-4xl mb-3">⏳</div>
                <p className="text-sm text-gray-600">
                  가입 신청이 완료되었습니다.<br />
                  관리자 승인 후 로그인하실 수 있습니다.
                </p>
              </div>
              <button
                onClick={() => { setStep("email"); setEmail(""); setError(""); }}
                className="w-full py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                처음으로
              </button>
            </>
          )}

          {/* ── 비번 재설정: 이메일 ── */}
          {step === "reset-email" && (
            <>
              <input
                type="email"
                placeholder="가입하신 이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleResetRequest()}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleResetRequest}
                disabled={loading || !email}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                {loading ? "발송 중..." : "인증 코드 발송"}
              </button>
              <button
                onClick={() => { setStep("password"); setError(""); }}
                className="w-full text-sm text-gray-400 hover:text-gray-600"
              >
                ← 로그인으로 돌아가기
              </button>
            </>
          )}

          {/* ── 비번 재설정: OTP ── */}
          {step === "reset-otp" && (
            <>
              <input
                type="text"
                placeholder="인증 코드 6자리"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && handleResetOtp()}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-center tracking-widest text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleResetOtp}
                disabled={loading || otp.length !== 6}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                {loading ? "확인 중..." : "코드 확인"}
              </button>
            </>
          )}

          {/* ── 비번 재설정: 새 비번 ── */}
          {step === "reset-pw" && (
            <>
              <input
                type="password"
                placeholder="새 비밀번호 (8~16자, 영문+숫자+특수문자)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <input
                type="password"
                placeholder="새 비밀번호 확인"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleResetPw()}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleResetPw}
                disabled={loading || !password || !confirmPw}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                {loading ? "변경 중..." : "비밀번호 변경"}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          이랜드 리테일 패션 고객 대시보드 · 사내 전용
        </p>
      </div>
    </div>
  );
}
