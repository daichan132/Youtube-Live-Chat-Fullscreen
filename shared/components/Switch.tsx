type Props = {
  checked: boolean
  id: string
  onChange: (checked: boolean) => void
  disabled?: boolean
  'aria-label'?: string
  'aria-describedby'?: string
}

export const Switch = (props: Props) => {
  const { checked, id, onChange, disabled, 'aria-label': ariaLabel, 'aria-describedby': ariaDescribedby } = props
  return (
    <input
      type='checkbox'
      id={id}
      role='switch'
      className='ylc-theme-toggle'
      checked={checked}
      disabled={disabled}
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      onChange={event => onChange(event.target.checked)}
    />
  )
}
