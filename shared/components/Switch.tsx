type Props = {
  checked: boolean
  id: string
  onChange: (checked: boolean) => void
}

export const Switch = (props: Props) => {
  const { checked, id, onChange } = props
  return (
    <div className='relative flex items-center'>
      <input
        className='hidden'
        id={id}
        type='checkbox'
        checked={checked}
        onChange={() => {
          onChange(!checked)
        }}
      />
      <label
        className={`relative inset-0 shadow-inner rounded-full cursor-pointer flex items-center text-[16px] w-[44px] h-[24px] transition-colors duration-200 ${
          checked ? 'bg-green-5' : 'bg-gray-4'
        }`}
        htmlFor={id}
      >
        <span
          className={`absolute bg-white rounded-full w-[18px] h-[18px] transition-transform duration-200 ${
            checked ? 'translate-x-[23px]' : 'translate-x-[3px]'
          }`}
        />
      </label>
    </div>
  )
}
