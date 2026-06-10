import nodemailer from "nodemailer";

// Gmail SMTP 발송 클라이언트
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_SMTP_USER,
    pass: process.env.EMAIL_SMTP_PASS,
  },
});

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 공통 발송 함수 (실패해도 앱이 죽지 않도록 try/catch)
export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"패션 고객 대시보드" <${process.env.EMAIL_FROM}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return true;
  } catch (err) {
    console.error("[email] 발송 실패:", err);
    return false;
  }
}

// 1. 가입 OTP 메일
export async function sendSignupOtp(to: string, code: string) {
  return sendMail({
    to,
    subject: "[패션 대시보드] 이메일 인증 코드",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#111">이메일 인증</h2>
        <p>아래 인증 코드를 입력해 가입을 완료하세요.</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#3182F6;margin:24px 0">
          ${esc(code)}
        </div>
        <p style="color:#888;font-size:13px">이 코드는 10분간 유효합니다.<br>본인이 요청하지 않았다면 이 메일을 무시하세요.</p>
      </div>
    `,
  });
}

// 2. 가입 승인 대기 안내 (신청자 → 본인)
export async function sendPendingNotice(to: string, name: string) {
  return sendMail({
    to,
    subject: "[패션 대시보드] 가입 신청이 접수되었습니다",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#111">가입 신청 완료</h2>
        <p>${esc(name)}님, 가입 신청이 접수되었습니다.</p>
        <p>관리자 승인 후 로그인하실 수 있습니다.<br>승인 완료 시 별도 안내 메일을 드립니다.</p>
      </div>
    `,
  });
}

// 3. 관리자에게 승인 요청 알림
export async function sendApprovalRequest(adminEmail: string, applicantName: string, applicantEmail: string) {
  return sendMail({
    to: adminEmail,
    subject: "[패션 대시보드] 새 가입 승인 요청",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#111">새 가입 승인 요청</h2>
        <p>신규 가입 신청이 있습니다.</p>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;color:#888">이름</td><td style="padding:8px">${esc(applicantName)}</td></tr>
          <tr><td style="padding:8px;color:#888">이메일</td><td style="padding:8px">${esc(applicantEmail)}</td></tr>
        </table>
        <p style="margin-top:24px">대시보드 관리자 화면에서 승인/거절할 수 있습니다.</p>
      </div>
    `,
  });
}

// 4. 승인 완료 메일 (신청자에게)
export async function sendApproved(to: string, name: string) {
  return sendMail({
    to,
    subject: "[패션 대시보드] 가입이 승인되었습니다",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#111">가입 승인 완료</h2>
        <p>${esc(name)}님, 가입이 승인되었습니다! 🎉</p>
        <a href="${process.env.APP_BASE_URL}/login"
           style="display:inline-block;margin-top:16px;padding:12px 24px;background:#3182F6;color:#fff;border-radius:8px;text-decoration:none">
          로그인하기
        </a>
      </div>
    `,
  });
}

// 5. 거절 메일 (신청자에게)
export async function sendRejected(to: string, name: string) {
  return sendMail({
    to,
    subject: "[패션 대시보드] 가입 신청 결과 안내",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#111">가입 신청 결과</h2>
        <p>${esc(name)}님, 아쉽게도 가입 신청이 승인되지 않았습니다.</p>
        <p style="color:#888;font-size:13px">문의사항은 관리자에게 연락해 주세요.</p>
      </div>
    `,
  });
}

// 6. 비밀번호 재설정 OTP 메일
export async function sendResetOtp(to: string, code: string) {
  return sendMail({
    to,
    subject: "[패션 대시보드] 비밀번호 재설정 코드",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#111">비밀번호 재설정</h2>
        <p>아래 인증 코드를 입력해 비밀번호를 재설정하세요.</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#3182F6;margin:24px 0">
          ${esc(code)}
        </div>
        <p style="color:#888;font-size:13px">이 코드는 10분간 유효합니다.<br>본인이 요청하지 않았다면 이 메일을 무시하세요.</p>
      </div>
    `,
  });
}
