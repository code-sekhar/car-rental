export default function Loading() {
  return (
    <main
      id="main-content"
      className="container section"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="skeleton skeleton-title" />
      <div className="car-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" />
        ))}
      </div>
    </main>
  );
}
