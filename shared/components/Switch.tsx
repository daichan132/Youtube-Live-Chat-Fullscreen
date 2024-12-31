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
        className={`relative inset-0 box-shadow-inner rounded-full cursor-pointer flex items-center text-[16px] w-[40px] h-[23px] transition-colors duration-200 ${
          checked ? 'bg-green-5' : 'bg-gray-4'
        }`}
        htmlFor={id}
      >
        <span
          className={`absolute bg-white rounded-full w-[18px] h-[18px] left-[2px] transition-transform duration-200 ${
            checked ? 'translate-x-full' : 'translate-x-0'
          }`}
        />
      </label>
    </div>
  )
}
