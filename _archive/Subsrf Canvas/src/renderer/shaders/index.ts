// Inline GLSL 300 es shader sources — no webpack config needed

export const SHAPE_VERT = /* glsl */`#version 300 es
precision highp float;

// Per-vertex: unit quad (0,0)→(1,1)
layout(location=0) in vec2 a_quadPos;

// Per-instance node data
layout(location=1)  in vec4  a_bounds;       // x, y, w, h  (canvas/design coords)
layout(location=2)  in vec4  a_fillColor;    // r, g, b, a  (SOLID fill)
layout(location=3)  in float a_cornerRadius;
layout(location=4)  in vec4  a_strokeColor;  // r, g, b, a
layout(location=5)  in float a_strokeWidth;
layout(location=6)  in float a_strokeAlign;  // 0=center 1=inside 2=outside
layout(location=7)  in float a_fillType;     // 0=solid 1=linear 2=radial 3=angular 4=image
layout(location=8)  in float a_opacity;
layout(location=9)  in float a_shapeType;    // 0=rect 1=ellipse
layout(location=10) in float a_gradSlot;     // row index in gradient atlas
layout(location=11) in float a_gradAngle;    // radians, for linear gradient
layout(location=12) in vec2  a_gradCenter;   // 0–1 within quad

uniform vec2  u_resolution; // CSS pixel size of canvas
uniform vec2  u_viewport;   // pan offset in CSS pixels
uniform float u_zoom;

out vec2  v_uv;
out vec2  v_nodeSize;
out vec4  v_fillColor;
out float v_cornerRadius;
out vec4  v_strokeColor;
out float v_strokeWidth;
out float v_strokeAlign;
out float v_fillType;
out float v_opacity;
out float v_shapeType;
out float v_gradSlot;
out float v_gradAngle;
out vec2  v_gradCenter;

void main() {
  v_uv          = a_quadPos;
  v_nodeSize    = a_bounds.zw;
  v_fillColor   = a_fillColor;
  v_cornerRadius= a_cornerRadius;
  v_strokeColor = a_strokeColor;
  v_strokeWidth = a_strokeWidth;
  v_strokeAlign = a_strokeAlign;
  v_fillType    = a_fillType;
  v_opacity     = a_opacity;
  v_shapeType   = a_shapeType;
  v_gradSlot    = a_gradSlot;
  v_gradAngle   = a_gradAngle;
  v_gradCenter  = a_gradCenter;

  vec2 canvasPos = a_bounds.xy + a_quadPos * a_bounds.zw;
  vec2 screenPos = canvasPos * u_zoom + u_viewport;
  vec2 ndc = (screenPos / u_resolution) * 2.0 - 1.0;
  ndc.y = -ndc.y;
  gl_Position = vec4(ndc, 0.0, 1.0);
}
`

export const SHAPE_FRAG = /* glsl */`#version 300 es
precision highp float;

uniform sampler2D u_gradAtlas;
uniform float     u_gradAtlasRows;

in vec2  v_uv;
in vec2  v_nodeSize;
in vec4  v_fillColor;
in float v_cornerRadius;
in vec4  v_strokeColor;
in float v_strokeWidth;
in float v_strokeAlign;
in float v_fillType;
in float v_opacity;
in float v_shapeType;
in float v_gradSlot;
in float v_gradAngle;
in vec2  v_gradCenter;

out vec4 fragColor;

// SDF for axis-aligned rounded rectangle
// p: position relative to rect center
// b: half-extents (w/2, h/2)
// r: corner radius
float sdRoundedRect(vec2 p, vec2 b, float r) {
  r = min(r, min(b.x, b.y));
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// SDF for axis-aligned ellipse
float sdEllipse(vec2 p, vec2 ab) {
  vec2 pn = p / max(ab, vec2(0.001));
  float l = length(pn);
  return (l - 1.0) * min(ab.x, ab.y);
}

vec4 sampleGradient(float t) {
  float row = (v_gradSlot + 0.5) / u_gradAtlasRows;
  return texture(u_gradAtlas, vec2(clamp(t, 0.0, 1.0), row));
}

void main() {
  vec2 halfSize = v_nodeSize * 0.5;
  // position relative to quad center, in design-unit canvas coords
  vec2 p = (v_uv - 0.5) * v_nodeSize;

  float sd;
  if (v_shapeType < 0.5) {
    sd = sdRoundedRect(p, halfSize, v_cornerRadius);
  } else {
    sd = sdEllipse(p, halfSize);
  }

  float aa = max(fwidth(sd) * 1.5, 0.25);

  // ── Fill colour ──────────────────────────────────────────────────────────
  vec4 fc;
  if (v_fillType < 0.5) {
    // SOLID
    fc = v_fillColor;
  } else if (v_fillType < 1.5) {
    // LINEAR gradient
    float cosA = cos(v_gradAngle);
    float sinA = sin(v_gradAngle);
    vec2 d = v_uv - v_gradCenter;
    float t = dot(d, vec2(cosA, sinA)) + 0.5;
    fc = sampleGradient(t);
  } else if (v_fillType < 2.5) {
    // RADIAL gradient
    float t = length(v_uv - v_gradCenter) * 2.0;
    fc = sampleGradient(t);
  } else if (v_fillType < 3.5) {
    // ANGULAR gradient
    vec2 d = v_uv - v_gradCenter;
    float t = atan(d.y, d.x) / (2.0 * 3.14159265359) + 0.5;
    fc = sampleGradient(t);
  } else {
    // IMAGE fill or no-fill placeholder
    fc = vec4(0.18, 0.18, 0.22, 1.0);
  }

  // ── Shape fill alpha ─────────────────────────────────────────────────────
  float fillAlpha = 1.0 - smoothstep(-aa, aa, sd);

  // ── Stroke ───────────────────────────────────────────────────────────────
  float strokeAlpha = 0.0;
  if (v_strokeWidth > 0.001) {
    float sMin, sMax;
    if (v_strokeAlign < 0.5) {          // CENTER
      sMin = -v_strokeWidth * 0.5;
      sMax =  v_strokeWidth * 0.5;
    } else if (v_strokeAlign < 1.5) {   // INSIDE
      sMin = -v_strokeWidth;
      sMax = 0.0;
    } else {                             // OUTSIDE
      sMin = 0.0;
      sMax = v_strokeWidth;
    }
    strokeAlpha = smoothstep(sMin - aa, sMin + aa, sd)
                * (1.0 - smoothstep(sMax - aa, sMax + aa, sd));
  }

  // ── Over-composite: stroke on top of fill ────────────────────────────────
  float inFill   = fillAlpha   * fc.a;
  float inStroke = strokeAlpha * v_strokeColor.a;

  float totalA = inFill + inStroke * (1.0 - inFill);
  if (totalA < 0.001) discard;

  vec3 totalRGB = (fc.rgb * inFill + v_strokeColor.rgb * inStroke * (1.0 - inFill))
                  / max(totalA, 0.001);
  totalA *= v_opacity;
  if (totalA < 0.001) discard;

  // Premultiply alpha for correct blending with gl.ONE + gl.ONE_MINUS_SRC_ALPHA
  fragColor = vec4(totalRGB * totalA, totalA);
}
`

// ── Text shaders ─────────────────────────────────────────────────────────────

export const TEXT_VERT = /* glsl */`#version 300 es
precision highp float;

layout(location=0) in vec2  a_pos;     // unit quad 0→1
layout(location=1) in vec4  a_bounds;  // x, y, w, h
layout(location=2) in float a_opacity;

uniform vec2  u_resolution;
uniform vec2  u_viewport;
uniform float u_zoom;

out vec2  v_uv;
out float v_opacity;

void main() {
  v_uv     = a_pos;
  v_opacity = a_opacity;
  vec2 canvasPos = a_bounds.xy + a_pos * a_bounds.zw;
  vec2 screenPos = canvasPos * u_zoom + u_viewport;
  vec2 ndc = (screenPos / u_resolution) * 2.0 - 1.0;
  ndc.y = -ndc.y;
  gl_Position = vec4(ndc, 0.0, 1.0);
}
`

export const TEXT_FRAG = /* glsl */`#version 300 es
precision highp float;

uniform sampler2D u_texture;

in vec2  v_uv;
in float v_opacity;

out vec4 fragColor;

void main() {
  vec4 c = texture(u_texture, v_uv);
  c.a *= v_opacity;
  if (c.a < 0.001) discard;
  // Premultiply
  fragColor = vec4(c.rgb * c.a, c.a);
}
`
