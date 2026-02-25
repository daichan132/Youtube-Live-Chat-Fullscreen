import type { IconProps } from './types'

const Tabler = ({ size = 24, children, ...props }: IconProps & { children: React.ReactNode }) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={2}
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
    {...props}
  >
    {children}
  </svg>
)

export const TbBlur = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M12 21a9.01 9.01 0 0 0 2.32 -.302a9 9 0 0 0 1.74 -16.733a9 9 0 1 0 -4.06 17.035z' />
    <path d='M12 3v17' />
    <path d='M12 12h9' />
    <path d='M12 9h8' />
    <path d='M12 6h6' />
    <path d='M12 18h6' />
    <path d='M12 15h8' />
  </Tabler>
)

export const TbClock = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0' />
    <path d='M12 7v5l3 3' />
  </Tabler>
)

export const TbCrown = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M12 6l4 6l5 -4l-2 10h-14l-2 -10l5 4z' />
  </Tabler>
)

export const TbMessageCircle = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1' />
  </Tabler>
)

export const TbPaint = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M5 3m0 2a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z' />
    <path d='M19 6h1a2 2 0 0 1 2 2a5 5 0 0 1 -5 5l-5 0v2' />
    <path d='M10 15m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z' />
  </Tabler>
)

export const TbPalette = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25' />
    <path d='M8.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0' />
    <path d='M12.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0' />
    <path d='M16.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0' />
  </Tabler>
)

export const TbSpacingHorizontal = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M20 20h-2a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h2' />
    <path d='M4 20h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2h-2' />
    <path d='M12 8v8' />
  </Tabler>
)

export const TbTextSize = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M3 7v-2h13v2' />
    <path d='M10 5v14' />
    <path d='M12 19h-4' />
    <path d='M15 13v-1h6v1' />
    <path d='M18 12v7' />
    <path d='M17 19h2' />
  </Tabler>
)

export const TbTypography = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M4 20l3 0' />
    <path d='M14 20l7 0' />
    <path d='M6.9 15l6.9 0' />
    <path d='M10.2 6.3l5.8 13.7' />
    <path d='M5 20l6 -16l2 0l7 16' />
  </Tabler>
)

export const TbUser = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0' />
    <path d='M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2' />
  </Tabler>
)

export const TbUserCircle = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0' />
    <path d='M12 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0' />
    <path d='M6.168 18.849a4 4 0 0 1 3.832 -2.849h4a4 4 0 0 1 3.834 2.855' />
  </Tabler>
)

export const TbLayoutGrid = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M4 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z' />
    <path d='M14 4m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z' />
    <path d='M4 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z' />
    <path d='M14 14m0 1a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z' />
  </Tabler>
)

export const TbSettings2 = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M19.875 6.27a2.225 2.225 0 0 1 1.125 1.948v7.284c0 .809 -.443 1.555 -1.158 1.948l-6.75 4.27a2.269 2.269 0 0 1 -2.184 0l-6.75 -4.27a2.225 2.225 0 0 1 -1.158 -1.948v-7.285c0 -.809 .443 -1.554 1.158 -1.947l6.75 -3.98a2.33 2.33 0 0 1 2.25 0l6.75 3.98h-.033z' />
    <path d='M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0' />
  </Tabler>
)

export const TbCheck = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M5 12l5 5l10 -10' />
  </Tabler>
)

export const TbPlus = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M12 5l0 14' />
    <path d='M5 12l14 0' />
  </Tabler>
)

export const TbGripVertical = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M9 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0' />
    <path d='M9 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0' />
    <path d='M9 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0' />
    <path d='M15 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0' />
    <path d='M15 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0' />
    <path d='M15 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0' />
  </Tabler>
)

export const TbSparkles = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z' />
  </Tabler>
)

export const TbTrash = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M4 7l16 0' />
    <path d='M10 11l0 6' />
    <path d='M14 11l0 6' />
    <path d='M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12' />
    <path d='M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3' />
  </Tabler>
)

export const TbAdjustmentsHorizontal = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M14 6m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0' />
    <path d='M4 6l8 0' />
    <path d='M16 6l4 0' />
    <path d='M8 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0' />
    <path d='M4 12l2 0' />
    <path d='M10 12l10 0' />
    <path d='M17 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0' />
    <path d='M4 18l11 0' />
    <path d='M19 18l1 0' />
  </Tabler>
)

export const TbArchive = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M3 4m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z' />
    <path d='M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-10' />
    <path d='M10 12l4 0' />
  </Tabler>
)

export const TbHeartDollar = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M13 19l-1 1l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 0 1 8.785 4.444' />
    <path d='M21 15h-2.5a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3h-2.5' />
    <path d='M19 21v1m0 -8v1' />
  </Tabler>
)

export const TbLanguage = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M4 5h7' />
    <path d='M9 3v2c0 4.418 -2.239 8 -5 8' />
    <path d='M5 9c0 2.144 2.952 3.908 6.7 4' />
    <path d='M12 20l4 -9l4 9' />
    <path d='M19.1 18h-6.2' />
  </Tabler>
)

export const TbLink = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M9 15l6 -6' />
    <path d='M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464' />
    <path d='M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463' />
  </Tabler>
)

export const TbSunMoon = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M9.173 14.83a4 4 0 1 1 5.657 -5.657' />
    <path d='M11.294 12.707l.174 .247a7.5 7.5 0 0 0 8.845 2.492a9 9 0 0 1 -14.671 2.914' />
    <path d='M3 12h1' />
    <path d='M12 3v1' />
    <path d='M5.6 5.6l.7 .7' />
    <path d='M3 21l18 -18' />
  </Tabler>
)

export const TbDownload = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2' />
    <path d='M7 11l5 5l5 -5' />
    <path d='M12 4l0 12' />
  </Tabler>
)

export const TbUpload = (props: IconProps) => (
  <Tabler {...props}>
    <path d='M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2' />
    <path d='M7 9l5 -5l5 5' />
    <path d='M12 4l0 12' />
  </Tabler>
)
