import { Pagination } from "@nebutra/ui/primitives";

const previous = {
  title: "Home",
  href: "#home",
};

const next = {
  title: "Introduction",
  href: "#introduction",
};

export function PaginationDemo() {
  return (
    <div className="w-full max-w-[var(--pagination-demo-width)] [--pagination-demo-width:640px]">
      <Pagination next={next} previous={previous} />
    </div>
  );
}
