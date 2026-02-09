import { useGlobalSettingStore, useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'

const cloneYTDLiveChatState = (state: ReturnType<typeof useYTDLiveChatStore.getState>) => ({
  ...state,
  bgColor: { ...state.bgColor },
  fontColor: { ...state.fontColor },
  coordinates: { ...state.coordinates },
  size: { ...state.size },
  presetItemIds: [...state.presetItemIds],
  presetItemStyles: Object.fromEntries(
    Object.entries(state.presetItemStyles).map(([id, style]) => [
      id,
      {
        ...style,
        bgColor: { ...style.bgColor },
        fontColor: { ...style.fontColor },
      },
    ]),
  ),
  presetItemTitles: { ...state.presetItemTitles },
})

const initialGlobalSettingState = { ...useGlobalSettingStore.getState() }
const initialNoLsState = {
  ...useYTDLiveChatNoLsStore.getState(),
  clip: { ...useYTDLiveChatNoLsStore.getState().clip },
  iframeElement: null,
}
const initialYTDLiveChatState = cloneYTDLiveChatState(useYTDLiveChatStore.getState())

export const resetStorybookStores = () => {
  useGlobalSettingStore.setState({ ...initialGlobalSettingState }, true)
  useYTDLiveChatNoLsStore.setState(
    {
      ...initialNoLsState,
      clip: { ...initialNoLsState.clip },
      iframeElement: null,
    },
    true,
  )
  useYTDLiveChatStore.setState(cloneYTDLiveChatState(initialYTDLiveChatState), true)
}
