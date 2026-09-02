export function SearchBar({
  placeholder = "告诉观澜，你想拍什么",
  defaultValue,
}: {
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <form className="search-pill" action="/create" method="get">
      <span className="search-glyph" aria-hidden />
      <input
        data-allow-native
        type="text"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label="告诉观澜"
        autoComplete="off"
      />
      <span className="search-spark" aria-hidden />
    </form>
  );
}
