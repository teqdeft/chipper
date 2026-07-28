/**
 * Branded email layouts (SCR-041).
 * Plain, inline-styled HTML — the safest thing across email clients.
 * Colours mirror the Chipper design system (aubergine / coral / canvas).
 */
const config = require('../../config');

const COLOR = {
  canvas: '#FBF7F2',
  aubergine: '#2E1B33',
  coral: '#FF6B5A',
  deepCoral: '#D9452F',
  ink70: '#5A4A56',
  line: '#E7DDD4',
};

const escape = (value = '') =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Large, selectable code block — the primary call to action for OTP emails. */
function codeBlock(otp) {
  if (!otp) return '';
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0">
    <tr><td align="center" style="background:${COLOR.canvas};border:1px solid ${COLOR.line};border-radius:12px;padding:24px">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${COLOR.ink70}">Your code</p>
      <p style="margin:0;font-family:'SFMono-Regular',Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:.32em;color:${COLOR.aubergine}">${escape(otp)}</p>
    </td></tr>
  </table>`;
}

function layout({ title, greeting, lines = [], otp, cta, footNote }) {
  const body = lines.map((line) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLOR.ink70}">${line}</p>`).join('');

  // With a code present the link becomes the secondary path, so it is shown
  // smaller and below the code rather than as the hero button.
  const button = cta
    ? otp
      ? `<p style="margin:0 0 8px;font-size:13px;color:${COLOR.ink70}">Prefer a link? <a href="${escape(cta.url)}" style="color:${COLOR.deepCoral};font-weight:600">${escape(cta.label)}</a></p>`
      : `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0">
           <tr><td style="border-radius:10px;background:${COLOR.coral}">
             <a href="${escape(cta.url)}" style="display:inline-block;padding:14px 28px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:${COLOR.aubergine};text-decoration:none;border-radius:10px">${escape(cta.label)}</a>
           </td></tr>
         </table>
         <p style="margin:0 0 8px;font-size:13px;color:${COLOR.ink70}">If the button does not work, copy this link into your browser:</p>
         <p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="${escape(cta.url)}" style="color:${COLOR.deepCoral}">${escape(cta.url)}</a></p>`
    : '';

  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title></head>
  <body style="margin:0;padding:0;background:${COLOR.canvas};font-family:Helvetica,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.canvas};padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid ${COLOR.line};border-radius:16px;overflow:hidden">
          <tr><td style="padding:28px 32px 0">
            <p style="margin:0;font-size:20px;font-weight:800;color:${COLOR.aubergine};letter-spacing:-0.02em">${escape(config.app.name)}</p>
            <p style="margin:4px 0 0;font-size:12px;color:${COLOR.ink70}">An open community for microphysiological systems</p>
          </td></tr>
          <tr><td style="padding:24px 32px 8px">
            <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${COLOR.aubergine}">${escape(title)}</h1>
            ${greeting ? `<p style="margin:0 0 16px;font-size:15px;color:${COLOR.ink70}">${escape(greeting)}</p>` : ''}
            ${body}
            ${codeBlock(otp)}
            ${button}
          </td></tr>
          <tr><td style="padding:16px 32px 28px;border-top:1px solid ${COLOR.line}">
            ${footNote ? `<p style="margin:12px 0 0;font-size:12px;color:${COLOR.ink70}">${footNote}</p>` : ''}
            <p style="margin:12px 0 0;font-size:12px;color:${COLOR.ink70}">
              ${escape(config.app.name)} · <a href="${config.app.clientUrl}" style="color:${COLOR.deepCoral}">${escape(config.app.clientUrl.replace(/^https?:\/\//, ''))}</a>
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

module.exports = {
  verifyEmail: ({ name, url, otp }) =>
    layout({
      title: otp ? 'Your verification code' : 'Confirm your email address',
      greeting: `Hi ${name},`,
      lines: [
        otp
          ? 'Thanks for joining Chipper. Enter this code to activate your account and start browsing, downloading and sharing open organ-on-chip designs.'
          : 'Thanks for joining Chipper. Confirm your email address to activate your account and start browsing, downloading and sharing open organ-on-chip designs.',
      ],
      otp,
      cta: { label: 'Confirm email', url },
      footNote: `This ${otp ? 'code' : 'link'} expires in ${config.security.emailVerifyExpiresHours} hours and can be used once. If you did not create an account, you can ignore this email.`,
    }),

  resetPassword: ({ name, url, otp, expiresMinutes }) =>
    layout({
      title: otp ? 'Your password reset code' : 'Reset your password',
      greeting: `Hi ${name},`,
      lines: [
        otp
          ? 'We received a request to reset your password. Enter this code to choose a new one.'
          : 'We received a request to reset your password. Choose a new one using the button below.',
      ],
      otp,
      cta: { label: 'Set a new password', url },
      footNote: `This ${otp ? 'code' : 'link'} expires in ${expiresMinutes} minutes and can be used once. If you did not request a reset, no action is needed — your password stays the same.`,
    }),

  welcome: ({ name, url }) =>
    layout({
      title: 'Welcome to Chipper',
      greeting: `Hi ${name},`,
      lines: [
        'Your account is active. Every design on Chipper carries its maker, licence, metadata and version history in plain sight — so you can inspect, cite and reuse with confidence.',
        'Browse what the community has published, or upload what you build so the next lab can stand on your work.',
      ],
      cta: { label: 'Browse designs', url },
    }),

  passwordChanged: ({ name, url }) =>
    layout({
      title: 'Your password was changed',
      greeting: `Hi ${name},`,
      lines: ['Your Chipper password was just changed. If this was you, nothing else is needed.'],
      cta: { label: 'Review account settings', url },
      footNote: 'If you did not make this change, reset your password immediately and contact support.',
    }),

  notification: ({ name, title, body, url }) =>
    layout({
      title,
      greeting: `Hi ${name},`,
      lines: [escape(body)],
      cta: { label: 'Open in Chipper', url },
      footNote: 'You can turn these emails off under Account settings → Notification preferences.',
    }),

  designStatus: ({ name, title, status, note, url }) =>
    layout({
      title: status === 'published' ? `"${title}" is now published` : `Update on "${title}"`,
      greeting: `Hi ${name},`,
      lines: [
        status === 'published'
          ? `Your design <strong>${escape(title)}</strong> passed review and is live in the library.`
          : `Your design <strong>${escape(title)}</strong> is now marked <strong>${escape(status)}</strong>.`,
        ...(note ? [`Reviewer note: ${escape(note)}`] : []),
      ],
      cta: { label: 'View design', url },
    }),
};
