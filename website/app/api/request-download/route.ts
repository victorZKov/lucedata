import { NextResponse } from "next/server";
import { Resend } from "resend";

function getDownloadUrls() {
  const arm = (process.env.NEXT_PUBLIC_DOWNLOAD_URL_MAC_ARM64 || "").trim();
  const x64 = (process.env.NEXT_PUBLIC_DOWNLOAD_URL_MAC_X64 || "").trim();
  const win = (process.env.NEXT_PUBLIC_DOWNLOAD_URL_WINDOWS || "").trim();
  return {
    "mac-arm64": arm || undefined,
    "mac-x64": x64 || undefined,
    windows: win || undefined,
  } as Record<string, string | undefined>;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim();
    const platform = String(body?.platform || "").trim();

    if (!email || !platform) {
      return NextResponse.json(
        { error: "Missing email or platform" },
        { status: 400 }
      );
    }

    const normalizedPlatform = ["mac-arm64", "mac-x64", "windows"].includes(
      platform
    )
      ? platform
      : platform === "macos-arm" ||
          platform === "arm" ||
          platform === "apple-silicon"
        ? "mac-arm64"
        : platform === "macos-x64" || platform === "intel" || platform === "x64"
          ? "mac-x64"
          : platform === "macos"
            ? process.arch === "arm64"
              ? "mac-arm64"
              : "mac-x64"
            : platform;

    const urls = getDownloadUrls();
    const downloadUrl = urls[normalizedPlatform];
    if (!downloadUrl) {
      const missingEnv =
        normalizedPlatform === "mac-arm64"
          ? "NEXT_PUBLIC_DOWNLOAD_URL_MAC_ARM64"
          : normalizedPlatform === "mac-x64"
            ? "NEXT_PUBLIC_DOWNLOAD_URL_MAC_X64"
            : normalizedPlatform === "windows"
              ? "NEXT_PUBLIC_DOWNLOAD_URL_WINDOWS"
              : "";
      const message = missingEnv
        ? `Download link not configured for ${normalizedPlatform}. Set ${missingEnv}.`
        : "Unsupported platform";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.DOWNLOAD_REQUESTS_EMAIL;
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not set — skipping email send");
    }
    if (!toEmail) {
      console.warn("DOWNLOAD_REQUESTS_EMAIL not set — skipping notification email");
    }

    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      if (toEmail) {
        const subject = `New beta download request: ${normalizedPlatform}`;
        const text = `A user requested a download link.\n\nName: ${name || "(not provided)"}\nEmail: ${email}\nPlatform: ${normalizedPlatform}\n\nDirect link: ${downloadUrl}`;
        try {
          await resend.emails.send({
            from:
              (process.env.EMAIL_FROM_NAME
                ? `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`
                : process.env.EMAIL_FROM) ||
              "LuceData Beta <downloads@lucedata.com>",
            to: toEmail,
            replyTo: email,
            subject,
            text,
          });
        } catch (e) {
          console.error("Failed to send email via Resend", e);
          // Continue even if email fails; we still return the link
        }
      }

      // Also send a confirmation email to the requester with the direct link
      const requesterEmail = email;
      const looksLikeEmail = /.+@.+\..+/.test(requesterEmail);
      if (looksLikeEmail) {
        try {
          const siteUrl = (
            process.env.SITE_URL || "https://lucedata.com"
          ).replace(/\/$/, "");
          const { welcomeBetaEmailHtml, welcomeBetaEmailText } = await import(
            "@/emails/welcomeBeta"
          );
          const html = welcomeBetaEmailHtml({
            name,
            platform: normalizedPlatform,
            downloadUrl,
            siteUrl,
            fromName: process.env.EMAIL_FROM_NAME,
            logoUrl: process.env.LOGO_URL,
            footerText: process.env.EMAIL_FOOTER_TEXT,
          });
          const textAlt = welcomeBetaEmailText({
            name,
            platform: normalizedPlatform,
            downloadUrl,
            siteUrl,
            fromName: process.env.EMAIL_FROM_NAME,
            footerText: process.env.EMAIL_FOOTER_TEXT,
          });
          await resend.emails.send({
            from:
              (process.env.EMAIL_FROM_NAME
                ? `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`
                : process.env.EMAIL_FROM) ||
              "LuceData Beta <downloads@lucedata.com>",
            to: requesterEmail,
            subject: `Welcome to the LuceData Beta — your download link (${normalizedPlatform})`,
            text: textAlt,
            html,
          });
        } catch (e) {
          console.error("Failed to send confirmation email to requester", e);
          // Don't fail the API if confirmation email fails
        }
      }
    }

    return NextResponse.json({ ok: true, downloadUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
