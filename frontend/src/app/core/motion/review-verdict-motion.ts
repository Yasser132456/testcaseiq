import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { ReviewStatus } from '../models/generated-test.model';

gsap.registerPlugin(Flip);

type Verdict = Extract<ReviewStatus, 'APPROVED' | 'REJECTED'>;

interface ReviewVerdictMotionOptions {
  container: HTMLElement;
  card: HTMLElement | null;
  verdict: Verdict;
  reducedMotion: boolean;
  commit: () => void;
}

export function commitReviewVerdictMotion(options: ReviewVerdictMotionOptions): void {
  const { container, card, verdict, reducedMotion, commit } = options;
  if (reducedMotion || !card) {
    commit();
    return;
  }

  const listItems = Array.from(container.querySelectorAll<HTMLElement>('.review-case-item'));
  const flipState = Flip.getState(listItems);
  const ghost = createVerdictGhost(card, verdict);
  commit();

  requestAnimationFrame(() => {
    Flip.from(flipState, {
      absolute: true,
      duration: 0.32,
      ease: 'power2.inOut',
      prune: true
    });

    if (verdict === 'APPROVED') {
      gsap.timeline({ onComplete: () => ghost.remove() })
        .to(ghost, { borderColor: 'var(--color-green-border)', boxShadow: '0 0 18px var(--color-green-glow)', duration: 0.14 })
        .to(ghost, { scale: 1.015, duration: 0.1, ease: 'power2.out' })
        .to(ghost, { scale: 1, opacity: 0, duration: 0.14, ease: 'power2.in' });
      return;
    }

    gsap.to(ghost, {
      filter: 'grayscale(1)',
      y: 12,
      opacity: 0,
      duration: 0.28,
      ease: 'power2.in',
      onComplete: () => ghost.remove()
    });
  });
}

function createVerdictGhost(card: HTMLElement, verdict: Verdict): HTMLElement {
  const bounds = card.getBoundingClientRect();
  const ghost = card.cloneNode(true) as HTMLElement;
  const pill = ghost.querySelector<HTMLElement>('.review-verdict-pill');
  if (pill) {
    pill.textContent = verdict === 'APPROVED' ? 'Approved' : 'Rejected';
    pill.classList.toggle('is-approved', verdict === 'APPROVED');
    pill.classList.toggle('is-rejected', verdict === 'REJECTED');
  }
  Object.assign(ghost.style, {
    position: 'fixed',
    inset: 'auto',
    left: `${bounds.left}px`,
    top: `${bounds.top}px`,
    width: `${bounds.width}px`,
    height: `${bounds.height}px`,
    margin: '0',
    pointerEvents: 'none',
    zIndex: '1000'
  });
  ghost.setAttribute('aria-hidden', 'true');
  ghost.dataset['verdictGhost'] = verdict.toLowerCase();
  document.body.appendChild(ghost);
  return ghost;
}
