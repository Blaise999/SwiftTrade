Drop your motion assets here (animated WebP):

  news-ambient.webp    960x420, 20fps, 4-6s seamless loop, <=120KB
                       -> ambient drift behind the news section

  shield-pulse.webp    400x400, 3s loop, <=90KB
                       -> shield forming/pulsing, right side of Shield section

  hero-ambient.webp    960x420, 20fps, <=120KB   (optional)
                       -> behind the hero headline

Convert:
  ffmpeg -i in.mp4 -vcodec libwebp -filter:v fps=20 -loop 0 -q:v 60 out.webp

All slots already respect prefers-reduced-motion and degrade to a clean
static background if the file is absent.

  bento-ambient.webp   960x420, 20fps, <=120KB
                       -> behind the bento feature grid

  shield-deep.webp     960x420, 20fps, <=120KB  -> behind "The case for Shield"
  bridge-deep.webp     960x420, 20fps, <=120KB  -> behind "The case for SwiftBridge"
