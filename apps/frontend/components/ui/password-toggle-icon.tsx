export function PasswordToggleIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {visible ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58" />
          <path d="M9.88 4.24A10.3 10.3 0 0 1 12 4c6.5 0 10 8 10 8a18.6 18.6 0 0 1-3.06 4.3" />
          <path d="M6.1 6.1C3.47 7.86 2 12 2 12s3.5 8 10 8a9.9 9.9 0 0 0 5.9-2.1" />
          <path d="m3 3 18 18" />
        </>
      )}
    </svg>
  );
}
