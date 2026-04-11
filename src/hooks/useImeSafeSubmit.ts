import { useCallback, useRef, type FormEventHandler, type KeyboardEventHandler, type MouseEventHandler } from 'react'

type EditableElement = HTMLInputElement | HTMLTextAreaElement

function isEditableElement(element: Element | null): element is EditableElement {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
}

export function useImeSafeSubmit() {
  const isComposingRef = useRef(false)

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true
  }, [])

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false
  }, [])

  const isEventComposing = useCallback((event?: { nativeEvent?: Event }) => {
    const nativeEvent = event?.nativeEvent
    const composing = nativeEvent && 'isComposing' in nativeEvent ? nativeEvent.isComposing : false
    return Boolean(composing) || isComposingRef.current
  }, [])

  const commitComposition = useCallback(async () => {
    if (!isComposingRef.current) return

    const activeElement = document.activeElement
    if (isEditableElement(activeElement)) {
      activeElement.blur()
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 0)
    })
  }, [])

  const runImeSafeAction = useCallback(
    async (action: () => void | Promise<void>) => {
      await commitComposition()
      if (isComposingRef.current) return false
      await action()
      return true
    },
    [commitComposition],
  )

  const createSubmitHandler = useCallback(
    (action: () => void | Promise<void>): FormEventHandler<HTMLFormElement> =>
      async (event) => {
        event.preventDefault()

        if (isEventComposing(event)) {
          await commitComposition()
        }

        if (isComposingRef.current || isEventComposing(event)) {
          return
        }

        await action()
      },
    [commitComposition, isEventComposing],
  )

  const preventEnterWhileComposing = useCallback(
    <T extends EditableElement>(): KeyboardEventHandler<T> =>
      (event) => {
        if (event.key === 'Enter' && isEventComposing(event)) {
          event.preventDefault()
        }
      },
    [isEventComposing],
  )

  const preventBlurOnMouseDown = useCallback<MouseEventHandler<HTMLElement>>((event) => {
    event.preventDefault()
  }, [])

  return {
    isComposingRef,
    handleCompositionStart,
    handleCompositionEnd,
    createSubmitHandler,
    preventEnterWhileComposing,
    preventBlurOnMouseDown,
    runImeSafeAction,
  }
}
