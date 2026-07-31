import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
}

export function Pagination({ page, totalPages }: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
      <Button variant="outline" size="icon" disabled={page === 1} aria-label="Previous page">
        <ChevronLeft className="size-4" />
      </Button>
      {pages.map((pageNumber) => (
        <Button
          key={pageNumber}
          variant={pageNumber === page ? "default" : "outline"}
          size="icon"
          aria-label={`Page ${pageNumber}`}
        >
          {pageNumber}
        </Button>
      ))}
      <Button
        variant="outline"
        size="icon"
        disabled={page === totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}
