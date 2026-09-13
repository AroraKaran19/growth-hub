"use client";

import Lightbox from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

type GalleryLightboxProps = {
  images: string[];
  /** -1 when closed, otherwise the slide to open on */
  index: number;
  onClose: () => void;
};

const GalleryLightbox = ({ images, index, onClose }: GalleryLightboxProps) => {
  return (
    <Lightbox
      open={index >= 0}
      close={onClose}
      index={Math.max(index, 0)}
      slides={images.map((src) => ({ src }))}
      plugins={[Zoom, Thumbnails, Counter, Fullscreen, Slideshow]}
      carousel={{ finite: false }}
      thumbnails={{ width: 96, height: 64, borderRadius: 8 }}
      zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
      styles={{ container: { backgroundColor: "rgba(0, 0, 0, .92)" } }}
    />
  );
};

export default GalleryLightbox;
