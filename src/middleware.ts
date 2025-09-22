import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  // 解码URL中的中文字符
  const url = new URL(context.request.url);
  
  // 如果URL包含编码的中文字符，进行解码处理
  if (url.pathname.includes('%')) {
    try {
      const decodedPath = decodeURIComponent(url.pathname);
      // 检查解码后的路径是否包含中文字符
      if (/[\u4e00-\u9fff]/.test(decodedPath)) {
        // 更新context中的URL信息，但不重定向
        // 这样可以让Astro正确处理中文路径
        Object.defineProperty(context.url, 'pathname', {
          value: decodedPath,
          writable: true
        });
      }
    } catch (error) {
      // 如果解码失败，继续使用原始路径
      console.warn('URL decode failed:', error);
    }
  }
  
  return next();
});