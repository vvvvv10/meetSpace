import { useEffect, useRef } from 'react';

/**
 * 渐进增强入场动画
 *
 * 内容默认可见；仅当页面挂载且浏览器支持 IntersectionObserver 时，
 * 才给容器内的 .reveal 元素补 .is-visible 触发淡入（见 global.less）。
 * 首次相交后即断开观察，回滚与卸载时清理监听。
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>('.reveal'));
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    targets.forEach((t) => {
      observer.observe(t);
    });
    return () => observer.disconnect();
  }, []);

  return ref;
}
