const SCROLL_ROOT_SELECTOR = "[data-app-scroll-root]";

function scrollRootsToTop(behavior: ScrollBehavior) {
  window.scrollTo({ top: 0, left: 0, behavior });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  document.querySelectorAll(SCROLL_ROOT_SELECTOR).forEach((node) => {
    const el = node as HTMLElement;
    el.scrollTop = 0;
    el.scrollLeft = 0;
  });
}

export function resetAppScroll(behavior: ScrollBehavior = "auto") {
  scrollRootsToTop(behavior);
  requestAnimationFrame(() => scrollRootsToTop(behavior));
}