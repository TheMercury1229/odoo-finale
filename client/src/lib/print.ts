/**
 * Utility function for printing documents and financial reports across the application.
 * Injects and applies the universal print stylesheet to normalize ANY page to a safe,
 * consistent, black-on-white printable output regardless of theme, dark mode, or visual chrome.
 */
export function triggerPrint(options?: {
  title?: string;
  targetSelector?: string;
}) {
  if (typeof window === "undefined") return;

  const styleId = "universal-print-stylesheet";
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    styleEl.textContent = `
      @media print {
        /* 1. Page setup — consistent margins on every print job */
        @page {
          size: A4;
          margin: 1.5cm;
        }

        /* 2. Force EVERYTHING to plain black text on white background.
           This overrides dark mode, theme colors, Tailwind text-*/bg-*
           utility classes, CSS variables from shadcn's theme, etc.
           Using !important + universal selector is intentional here —
           the whole point is "no matter what page it is." */
        *,
        *::before,
        *::after {
          background: #ffffff !important;
          background-color: #ffffff !important;
          background-image: none !important;
          color: #000000 !important;
          box-shadow: none !important;
          text-shadow: none !important;
          -webkit-print-color-adjust: economy !important;
          print-color-adjust: economy !important;
        }

        /* 3. Normalize typography to one safe, universally-available
           print font stack — overrides any custom web fonts, Tailwind
           font utility classes, or theme font-family variables */
        html, body {
          font-family: Arial, Helvetica, "Segoe UI", sans-serif !important;
          font-size: 11pt !important;
          line-height: 1.5 !important;
          color: #000000 !important;
          background: #ffffff !important;
          width: 100% !important;
          max-width: 100% !important;
        }

        /* 4. Reset borders to a single safe, always-visible style —
           overrides colored borders, gradient borders, or borderless
           dark-mode-only designs that would vanish on white paper */
        * {
          border-color: #000000 !important;
        }

        /* 5. Strip visual chrome that only makes sense on screen:
           shadows, rounded corners exaggerating card look, transitions,
           animations, hover states (irrelevant in print but harmless to
           kill), backdrop blur, etc. */
        * {
          border-radius: 0 !important;
          transition: none !important;
          animation: none !important;
          backdrop-filter: none !important;
          filter: none !important;
        }

        /* 6. Hide app chrome that should never appear on a printed page:
           nav, sidebar, header controls, buttons, dialogs, toasts, mode
           toggles, etc. */
        nav,
        aside,
        header,
        footer,
        .sidebar,
        [data-sidebar],
        button,
        .no-print,
        .print\\:hidden,
        [role="dialog"],
        [role="alertdialog"],
        [data-radix-toast-viewport],
        .breadcrumb,
        [data-slot="sidebar"],
        [data-slot="sidebar-trigger"] {
          display: none !important;
        }

        /* Explicit opt-in class for anything a page WANTS visible only
           in print (e.g. a "Printed on {date}" footer) */
        .print-only {
          display: block !important;
        }

        /* 7. Tables — the most common print-formatting failure point.
           Force clean, consistent borders and prevent awkward row splits
           across page breaks regardless of the table library/component
           used on screen. */
        table {
          width: 100% !important;
          border-collapse: collapse !important;
          font-size: 10pt !important;
        }
        table, th, td {
          border: 1px solid #000000 !important;
        }
        th, td {
          padding: 6px 8px !important;
          text-align: left !important;
        }
        tr {
          page-break-inside: avoid !important;
        }
        thead {
          display: table-header-group !important; /* repeat header on each page */
        }

        /* 8. Images — never let a huge screen-sized image blow past the
           page width regardless of its inline width/height attributes */
        img, svg {
          max-width: 100% !important;
          height: auto !important;
        }

        /* 9. Links — show the URL inline since clicking isn't possible
           on paper (optional but standard practice) */
        a[href]::after {
          content: " (" attr(href) ")";
          font-size: 9pt;
          color: #000000 !important;
        }
        a {
          text-decoration: none !important;
          color: #000000 !important;
        }

        /* 10. Prevent awkward mid-element page breaks on key content blocks */
        .card,
        section,
        [data-slot="card"],
        [data-sidebar="inset"] {
          page-break-inside: avoid !important;
        }
        h1, h2, h3, h4 {
          page-break-after: avoid !important;
        }
      }
    `;
    document.head.appendChild(styleEl);
  }

  // Temporarily set document title for clean default PDF file name
  const originalTitle = document.title;
  if (options?.title) {
    document.title = options.title;
  }

  window.print();

  if (options?.title) {
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  }
}
