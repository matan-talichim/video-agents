import { continueRender, delayRender } from 'remotion';

export const loadFonts = async () => {
  const waitForFonts = delayRender();

  const heebo = new FontFace('Heebo', `url('https://fonts.gstatic.com/s/heebo/v22/NGS6v5_NC0k9P9H0TbFhsqMA.woff2')`);

  try {
    await heebo.load();
    document.fonts.add(heebo);
  } catch (err) {
    console.error('Font loading failed:', err);
  }

  continueRender(waitForFonts);
};
