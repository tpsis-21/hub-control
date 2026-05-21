type PageSectionProps = {
  title?: string;
  description?: string;
  className?: string;
};

/** Título de seção da página (use com ModernHeader no layout — evita segundo h1). */
export function PageSection({ title, description, className = '' }: PageSectionProps) {
  if (!title && !description) return null;
  return (
    <div className={`mb-4 ${className}`.trim()}>
      {title ? <h2 className="heading-2 text-foreground">{title}</h2> : null}
      {description ? (
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      ) : null}
    </div>
  );
}
