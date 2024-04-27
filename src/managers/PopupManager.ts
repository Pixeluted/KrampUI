import { writable } from "svelte/store"

export type ButtonData = {
    text: string,
    isCloseButton: boolean,
    onClick?: () => void
}

export type PopupData = {
    title: string,
    message: string,
    buttons: ButtonData[]
}

export type PopupState = {
    currentPopup: PopupData | null,
    popupVisible: boolean
}

export class PopupManager {
    public static currentPopupState = writable<PopupState>({
        currentPopup: null,
        popupVisible: false
    })

    public static showPopup(popup: PopupData) {
        PopupManager.currentPopupState.update(state => {
            return { currentPopup: popup, popupVisible: true }
        })
    }

    public static closePopup() {
        PopupManager.currentPopupState.update(state => {
            return { currentPopup: null, popupVisible: false }
        })
    }
}