/**
 * Startup splash screen shown while the app loads the library/settings data.
 * Fades out once `visible` becomes false.
 */
export function SplashScreen({ visible }: { visible: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-dark-950 transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <img
        src="/app_logo.png"
        alt="AniLocal Player"
        draggable={false}
        className="w-24 h-24 object-contain select-none animate-pulse"
      />
      <h1 className="mt-4 text-xl font-semibold text-white tracking-wide">AniLocal Player</h1>
    </div>
  )
}
