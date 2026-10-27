import { createTutorialLauncher, TutorialLaunchOptions } from '@boardgamers/protocol/tutorial';
import launchGame, { destroyViewer } from './launch';
import { localizeTutorial } from './localization';
import { mountTutorial } from './tutorial/mount';

const tutorial = createTutorialLauncher(localizeTutorial(mountTutorial));

// A host given only the script URL (BGS's custom viewer URL) never loads the
// stylesheet built beside it, which leaves CSS-coloured controls black and the
// journal unstyled. Read our own URL while this file is executing, then link the
// sibling stylesheet unless the host already did.
const scriptSrc =
    typeof document !== 'undefined' ? (document.currentScript as HTMLScriptElement | null)?.src : undefined;
function ensureStylesheet() {
    // Styles already ship inside the script in the inline-CSS build.
    if (process.env.VUE_APP_INLINE_CSS || !scriptSrc || !/^https?:/.test(scriptSrc)) return;
    const href = new URL('powergrid-viewer.css', scriptSrc).href;
    const loaded = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).some((link) =>
        /powergrid-viewer[^/]*\.css(\?|#|$)/.test(link.href)
    );
    if (loaded) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.append(link);
}

export function launch(selector: string) {
    ensureStylesheet();
    tutorial.destroy();
    return launchGame(selector);
}
export function launchTutorial(selector: string, options: TutorialLaunchOptions) {
    ensureStylesheet();
    destroyViewer();
    return tutorial.launch(selector, options);
}

if (typeof window !== 'undefined') {
    (window as any).powergrid = { launch, launchTutorial };
}

export default launch;
