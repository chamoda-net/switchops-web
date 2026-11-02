// SwitchOps Tech — vendor & platform logos
//
// Single source of truth for every vendor logo on the site.
//
// status controls whether a vendor shows and what it says:
//   'deploys'     → shown, captioned with `caption` (factual: we deploy / support it)
//   'integration' → shown, captioned with `caption` (factual: a working integration)
//   'partner'     → shown, captioned with `partnerWording` (ONLY once enrolment is confirmed
//                   and the vendor's program allows that wording / badge)
//   'planned'     → hidden (program not joined yet — never claim it early)
//
// To publish a new partnership: change that vendor's status to 'partner'.

window.SWITCHOPS_VENDORS = [
  // ── Network & Infrastructure ──────────────────────────────────────────────
  // Shown as text until the official HPE Juniper Networking logo file is supplied (the old mark is pre-HPE).
  { name: 'HPE Juniper Networking', logo: 'junipernetworks.svg', kind: 'text', group: 'network',
    status: 'deploys', caption: 'Deploy & support', partnerWording: 'Authorized Partner' },
  { name: 'HPE Aruba Networking', logo: 'aruba.svg', kind: 'wordmark', group: 'network',
    status: 'deploys', caption: 'Deploy & support', partnerWording: 'Authorized Partner' },
  { name: 'Fortinet', logo: 'fortinet.svg', kind: 'mark', group: 'network',
    status: 'deploys', caption: 'Deploy & support', partnerWording: 'Authorized Partner' },
  { name: 'Cisco', logo: 'cisco.svg', kind: 'wordmark', group: 'network',
    status: 'deploys', caption: 'Deploy & support', partnerWording: 'Cisco Partner' },
  { name: 'Palo Alto Networks', logo: 'paloaltonetworks.svg', kind: 'mark', group: 'network',
    status: 'planned', caption: 'Deploy & support', partnerWording: 'Authorized Partner' },
  { name: 'Ubiquiti UniFi', logo: 'ubiquiti.svg', kind: 'mark', group: 'network',
    status: 'deploys', caption: 'SMB networking & Wi-Fi', partnerWording: 'Authorized Reseller' },
  { name: 'TP-Link Omada', logo: 'tplink.svg', kind: 'mark', group: 'network',
    status: 'deploys', caption: 'SMB networking & Wi-Fi', partnerWording: 'Authorized Reseller' },
  { name: 'Ruijie / Reyee', logo: 'ruijie.svg', kind: 'wordmark', group: 'network',
    status: 'deploys', caption: 'Cloud-managed networking', partnerWording: 'Authorized Reseller' },

  // ── ELV ────────────────────────────────────────────────────────────────────
  { name: 'Hikvision', logo: 'hikvision.svg', kind: 'wordmark', group: 'elv',
    status: 'deploys', caption: 'CCTV', partnerWording: 'Authorized Installer / Reseller' },
  { name: 'Dahua', logo: 'dahua.svg', kind: 'wordmark', group: 'elv',
    status: 'deploys', caption: 'CCTV', partnerWording: 'Authorized Installer / Reseller' },
  { name: 'Uniview', logo: 'uniview.svg', kind: 'wordmark', group: 'elv',
    status: 'deploys', caption: 'CCTV', partnerWording: 'Authorized Installer / Reseller' },
  { name: 'Panduit', logo: 'panduit.svg', kind: 'wordmark', group: 'elv',
    status: 'deploys', caption: 'Structured cabling', partnerWording: 'Certified Installer' },
  { name: 'Legrand', logo: 'legrand.svg', kind: 'wordmark', group: 'elv',
    status: 'deploys', caption: 'Structured cabling', partnerWording: 'Certified Installer' },
  { name: 'Tuya', logo: 'tuya.png', kind: 'wordmark', group: 'elv',
    status: 'deploys', caption: 'Smart home', partnerWording: 'Tuya Partner' },

  // ── Cloud Solutions ────────────────────────────────────────────────────────
  { name: 'Vultr', logo: 'vultr.svg', kind: 'mark', group: 'cloud',
    status: 'deploys', caption: 'Primary hosting platform', partnerWording: 'Vultr Partner' },
  { name: 'Cloudflare', logo: 'cloudflare.svg', kind: 'mark', group: 'cloud',
    status: 'deploys', caption: 'DNS, CDN & email routing', partnerWording: 'Cloudflare Partner' },
  { name: 'Microsoft Azure', logo: 'microsoftazure.svg', kind: 'mark', group: 'cloud',
    status: 'deploys', caption: 'On request', partnerWording: 'Member, Microsoft AI Cloud Partner Program' },
  { name: 'AWS', logo: 'amazonwebservices.svg', kind: 'wordmark', group: 'cloud',
    status: 'deploys', caption: 'On request', partnerWording: 'AWS Partner' },
  { name: 'Proxmox', logo: 'proxmox.svg', kind: 'mark', group: 'cloud',
    status: 'planned', caption: 'Bare-metal virtualization', partnerWording: 'Proxmox Reseller' },

  // ── Software & Development (SwitchOps AI) ─────────────────────────────────
  // "Built with Llama" is the attribution wording the Llama Community License requires.
  { name: 'Llama', logo: 'meta.svg', kind: 'mark', group: 'ai',
    status: 'integration', caption: 'Built with Llama', partnerWording: 'Built with Llama' },
  { name: 'Claude', logo: 'claude.svg', kind: 'mark', group: 'ai',
    status: 'integration', caption: 'Optional cloud AI provider', partnerWording: 'API customer' },
  { name: 'Gemini', logo: 'googlegemini.svg', kind: 'mark', group: 'ai',
    status: 'integration', caption: 'Optional cloud AI provider', partnerWording: 'API customer' },
  { name: 'OpenAI', logo: 'openai.svg', kind: 'mark', group: 'ai',
    status: 'integration', caption: 'Optional cloud AI provider', partnerWording: 'API customer' },
  { name: 'DeepSeek', logo: 'deepseek.svg', kind: 'mark', group: 'ai',
    status: 'integration', caption: 'Cloud API or local via Ollama', partnerWording: 'API customer' },
  { name: 'NVIDIA Inception', logo: 'nvidia.svg', kind: 'mark', group: 'ai',
    status: 'planned', caption: '', partnerWording: 'Member of NVIDIA Inception' },

  // ── Academy ────────────────────────────────────────────────────────────────
  // SwitchOps Academy was dropped; training now runs on EduZone via traininghub.lk,
  // so the academy entries stay hidden (kept only for the archived academy page).
  { name: 'Udemy', logo: 'udemy.svg', kind: 'mark', group: 'academy',
    status: 'planned', caption: 'Available on Udemy', partnerWording: 'Available on Udemy' },
  { name: 'Fortinet Training Institute', logo: 'fortinet.svg', kind: 'mark', group: 'academy',
    status: 'planned', caption: '', partnerWording: 'Fortinet Authorized Training Center' },
  { name: 'Cisco Networking Academy', logo: 'cisco.svg', kind: 'wordmark', group: 'academy',
    status: 'planned', caption: '', partnerWording: 'Cisco Networking Academy partner' },
  { name: 'Pearson VUE', logo: 'pearson.svg', kind: 'mark', group: 'academy',
    status: 'planned', caption: '', partnerWording: 'Pearson VUE Authorized Test Center' }
];

// Width / height of each logo file, so <img> tags carry intrinsic dimensions.
const LOGO_RATIOS = {"amazonwebservices.svg":1.63,"aruba.svg":4.389,"cisco.svg":1.834,"claude.svg":1,"cloudflare.svg":1,"dahua.svg":3.222,"deepseek.svg":1,"fortinet.svg":1,"googlegemini.svg":1,"hikvision.svg":7.496,"junipernetworks.svg":3.319,"legrand.svg":4.026,"meta.svg":1,"microsoftazure.svg":1,"nvidia.svg":1,"openai.svg":1,"paloaltonetworks.svg":1,"panduit.svg":4.542,"pearson.svg":1,"proxmox.svg":1,"ruijie.svg":3.346,"tplink.svg":1,"ubiquiti.svg":1,"udemy.svg":1,"uniview.svg":1.924,"vultr.svg":1,"tuya.png":2};

(function () {
  const visible = (v) => v.status !== 'planned';
  const label = (v) => (v.status === 'partner' ? v.partnerWording : v.caption);

  function logoMarkup(v) {
    const h = v.kind === 'mark' ? 22 : 26;
    const w = Math.round(h * (LOGO_RATIOS[v.logo] || 1));
    const img = `<img src="img/vendors/${v.logo}" alt="${v.name}" width="${w}" height="${h}" loading="lazy" decoding="async">`;
    // Symbol-only marks aren't recognisable alone, so they get the brand name set beside them.
    if (v.kind === 'text') return `<span class="vlogo is-text"><span class="vname">${v.name}</span></span>`;
    return v.kind === 'mark'
      ? `<span class="vlogo is-mark">${img}<span class="vname">${v.name}</span></span>`
      : `<span class="vlogo is-wordmark">${img}</span>`;
  }

  function renderGrid(el) {
    const groups = el.dataset.groups.split(',');
    const items = window.SWITCHOPS_VENDORS.filter((v) => visible(v) && groups.includes(v.group));
    el.innerHTML = items.map((v) =>
      `<div class="vendor-tile spot${v.status === 'partner' ? ' is-partner' : ''}">${logoMarkup(v)}<span class="vcaption">${label(v)}</span></div>`
    ).join('');
  }

  function renderMarquee(el) {
    // De-duplicate by logo file (e.g. Fortinet appears twice in the data) and keep one track.
    const seen = new Set();
    const items = window.SWITCHOPS_VENDORS.filter((v) => {
      // The strip lists technologies we deploy; AI providers are integrations, shown on the SwitchOps AI page instead.
      if (!visible(v) || v.group === 'ai' || seen.has(v.logo)) return false;
      seen.add(v.logo); return true;
    });
    const track = items.map((v) => `<li>${logoMarkup(v)}</li>`).join('');
    // Second copy makes the loop seamless; it is purely decorative for screen readers.
    el.innerHTML = `<ul class="marquee-track">${track}</ul><ul class="marquee-track" aria-hidden="true">${track}</ul>`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-vendor-grid]').forEach(renderGrid);
    document.querySelectorAll('[data-vendor-marquee]').forEach(renderMarquee);
  });
})();
