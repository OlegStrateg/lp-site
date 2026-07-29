---
key: "what-is-a-psd-file"
section: "formats"
slug: "psd"
title: "What Is a PSD File? Layers, Compatibility, and Free Ways to Open One | LayerPorter"
description: "A PSD file is Adobe Photoshop's native format — it stores an image as separate, editable layers instead of one flat picture. Here's what that means and how to open one for free."
h1: "What Is a PSD File?"
answerFirst: "A PSD (Photoshop Document) is Adobe Photoshop's native file format. Instead of one flat image, it stores a design as separate layers — background, text, shapes, adjustments — that you can move, hide, or edit independently. You don't need Photoshop to open one: GIMP, Photopea, and Krita all read PSD files for free, with some limits on the most Photoshop-specific features."
faq:
  - q: "Can I open a PSD file without Photoshop?"
    a: "Yes. Photopea (browser-based) and GIMP (desktop) both open PSD files for free and read most layers correctly. Krita can too, but Adobe-specific features like smart objects and some blending modes may break if you round-trip the file."
  - q: "Is a PSD the same as a PNG or JPG?"
    a: "No. PNG and JPG store one flat image with no layers. A PSD stores the editable structure behind a design — layers, masks, text — which is why PSDs are usually much larger files than an exported PNG of the same image."
  - q: "Why does my PSD look different in GIMP than in Photoshop?"
    a: "GIMP reads layers and blending modes but doesn't fully support Photoshop-only features like smart objects and some adjustment layers — those often get flattened or approximated. Simple layered files usually look identical; heavily-styled ones may shift."
  - q: "Can a PSD contain a photo instead of a design?"
    a: "Yes. Wrapping a plain photo in PSD format doesn't add layers that weren't there — it just gives the photo a container built for non-destructive editing, so you can add adjustments on top without touching the original pixels."
---

## A PSD stores layers, not just pixels

Open a JPG and you get one flat picture — every pixel already baked together. Open a PSD and you get the same image broken into pieces: a background layer, a text layer, a logo layer, maybe an adjustment layer sitting on top of everything else. Each one can be hidden, moved, or edited on its own, which is the entire reason the format exists. PSD stands for Photoshop Document, and it's been Adobe's native save format since the first version of Photoshop in 1990 — everything about the format is built around keeping a design editable, not around keeping the file small.

That difference explains file size. A PNG or JPG of a poster might be a few megabytes. The PSD behind it — same visual result, but with every layer, mask, and effect still separate — can run into the hundreds of megabytes. You're not paying for better image quality; you're paying for the ability to still move that headline six months later.

## What "layers" actually cover

A layer in a PSD can be a lot of things: a flat pixel layer (part of an image), a text layer (still editable as text, not rasterized), a shape layer (a vector rectangle or path), an adjustment layer (a brightness or color change applied non-destructively), or a smart object (an embedded file, like a linked image, that updates if you edit the source). Masks attach to any of these to hide part of a layer without deleting anything. None of this exists in a flat PNG or JPG — those formats only know how to store the final, composited result. If you've ever wondered why converting an image into PSD doesn't magically give you back separate design elements, this is why: [a flat image never had that structure to begin with](/guides/flat-image-vs-editable-layers/).

## Opening a PSD without Photoshop

You don't need an Adobe subscription to open one:

- **[Photopea](https://www.photopea.com/)** runs entirely in the browser and reads PSD layers, masks, smart objects, and blending modes — close to a full Photoshop-alternative for free.
- **[GIMP](https://www.gimp.org/)** is a free desktop editor with built-in PSD support. It handles ordinary layers and blending modes well, but Photoshop-specific extras — some layer styles, non-destructive adjustment layers — can get rasterized or simplified on import.
- **[Krita](https://krita.org/)** can also load and save PSD, including layer groups and text layers. [Its own documentation](https://docs.krita.org/en/general_concepts/file_formats/file_psd.html) is upfront that it discards anything it doesn't recognize — paths, vector masks, some adjustment layers — and that smart objects can break if you open a PSD and re-save it. Krita's own manual recommends a different format (ORA or TIFF) when PSD isn't required.

The pattern across all three: simple, mostly-flat PSDs open close to perfectly anywhere. Heavily Photoshop-specific files — nested smart objects, exotic blend modes, live adjustment stacks — are where free tools start to diverge from what Photoshop itself would show.

## When you actually need a PSD

If you're just moving an image around the web, you don't. A PNG or JPG is smaller, opens everywhere, and does the job. You need a PSD specifically when someone downstream — a designer, a print shop, a future version of you — needs to change something without starting over: swap the headline, recolor a shape, hide a layer for a different version of the same poster. Our [PNG to PSD](/convert/png-to-psd/) and [JPG to PSD](/convert/jpg-to-psd/) converters wrap a flat image into that container so it opens in Photoshop, GIMP, or Photopea; going the other way, [PSD to PNG](/convert/psd-to-png/) and [PSD to JPG](/convert/psd-to-jpg/) flatten a layered file back down for anywhere that just needs the finished picture.
