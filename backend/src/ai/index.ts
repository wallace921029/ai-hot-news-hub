// AI 模块 - 预留接口
// 未来可实现：话题搜索、内容摘要等功能

export async function processAllPending() {
  console.log('ℹ️ AI 分类功能已禁用')
  return { processed: 0, failed: 0, total: 0 }
}

export async function processNewsItemById(_id: number) {
  throw new Error('AI 分类功能已禁用')
}

export async function processBatchByIds(_ids: number[]) {
  throw new Error('AI 分类功能已禁用')
}
