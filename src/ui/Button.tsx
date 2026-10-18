import type { ReactNode } from 'react'
import styles from './Button.module.css'
import { Pressable, type PressableProps } from './Pressable'

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'warm'
export type ButtonSize = 'md' | 'lg' | 'xl'

export interface ButtonProps extends Omit<PressableProps, 'label' | 'children'> {
  children: ReactNode
  /** Accessible name; defaults to the text content when children is a string. */
  label?: string
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconOnly?: boolean
  block?: boolean
}

export function Button({ children, label, variant = 'primary', size = 'md', icon, iconOnly, block, className, ...rest }: ButtonProps) {
  const name = label ?? (typeof children === 'string' ? children : '')
  return (
    <Pressable
      {...rest}
      label={name}
      className={[styles.btn, styles[variant], styles[size], iconOnly && styles.iconOnly, block && styles.block, className]
        .filter(Boolean)
        .join(' ')}
    >
      {icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
      {iconOnly ? <span className="visually-hidden">{children}</span> : <span className={styles.text}>{children}</span>}
    </Pressable>
  )
}
