// Token health score — pure computation, no external API calls.

function luminance(rgb) {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  const toLinear = (v) => {
    const c = parseInt(v) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(m[1]) + 0.7152 * toLinear(m[2]) + 0.0722 * toLinear(m[3]);
}

function contrastRatio(lum1, lum2) {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Approximate perceptual color distance (simplified ΔE on RGB).
function colorDelta(cssA, cssB) {
  const parseRgb = (s) => {
    const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : null;
  };
  const a = parseRgb(cssA);
  const b = parseRgb(cssB);
  if (!a || !b) return 100;
  return Math.sqrt(2 * (a[0]-b[0])**2 + 4 * (a[1]-b[1])**2 + 3 * (a[2]-b[2])**2) / 5;
}

function scoreHealth(tokenResult) {
  const primary = tokenResult.dark || tokenResult.light;
  if (!primary) return { score: 0, critical: 0, warnings: 0, info: 0, issues: [] };

  const issues = [];

  // Color count
  const colors = primary.colors || [];
  if (colors.length > 20) {
    issues.push({ severity: 'warning', check: 'color-count', message: `${colors.length} unique colors — consider reducing palette to < 20` });
  }

  // Near-duplicate colors
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const delta = colorDelta(colors[i].value, colors[j].value);
      if (delta < 8) {
        issues.push({
          severity: 'warning', check: 'near-duplicate',
          message: `Near-duplicate: ${colors[i].name} and ${colors[j].name} are ΔE ${delta.toFixed(1)} apart — consider merging`,
        });
        if (issues.filter(i => i.check === 'near-duplicate').length >= 3) break;
      }
    }
    if (issues.filter(i => i.check === 'near-duplicate').length >= 3) break;
  }

  // Spacing grid adherence
  const spacing = primary.spacing || [];
  const baseUnit = primary.meta?.baseUnit || 4;
  if (spacing.length > 0) {
    const offGrid = spacing.filter(s => {
      const px = parseFloat(s.value);
      return px % baseUnit !== 0;
    });
    const adherence = (spacing.length - offGrid.length) / spacing.length;
    if (adherence < 0.9) {
      const offValues = offGrid.map(s => s.value).join(', ');
      issues.push({
        severity: 'critical', check: 'spacing-grid',
        message: `${offGrid.length} spacing values outside ${baseUnit}px grid: ${offValues}`,
      });
    }
  }

  // Type scale ratio
  const sizes = primary.typography?.sizes || [];
  for (let i = 0; i < sizes.length - 1; i++) {
    const a = parseFloat(sizes[i].value);
    const b = parseFloat(sizes[i + 1].value);
    if (a > 0 && b > 0 && b / a < 1.15 && b !== a) {
      issues.push({
        severity: 'warning', check: 'type-scale',
        message: `Type scale: ${sizes[i].value} and ${sizes[i+1].value} are too close (ratio ${(b/a).toFixed(2)}) — remove one`,
      });
      break;
    }
  }

  // WCAG contrast — text colors vs background colors
  const textColors = colors.filter(c => c.name.includes('text') || c.name.includes('color/text'));
  const bgColors = colors.filter(c => c.name.includes('bg') || c.name.includes('color/bg'));
  for (const text of textColors.slice(0, 3)) {
    for (const bg of bgColors.slice(0, 3)) {
      const lumText = luminance(text.value);
      const lumBg = luminance(bg.value);
      if (lumText === null || lumBg === null) continue;
      const ratio = contrastRatio(lumText, lumBg);
      if (ratio < 4.5 && ratio > 1.1) {
        issues.push({
          severity: 'critical', check: 'contrast',
          message: `Contrast fail: ${text.name} on ${bg.name} = ${ratio.toFixed(1)}:1 (WCAG AA requires 4.5:1)`,
        });
        if (issues.filter(i => i.check === 'contrast').length >= 2) break;
      }
    }
    if (issues.filter(i => i.check === 'contrast').length >= 2) break;
  }

  // Radius count
  const radius = primary.radius || [];
  if (radius.length > 5) {
    issues.push({
      severity: 'info', check: 'radius-count',
      message: `${radius.length} radius values in core use — consider consolidating to ≤ 4`,
    });
  }

  // Transition duration count
  const transitions = primary.transitions || [];
  if (transitions.length > 3) {
    issues.push({
      severity: 'info', check: 'transition-count',
      message: `${transitions.length} distinct transition values — consider reducing to 3`,
    });
  }

  const critical = issues.filter(i => i.severity === 'critical').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const info = issues.filter(i => i.severity === 'info').length;

  const score = Math.max(0, 100 - critical * 10 - warnings * 5 - info * 2);

  return { score, critical, warnings, info, issues };
}

module.exports = { scoreHealth };
