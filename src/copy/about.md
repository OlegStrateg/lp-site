# About LayerPorter

LayerPorter is a small collection of file converters — PNG, JPG, and PSD between each other, plus a Canva-to-Google-Slides check — built around one rule: the file you drop stays on your device. Each tool does one conversion, does it in the open where you can see what changed, and gets out of your way.

We built it this way because most conversion sites work the opposite way: you upload your file to a server, wait for a queue, and hope nothing sensitive was in that document. For a lot of everyday conversions — a logo, a screenshot, a slide deck — that trade-off doesn't make sense. Your browser can already do the work.

## How client-side conversion works

Every tool on this site runs the actual conversion using your browser's own JavaScript engine, on your own machine. When you drop a file, it's read into memory locally, transformed, and handed back to you as a download — it never travels over the network to reach us. You can check this yourself: open your browser's network tab while converting, and you'll see no request carrying your file's contents. If you disconnect from the internet after the page has loaded, the conversion still works, because it never needed a server in the first place.

This also means we don't see your files, don't store them, and can't recover them if you close the tab before downloading — there's no copy on our end to hand back.

## Contact

Questions, bug reports, or a conversion you'd like to see: [hello@layerporter.com](mailto:hello@layerporter.com)
