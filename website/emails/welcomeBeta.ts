export type WelcomeBetaEmailProps = {
  name?: string;
  platform: "mac-arm64" | "mac-x64" | "windows" | string;
  downloadUrl: string;
  siteUrl: string; // e.g., https://lucedata.com
  fromName?: string; // e.g., LuceData Beta
  logoUrl?: string; // optional absolute URL for logo
  footerText?: string; // optional footer text
};

export function welcomeBetaEmailText({
  name,
  platform,
  downloadUrl,
  siteUrl,
  fromName,
  footerText,
}: WelcomeBetaEmailProps) {
  const install = `${siteUrl.replace(/\/$/, "")}/docs/installation`;
  const addConn = `${siteUrl.replace(/\/$/, "")}/docs/add-connection`;
  const addAi = `${siteUrl.replace(/\/$/, "")}/docs/add-ai-engine`;
  const greeting = name ? `Hi ${name},` : "Hi,";
  const brand = fromName || "LuceData Beta";
  const footer =
    footerText ||
    `You're receiving this because you requested a download link. ${new Date().getFullYear()} ${brand}. ${siteUrl}`;
  return (
    `${greeting}\n\n` +
    `Welcome to the LuceData Beta!\n\n` +
    `Platform: ${platform}\n` +
    `Download: ${downloadUrl}\n\n` +
    `Getting started:\n` +
    `1) Install the app\n` +
    `2) Add a database connection: ${addConn}\n` +
    `3) Configure AI provider (optional): ${addAi}\n` +
    `4) Installation tips: ${install}\n\n` +
    `If you didn't request this, you can ignore this email.\n\n` +
    `${footer}`
  );
}

export function welcomeBetaEmailHtml({
  name,
  platform,
  downloadUrl,
  siteUrl,
  fromName,
  logoUrl,
  footerText,
}: WelcomeBetaEmailProps) {
  const base = siteUrl.replace(/\/$/, "");
  const docsInstall = `${base}/docs/installation`;
  const docsAddConn = `${base}/docs/add-connection`;
  const docsAi = `${base}/docs/add-ai-engine`;
  const brand = fromName || "LuceData Beta";
  const safe = (s?: string) =>
    (s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const footer =
    footerText ||
    `You're receiving this because you requested a download link. ${new Date().getFullYear()} ${safe(brand)}. <a href="${base}" style="color:#64748b; text-decoration:underline;">${base}</a>`;

  const headerBlock = `
    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="margin:0 0 12px;">
      <tr>
        <td align="left" valign="middle" style="padding:0;">
          ${logoUrl ? `<img src="${logoUrl}" alt="${safe(brand)} logo" height="32" style="display:block; height:32px; width:auto; border-radius:4px;" />` : ""}
          <div style="margin:${logoUrl ? "6px 0 0" : "0"}; font-weight:600;">${safe(brand)}</div>
          <div style="margin:0; color:#64748b; font-size:12px;">${base}</div>
        </td>
      </tr>
    </table>`;

  return `<!doctype html><html><body>
  <div style="font-family: ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, Apple Color Emoji, Segoe UI Emoji; line-height:1.6; color:#0f172a;">
    <div style="padding:16px; border-radius:12px; border:1px solid #e2e8f0;">
      ${headerBlock}
      <h1 style="margin:0 0 12px; font-size:20px;">Welcome to the LuceData Beta 🎉</h1>
      <p style="margin:0 0 8px;">Hi${name ? ` ${safe(name)}` : ""}, thanks for joining the beta! You can download the app for <strong>${safe(platform)}</strong> using the button below.</p>
      <p style="margin:12px 0;"><a href="${downloadUrl}" style="display:inline-block; background:#2563eb; color:#fff; padding:10px 14px; border-radius:8px; text-decoration:none;">Download LuceData</a></p>
      <p style="margin:16px 0 8px; font-weight:600;">Getting started</p>
      <ol style="margin:8px 0 16px 20px;">
        <li>Install the app and open it</li>
        <li>Add a database connection: <a href="${docsAddConn}">${docsAddConn}</a></li>
        <li>Optionally configure your AI provider: <a href="${docsAi}">${docsAi}</a></li>
        <li>See installation tips: <a href="${docsInstall}">${docsInstall}</a></li>
      </ol>
      <hr style="border:0; border-top:1px solid #e2e8f0; margin:16px 0;" />
      <p style="margin:0; font-size:12px; color:#64748b;">${footer}</p>
    </div>
  </div>
</body></html>`;
}
