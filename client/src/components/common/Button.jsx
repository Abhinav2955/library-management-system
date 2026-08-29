const base =
  'inline-flex items-center justify-center rounded-card px-4 py-2 text-sm font-medium ' +
  'transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const variants = {
  primary: 'bg-ink text-paper hover:bg-ink/90',
  secondary: 'border border-hairline bg-white text-ink hover:bg-paper',
  brass: 'bg-brass text-white hover:bg-brass-dark',
};

export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}