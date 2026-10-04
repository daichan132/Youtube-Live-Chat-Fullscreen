import { atom } from 'jotai'
import { selectAtom } from 'jotai/utils'
import { LEGACY_DEFAULT_MEMBERSHIP_NAME_COLOR } from '@/shared/settings/defaults'
import { areMembershipColorsEqual, areRGBAEqual } from '@/shared/settings/equality'
import { effectiveProfileAtom } from './atoms'

// Profile normalization recreates colors during a gesture. Compare their values
// so an unrelated slider preview does not update every color control.
export const effectiveAppearanceAtoms = {
  backgroundColor: selectAtom(effectiveProfileAtom, profile => profile.appearance.backgroundColor, areRGBAEqual),
  fontColor: selectAtom(effectiveProfileAtom, profile => profile.appearance.fontColor, areRGBAEqual),
  membershipNameColor: selectAtom(effectiveProfileAtom, profile => profile.appearance.membershipNameColor, areMembershipColorsEqual),
  fontFamily: atom(get => get(effectiveProfileAtom).appearance.fontFamily),
  fontSize: atom(get => get(effectiveProfileAtom).appearance.fontSize),
  blur: atom(get => get(effectiveProfileAtom).appearance.blur),
  spacing: atom(get => get(effectiveProfileAtom).appearance.spacing),
  showUserName: atom(get => get(effectiveProfileAtom).appearance.showUserName),
  showUserIcon: atom(get => get(effectiveProfileAtom).appearance.showUserIcon),
  showSuperChatBar: atom(get => get(effectiveProfileAtom).appearance.showSuperChatBar),
}

export const effectiveDisplayAtoms = {
  idleVisibility: atom(get => get(effectiveProfileAtom).display.idleVisibility),
  contentMode: atom(get => get(effectiveProfileAtom).display.contentMode),
}

export const effectiveColorAtoms = {
  backgroundColor: effectiveAppearanceAtoms.backgroundColor,
  fontColor: effectiveAppearanceAtoms.fontColor,
  membershipNameColor: atom(get => {
    const color = get(effectiveAppearanceAtoms.membershipNameColor)
    return color.mode === 'custom' ? color.value : LEGACY_DEFAULT_MEMBERSHIP_NAME_COLOR
  }),
}

export const membershipNameUsesDefaultColorAtom = atom(get => get(effectiveAppearanceAtoms.membershipNameColor).mode === 'youtube-default')
