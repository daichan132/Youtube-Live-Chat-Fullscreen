import type { SVGProps } from 'react'

export type IconProps = SVGProps<SVGSVGElement> & { size?: number | string }

export type IconType = (props: IconProps) => React.ReactElement
