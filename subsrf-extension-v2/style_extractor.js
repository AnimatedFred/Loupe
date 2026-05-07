  function getRelevantStyles(el) {
    const computed = window.getComputedStyle(el);
    const keys = [
      'display', 'position', 'width', 'height', 'opacity', 'zIndex',
      'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'backgroundColor', 'color', 'fontSize', 'fontFamily', 'fontWeight',
      'lineHeight', 'letterSpacing', 'textAlign',
      'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
      'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
      'borderRadius', 'boxShadow', 'overflow',
      'flexDirection', 'alignItems', 'justifyContent', 'gap',
      'transform', 'filter', 'backdropFilter'
    ];
    const styles = {};
    keys.forEach(k => {
      let val = computed[k];
      if (!val || val === 'none' || val === 'normal' || val.includes('0s')) return;
      
      // Special handling for zIndex auto
      if (k === 'zIndex' && val === 'auto') val = '0';
      
      // Filter out 0px for non-essential properties, but keep for layout if needed
      if (val === '0px' && !['padding', 'margin', 'borderRadius'].includes(k)) return;
      
      // Round px values
      if (val.endsWith('px')) {
        const num = parseFloat(val);
        if (!isNaN(num)) val = Math.round(num) + 'px';
      }

      styles[k] = val;
    });
    return styles;
  }
