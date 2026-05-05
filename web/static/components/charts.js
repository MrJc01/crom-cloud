// Crom Cloud — SVG Charts (Zero Dependencies)

const Chart = {
  sparkline(data, opts = {}) {
    const { w = 120, h = 32, color = '#6366f1' } = opts;
    if (!data || data.length < 2) return '';
    const max = Math.max(...data), min = Math.min(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
    return `<svg width="${w}" height="${h}" class="mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
      <defs><linearGradient id="sg${color.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.3"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:1000;stroke-dashoffset:1000;animation:draw-line 1.5s ease-out forwards"/>
      <polygon points="0,${h} ${pts} ${w},${h}" fill="url(#sg${color.slice(1)})" opacity="0.5"/>
    </svg>`;
  },

  bar(labels, values, opts = {}) {
    const { w = 300, h = 150, color = '#6366f1' } = opts;
    const max = Math.max(...values) || 1;
    const barW = Math.min(30, (w - 20) / values.length - 4);
    const bars = values.map((v, i) => {
      const bh = (v / max) * (h - 30);
      const x = 10 + i * ((w - 20) / values.length) + ((w - 20) / values.length - barW) / 2;
      return `<g>
        <rect x="${x}" y="${h - bh - 20}" width="${barW}" height="${bh}" rx="3" fill="${color}" opacity="0.8" style="transform-origin:bottom;animation:bar-grow 0.8s ease-out both;animation-delay:${i * 0.1}s">
          <title>${labels[i]}: ${v}</title>
        </rect>
        <text x="${x + barW / 2}" y="${h - 5}" text-anchor="middle" fill="#64748b" font-size="9" font-family="Inter">${labels[i]}</text>
      </g>`;
    }).join('');
    return `<svg width="100%" viewBox="0 0 ${w} ${h}" class="anim-fade">${bars}</svg>`;
  },

  donut(segments, opts = {}) {
    const { size = 120, thickness = 14 } = opts;
    const r = (size - thickness) / 2;
    const circ = 2 * Math.PI * r;
    const total = segments.reduce((a, s) => a + s.value, 0) || 1;
    let offset = 0;
    const arcs = segments.map((s, i) => {
      const pct = s.value / total;
      const dash = pct * circ;
      const o = offset;
      offset += dash;
      return `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${thickness}" stroke-dasharray="${dash} ${circ - dash}" stroke-dashoffset="${-o}" stroke-linecap="round" style="animation:fade-in 0.6s ease-out both;animation-delay:${i * 0.15}s" transform="rotate(-90 ${size / 2} ${size / 2})"><title>${s.label}: ${s.value}</title></circle>`;
    }).join('');
    return `<svg width="${size}" height="${size}" class="anim-fade">${arcs}
      <text x="${size / 2}" y="${size / 2}" text-anchor="middle" dy="0.35em" fill="#f1f5f9" font-size="18" font-weight="800" font-family="Inter">${total}</text>
    </svg>`;
  },

  area(data, opts = {}) {
    const { w = 300, h = 80, color = '#6366f1', labels = [] } = opts;
    if (!data || data.length < 2) return '';
    const max = Math.max(...data) || 1;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 10 - (v / max) * (h - 20)}`).join(' ');
    const gradId = 'ag' + Math.random().toString(36).slice(2, 6);
    return `<svg width="100%" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="anim-fade">
      <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.25"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      <polygon points="0,${h} ${pts} ${w},${h}" fill="url(#${gradId})"/>
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray:2000;stroke-dashoffset:2000;animation:draw-line 2s ease-out forwards"/>
    </svg>`;
  },
};
