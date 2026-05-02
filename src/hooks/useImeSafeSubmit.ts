import {
  useCallback,
  useRef,
  type CompositionEventHandler,
  type FormEventHandler,
  type KeyboardEventHandler,
  type MouseEventHandler,
} from 'react'

type EditableElement = HTMLInputElement | HTMLTextAreaElement

function isEditableElement(element: Element | null): element is EditableElement {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
}

export function useImeSafeSubmit() {
  const isComposingRef = useRef(false)
  const composingElementRef = useRef<EditableElement | null>(null)

  const handleCompositionStart = useCallback<CompositionEventHandler<EditableElement>>((event) => {
    isComposingRef.current = true
    composingElementRef.current = event.currentTarget
  }, [])

  const handleCompositionEnd = useCallback<CompositionEventHandler<EditableElement>>((event) => {
    isComposingRef.current = false
    if (composingElementRef.current === event.currentTarget) {
      composingElementRef.current = null
    }
  }, [])

  const isEventComposing = useCallback((event?: { nativeEvent?: Event }) => {
    const nativeEvent = event?.nativeEvent
    const composing = nativeEvent && 'isComposing' in nativeEvent ? nativeEvent.isComposing : false
    return Boolean(composing) || isComposingRef.current
  }, [])

  const commitComposition = useCallback(async () => {
    if (!isComposingRef.current) return

    const targetElement = composingElementRef.current
    const activeElement = document.activeElement
    const element = targetElement ?? (isEditableElement(activeElement) ? activeElement : null)

    const clearCompositionState = () => {
      isComposingRef.current = false
      if (composingElementRef.current === element) {
        composingElementRef.current = null
      }
    }

    if (!element) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 0)
      })
      return
    }

    await new Promise<void>((resolve) => {
      let isResolved = false
      const resolveOnce = () => {
        if (isResolved) return
        isResolved = true
        element.removeEventListener('compositionend', resolveOnce)
        window.clearTimeout(timeoutId)
        resolve()
      }
      const timeoutId = window.setTimeout(resolveOnce, 50)

      element.addEventListener('compositionend', resolveOnce, { once: true })
      element.blur()
    })

    if (isComposingRef.current && document.activeElement !== element) {
      clearCompositionState()
    }
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
    if (isComposingRef.current) return

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
