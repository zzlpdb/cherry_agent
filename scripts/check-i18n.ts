import * as fs from 'fs'
import * as path from 'path'

const translationsDir = path.join(__dirname, '../src/renderer/src/i18n/locales')
const baseLocale = 'zh-CN'
const baseFileName = `${baseLocale}.json`
const baseFilePath = path.join(translationsDir, baseFileName)

/**
 * 递归同步 target 对象，使其与 template 对象保持一致
 * 1. 如果 template 中存在 target 中缺少的 key，则添加（'[to be translated]'）
 * 2. 如果 target 中存在 template 中不存在的 key，则删除
 * 3. 对于子对象，递归同步
 *
 * @param target 目标对象（需要更新的语言对象）
 * @param template 主模板对象（中文）
 * @returns 返回是否对 target 进行了更新
 */
function syncRecursively(target: any, template: any): boolean {
  let isUpdated = false

  // 添加 template 中存在但 target 中缺少的 key
  for (const key in template) {
    if (!(key in target)) {
      target[key] =
        typeof template[key] === 'object' && template[key] !== null ? {} : `[to be translated]:${template[key]}`
      console.log(`添加新属性：${key}`)
      isUpdated = true
    }
    if (typeof template[key] === 'object' && template[key] !== null) {
      if (typeof target[key] !== 'object' || target[key] === null) {
        target[key] = {}
        isUpdated = true
      }
      // 递归同步子对象
      const childUpdated = syncRecursively(target[key], template[key])
      if (childUpdated) {
        isUpdated = true
      }
    }
  }

  // 删除 target 中存在但 template 中没有的 key
  for (const targetKey in target) {
    if (!(targetKey in template)) {
      console.log(`移除多余属性：${targetKey}`)
      delete target[targetKey]
      isUpdated = true
    }
  }

  return isUpdated
}

function syncTranslations() {
  if (!fs.existsSync(baseFilePath)) {
    console.error(`主模板文件 ${baseFileName} 不存在，请检查路径或文件名`)
    return
  }

  const baseContent = fs.readFileSync(baseFilePath, 'utf-8')
  let baseJson: Record<string, any> = {}
  try {
    baseJson = JSON.parse(baseContent)
  } catch (error) {
    console.error(`解析 ${baseFileName} 出错:`, error)
    return
  }

  const files = fs.readdirSync(translationsDir).filter((file) => file.endsWith('.json') && file !== baseFileName)

  for (const file of files) {
    const filePath = path.join(translationsDir, file)
    let targetJson: Record<string, any> = {}
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      targetJson = JSON.parse(fileContent)
    } catch (error) {
      console.error(`解析 ${file} 出错，跳过此文件。错误信息:`, error)
      continue
    }

    const isUpdated = syncRecursively(targetJson, baseJson)

    if (isUpdated) {
      try {
        fs.writeFileSync(filePath, JSON.stringify(targetJson, null, 2) + '\n', 'utf-8')
        console.log(`文件 ${file} 已更新同步主模板的内容`)
      } catch (error) {
        console.error(`写入 ${file} 出错:`, error)
      }
    } else {
      console.log(`文件 ${file} 无需更新`)
    }
  }
}

syncTranslations()
