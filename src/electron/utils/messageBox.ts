import { dialog } from 'electron'

type MessageBoxType = 'none' | 'info' | 'error' | 'question' | 'warning'
type MessageBoxButtonType = 'Ok' | 'Cancel'

export class MessageBoxBuilder {
    private type: MessageBoxType
    private buttons: MessageBoxButtonType[]
    private selectedIndex: number | undefined
    private details: string | undefined

    constructor(type: MessageBoxType) {
        this.type = type
        this.buttons = []
        this.selectedIndex = undefined
        this.details = undefined
    }

    static new(type: MessageBoxType) {
        return new MessageBoxBuilder(type)
    }

    button(type: MessageBoxButtonType, selected = false) {
        if (!this.buttons.includes(type)) this.buttons.push(type)
        if (selected) {
            this.selectedIndex = this.buttons.findIndex((b) => b === type)
        }
        return this
    }

    detail(detail: string) {
        this.details = detail
        return this
    }

    build(title: string, message: string) {
        const response = dialog.showMessageBox({
            type: this.type,
            title,
            message,
            detail: this.details,
            defaultId: this.selectedIndex,
            buttons: this.buttons
        })
        console.log(response)
    }
}
