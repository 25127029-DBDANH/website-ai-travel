export default function MagneticButton({ children, className }) {
  return <div className={className || 'inline-block'}>{children}</div>;
}
