import '../tailwind.css';

/**
 * 渐进增强标记
 *
 * 只有在 JS 可用且支持 IntersectionObserver 时才给 <html> 加 .js，
 * global.less 中的入场动画隐藏态都限定在 .js 下，
 * 保证无 JS / 无 IO 环境下内容默认可见。
 */
if (typeof document !== 'undefined' && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('js');
}
