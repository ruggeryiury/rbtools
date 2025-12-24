export const pkgContentKeys = [
  {
    key: Buffer.from('Lntx18nJoU6jIh8YiCi4+A==', 'base64') as Buffer,
    desc: 'PS3',
  },
  {
    key: Buffer.from('B/LGgpC1DSwzgY1wm2DmKw==', 'base64') as Buffer,
    desc: 'PSX/PSP',
  },
  {
    key: Buffer.from('4xpwyc4d1yvzwGIpY/Lsyw==', 'base64') as Buffer,
    desc: 'PSV',
    derive: true,
  },
  {
    key: Buffer.from('QjrKOivVZJ+Whqutb9iAHw==', 'base64') as Buffer,
    desc: 'PSV Livearea',
    derive: true,
  },
  {
    key: Buffer.from('rwf9WWUlJ7rxM4lmixfZ6g==', 'base64') as Buffer,
    desc: 'PSM',
    derive: true,
  },
] as const
