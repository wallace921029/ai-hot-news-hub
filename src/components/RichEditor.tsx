import { useEffect, useMemo, useRef } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/shadcn'
import { zh } from '@blocknote/core/locales'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/shadcn/style.css'
import { useThemeStore } from '@/stores/theme'
import { useTranslation } from 'react-i18next'
import { api, assetUrl } from '@/services/api'
import { validateImageFile } from '@/lib/image'
import { toast } from 'sonner'

interface RichEditorProps {
  /** 初始 HTML 内容 */
  value: string
  onChange: (html: string, plainText: string) => void
  placeholder?: string
}

function stripHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

export function RichEditor({ value, onChange, placeholder }: RichEditorProps) {
  const { i18n } = useTranslation()
  const { resolvedTheme } = useThemeStore()
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  const loadedRef = useRef(false)

  const dictionary = useMemo(() => {
    if (i18n.language !== 'zh') return undefined
    if (!placeholder) return zh
    return {
      ...zh,
      placeholders: { ...zh.placeholders, default: placeholder },
    }
  }, [i18n.language, placeholder])

  const editor = useCreateBlockNote({
    dictionary,
    uploadFile: async (file: File) => {
      const err = validateImageFile(file)
      if (err) {
        toast.error(err)
        throw new Error(err)
      }
      try {
        const { images } = await api.uploadImages([file])
        // 存缩略图地址，渲染时反推原图并包 <a> 新标签打开
        return assetUrl(images[0].thumbUrl)
      } catch (e) {
        const msg = e instanceof Error ? e.message : '图片上传失败'
        toast.error(msg)
        throw e
      }
    },
  })

  // 挂载时载入初始 HTML（编辑模式回填）
  useEffect(() => {
    if (loadedRef.current || !value) {
      loadedRef.current = true
      return
    }
    loadedRef.current = true
    try {
      const blocks = editor.tryParseHTMLToBlocks(value)
      if (blocks.length > 0) {
        editor.replaceBlocks(editor.document, blocks)
      }
    } catch {
      // 解析失败则保留空文档
    }
  }, [editor, value])

  return (
    <div className="rich-editor-fill rounded-md bg-background overflow-hidden [&_.bn-editor]:px-1">
      <BlockNoteView
        editor={editor}
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
        onChange={() => {
          const html = editor.blocksToHTMLLossy(editor.document)
          onChangeRef.current(html, stripHtml(html))
        }}
      />
    </div>
  )
}
