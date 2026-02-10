type Props = {
  checked: boolean
  id: string
  onChange: (checked: boolean) => void
}

export const Switch = (props: Props) => {
  const { checked, id, onChange } = props
  return (
    <button
      type='button'
      id={id}
      role='switch'
      aria-checked={checked}
      className='ylc-theme-toggle'
      data-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className='ylc-theme-toggle-track' aria-hidden='true' />
      <span className='ylc-theme-toggle-thumb' aria-hidden='true' />
    </button>
  )
}
