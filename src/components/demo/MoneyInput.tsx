import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { Input } from '@/components/ui/input'
import { formatNumberBR, parseBRNumber } from '@/lib/taxCalculations'

export interface MoneyInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'prefix'
> {
  value: number | undefined | null
  onChange: (value: number) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void
  decimals?: number
  showZeroAsEmpty?: boolean
  prefix?: React.ReactNode
}

/**
 * MoneyInput: Campo monetário compartilhado blindado para digitação.
 *
 * Características:
 * (1) Mantém buffer de string local enquanto focado (sincroniza no onFocus/onBlur);
 * (2) Aceita estados transitórios ("", "0,", ",", "12,") sem re-mascarar antes do blur;
 * (3) Preserva a posição do cursor (selectionStart/selectionEnd) durante a edição;
 * (4) Propaga o valor numérico parseado via onChange(number) — compatível com o TaxContext.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  {
    value,
    onChange,
    onBlur,
    onFocus,
    decimals = 2,
    showZeroAsEmpty = true,
    className,
    placeholder = '0,00',
    type = 'text',
    inputMode = 'decimal',
    prefix,
    disabled,
    readOnly,
    ...rest
  },
  ref,
) {
  const internalRef = useRef<HTMLInputElement>(null)
  useImperativeHandle(ref, () => internalRef.current as HTMLInputElement)

  const [isFocused, setIsFocused] = useState(false)

  // Formata o valor numérico para exibição quando não focado
  const formatInitial = (val: number | undefined | null): string => {
    if (val === undefined || val === null || (val === 0 && showZeroAsEmpty)) {
      return ''
    }
    return formatNumberBR(val, decimals)
  }

  const [text, setText] = useState<string>(() => formatInitial(value))

  // Sincroniza com valor externo SOMENTE quando NÃO estiver focado
  useEffect(() => {
    if (!isFocused) {
      setText(formatInitial(value))
    }
  }, [value, isFocused, showZeroAsEmpty, decimals])

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    onFocus?.(e)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false)
    const parsed = parseBRNumber(text)
    onChange(parsed)

    if (parsed === 0 && showZeroAsEmpty) {
      setText('')
    } else {
      setText(formatNumberBR(parsed, decimals))
    }

    onBlur?.(e)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly || disabled) return
    const raw = e.target.value
    const cursor = e.target.selectionStart

    setText(raw)
    const num = parseBRNumber(raw)
    onChange(num)

    // Preserva a posição do cursor durante a edição para evitar saltos indesejados
    if (cursor !== null) {
      requestAnimationFrame(() => {
        if (internalRef.current && document.activeElement === internalRef.current) {
          internalRef.current.setSelectionRange(cursor, cursor)
        }
      })
    }
  }

  const inputElement = (
    <Input
      ref={internalRef}
      type={type}
      inputMode={inputMode}
      value={text}
      placeholder={placeholder}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
      {...rest}
    />
  )

  if (prefix) {
    return (
      <div className="relative inline-block w-full">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">
          {prefix}
        </span>
        {inputElement}
      </div>
    )
  }

  return inputElement
})

MoneyInput.displayName = 'MoneyInput'
