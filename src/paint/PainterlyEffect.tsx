import { forwardRef, useEffect, useMemo } from 'react'
import { Effect, EffectAttribute } from 'postprocessing'
import { Uniform } from 'three'

// Digital-painting look: a Kuwahara filter flattens the render into brush-like
// patches, then ink edges, a wobble of the "brush", canvas grain and a colour grade.
const fragment = /* glsl */ `
uniform float uBrush;
uniform float uScale;
uniform float uEdges;
uniform float uPaper;
uniform float uWarmth;
uniform float uSaturation;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 px = texelSize * uScale;
  vec2 aspect = vec2(resolution.x / resolution.y, 1.0);

  // Hand wobble: strokes never sit on perfectly straight lines.
  vec2 wob = vec2(fbm(uv * aspect * 14.0), fbm(uv * aspect * 14.0 + 9.7)) - 0.5;
  vec2 suv = uv + wob * px * 3.0;

  // Kuwahara, 4 overlapping quadrants; keep the mean of the calmest one.
  const int R = 5;
  vec3 m0 = vec3(0), m1 = vec3(0), m2 = vec3(0), m3 = vec3(0);
  vec3 s0 = vec3(0), s1 = vec3(0), s2 = vec3(0), s3 = vec3(0);
  float n0 = 0.0, n1 = 0.0, n2 = 0.0, n3 = 0.0;
  for (int j = -R; j <= R; j++) {
    for (int i = -R; i <= R; i++) {
      if (float(abs(i)) > uBrush || float(abs(j)) > uBrush) continue;
      vec3 c = texture2D(inputBuffer, suv + vec2(float(i), float(j)) * px).rgb;
      vec3 cc = c * c;
      if (i <= 0 && j <= 0) { m0 += c; s0 += cc; n0 += 1.0; }
      if (i >= 0 && j <= 0) { m1 += c; s1 += cc; n1 += 1.0; }
      if (i <= 0 && j >= 0) { m2 += c; s2 += cc; n2 += 1.0; }
      if (i >= 0 && j >= 0) { m3 += c; s3 += cc; n3 += 1.0; }
    }
  }
  m0 /= n0; m1 /= n1; m2 /= n2; m3 /= n3;
  float v0 = dot(s0 / n0 - m0 * m0, vec3(1));
  float v1 = dot(s1 / n1 - m1 * m1, vec3(1));
  float v2 = dot(s2 / n2 - m2 * m2, vec3(1));
  float v3 = dot(s3 / n3 - m3 * m3, vec3(1));
  vec3 col = m0; float best = v0;
  if (v1 < best) { best = v1; col = m1; }
  if (v2 < best) { best = v2; col = m2; }
  if (v3 < best) { best = v3; col = m3; }

  // Ink: darken where luminance changes sharply.
  vec2 e = px * 1.5;
  float gx = luma(texture2D(inputBuffer, suv + vec2(e.x, 0)).rgb) - luma(texture2D(inputBuffer, suv - vec2(e.x, 0)).rgb);
  float gy = luma(texture2D(inputBuffer, suv + vec2(0, e.y)).rgb) - luma(texture2D(inputBuffer, suv - vec2(0, e.y)).rgb);
  float edge = smoothstep(0.06, 0.35, length(vec2(gx, gy)));
  col = mix(col, col * vec3(0.42, 0.33, 0.30), edge * uEdges);

  // Grade: saturation and a warm/cool push.
  float l = luma(col);
  col = mix(vec3(l), col, uSaturation);
  col *= vec3(1.0 + uWarmth, 1.0 + uWarmth * 0.3, 1.0 - uWarmth);

  // Canvas: woven tooth + mottled pigment.
  vec2 cuv = uv * resolution / uScale;
  float weave = (sin(cuv.x * 1.9) * sin(cuv.y * 1.9)) * 0.5 + 0.5;
  float mottle = fbm(uv * aspect * 60.0);
  col *= 1.0 - uPaper * (0.05 * weave + 0.09 * (mottle - 0.5));

  // Gentle vignette, like the edge of a painted board.
  vec2 d = (uv - 0.5) * vec2(1.1, 1.0);
  col *= 1.0 - 0.32 * smoothstep(0.35, 0.85, length(d));

  outputColor = vec4(clamp(col, 0.0, 1.0), inputColor.a);
}
`

class PainterlyImpl extends Effect {
  constructor() {
    super('Painterly', fragment, {
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([
        ['uBrush', new Uniform(4)],
        ['uScale', new Uniform(1)],
        ['uEdges', new Uniform(0.4)],
        ['uPaper', new Uniform(0.5)],
        ['uWarmth', new Uniform(0.05)],
        ['uSaturation', new Uniform(1.05)],
      ]),
    })
  }
}

export interface PainterlyProps { brush: number; scale: number; edges: number; paper: number; warmth: number; saturation: number }

export const Painterly = forwardRef<PainterlyImpl, PainterlyProps>(function Painterly(props, ref) {
  const effect = useMemo(() => new PainterlyImpl(), [])
  useEffect(() => {
    const u = effect.uniforms
    u.get('uBrush')!.value = props.brush
    u.get('uScale')!.value = props.scale
    u.get('uEdges')!.value = props.edges
    u.get('uPaper')!.value = props.paper
    u.get('uWarmth')!.value = props.warmth
    u.get('uSaturation')!.value = props.saturation
  }, [effect, props.brush, props.scale, props.edges, props.paper, props.warmth, props.saturation])
  return <primitive ref={ref} object={effect} dispose={null} />
})
