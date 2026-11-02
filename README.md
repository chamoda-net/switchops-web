# switchops.tech

Static website for SwitchOps Tech (Pvt) Ltd, hosted on Hostinger behind Cloudflare.

## Layout

- `*.html`: pages. Clean URLs (`/about`, `/ops/userguide`) are handled by `.htaccess`.
- `assets/`: styles, scripts and fonts. `img/`: images and icons.
- `send.php`: contact form handler. It sends mail through SMTP.
- `ops-userguide.html`: **generated**. Don't edit it by hand; rebuild it from the guide Markdown (see below).
- `hostinger-private/`: mail config template. On the server, copy `switchops-mail-config.example.php` to
  `switchops-mail-config.php` **one folder above `public_html`** and put in the mailbox password.
  The real file is git-ignored.

## Local preview

```bash
npx serve -l 5173 .
```

## Build

```bash
cd tools
npm install
node build-userguide.js "path/to/SwitchOps_AI_User_Guide.md"   # regenerate /ops/userguide
node build-deploy.js                                            # minify + fingerprint -> ../switchops-site-upload.zip
```

To deploy, extract `switchops-site-upload.zip` into `public_html`.
