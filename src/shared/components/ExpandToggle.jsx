import { Icons } from './Icons'

export default function ExpandToggle({ open, children, detail, className = '', ...buttonProps }) {
  return (
    <button className={`expand-toggle ${className} ${open ? 'is-open' : ''}`.trim()} {...buttonProps}>
      <span>{children}</span>
      {detail && <small>{detail}</small>}
      {Icons.chevronDown}
    </button>
  )
}

