interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <section className="flex min-h-72 flex-col justify-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
    </section>
  );
}
