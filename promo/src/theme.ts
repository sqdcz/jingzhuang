export const C = {
  bg: '#060a09',
  bg2: '#0c1312',
  green: '#0e8a6d',
  greenLite: '#3dc79f',
  greenDeep: '#064639',
  ok: '#35b87a',
  warn: '#f5a524',
  danger: '#e5484d',
  text: '#eef5f2',
  sub: '#8ba39d',
  faint: '#5d716c',
  line: 'rgba(255,255,255,0.09)',
  card: 'rgba(255,255,255,0.035)',
}

export const F = {
  sans: '"Microsoft YaHei","PingFang SC","Noto Sans SC",system-ui,sans-serif',
  mono: 'Consolas,"Cascadia Mono","Courier New",monospace',
}

/** 30fps 帧号换算 */
export const sec = (s: number) => Math.round(s * 30)
