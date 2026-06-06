export function openHtmlDocument(html: string, options: { print?: boolean; windowName?: string } = {}) {
  const documentWindow = window.open("", options.windowName || "_blank", "width=980,height=1200");
  if (!documentWindow) return false;

  documentWindow.document.open();
  documentWindow.document.write(html);
  documentWindow.document.close();

  const focusWindow = () => documentWindow.focus();
  if (!options.print) {
    focusWindow();
    return true;
  }

  let printed = false;
  const printOnce = () => {
    if (printed) return;
    printed = true;
    documentWindow.focus();
    documentWindow.print();
  };

  const images = Array.from(documentWindow.document.images);
  if (!images.length) {
    window.setTimeout(printOnce, 250);
    return true;
  }

  let remaining = images.length;
  const done = () => {
    remaining -= 1;
    if (remaining <= 0) window.setTimeout(printOnce, 200);
  };

  for (const image of images) {
    if (image.complete) {
      done();
    } else {
      image.addEventListener("load", done, { once: true });
      image.addEventListener("error", done, { once: true });
    }
  }

  window.setTimeout(printOnce, 1800);
  return true;
}

export function downloadHtmlDocument(html: string, fileName: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
