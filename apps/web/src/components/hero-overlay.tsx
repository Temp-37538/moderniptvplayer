export function HeroOverlayV2() {
  return (
    <div className="hidden md:flex absolute inset-0 z-10 flex-col justify-end p-12">
      <div className="max-w-lg">
        <div className="w-px h-16 bg-white/50 mb-6" />
        <h2 className="text-white text-5xl font-extrabold tracking-tighter leading-none mb-4">
          Live TV.
          <br />
          <span className="text-white/40">On demand.</span>
          <br />
          Everywhere.
        </h2>
        <p className="text-white/50 text-base leading-relaxed max-w-sm">
          All your content in one place. Clean, fast, and endlessly
          customizable.
        </p>
        <div className="h-0.5 w-20 bg-white/70 mt-6 rounded-full" />
      </div>
    </div>
  );
}
