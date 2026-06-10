import { NextResponse } from "next/server";
import { sendMail } from "@/lib/email";

// 개발 환경 전용 메일 테스트 (배포 시 삭제)
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "개발 환경에서만 사용 가능합니다." }, { status: 403 });
  }

  const to = process.env.MASTER_ADMIN_EMAILS?.split(",")[0];
  if (!to) {
    return NextResponse.json({ error: "MASTER_ADMIN_EMAILS 미설정" }, { status: 500 });
  }

  const ok = await sendMail({
    to,
    subject: "[패션 대시보드] 메일 발송 테스트",
    html: `
      <div style="font-family:sans-serif;padding:32px">
        <h2>✅ 메일 발송 테스트 성공!</h2>
        <p>Gmail SMTP 연결이 정상입니다.</p>
        <p style="color:#888;font-size:13px">발송 시각: ${new Date().toLocaleString("ko-KR")}</p>
      </div>
    `,
  });

  if (ok) {
    return NextResponse.json({ ok: true, to, message: `${to} 로 테스트 메일을 발송했습니다.` });
  } else {
    return NextResponse.json({ ok: false, message: "메일 발송 실패 (서버 로그 확인)" }, { status: 500 });
  }
}
