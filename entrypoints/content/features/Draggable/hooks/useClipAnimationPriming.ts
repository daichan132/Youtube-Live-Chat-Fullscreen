import { useEffect, useRef, useState } from 'react'

interface Clip {
  header: number
  input: number
}

interface UseClipAnimationPrimingProps {
  isClipPath: boolean
  clip: Clip
}

export const useClipAnimationPriming = ({ isClipPath, clip }: UseClipAnimationPrimingProps) => {
  const [isClipAnimationReady, setIsClipAnimationReady] = useState(false)
  const hasPrimedRef = useRef(false)

  useEffect(() => {
    if (hasPrimedRef.current || isClipAnimationReady) return

    const hasMeasuredClip = clip.header + clip.input > 0
    if (!isClipPath || !hasMeasuredClip) return

    const timer = setTimeout(() => {
      hasPrimedRef.current = true
      setIsClipAnimationReady(true)
    }, 0)

    return () => clearTimeout(timer)
  }, [isClipPath, clip.header, clip.input, isClipAnimationReady])

  return {
    isClipAnimationReady,
  }
}
