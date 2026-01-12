
import { Language, TranslationSchema } from './types';

export const translations: Record<Language, TranslationSchema> = {
  [Language.EN]: {
    title: 'VOXEL MONKEY',
    tools: {
      pencil: 'DRAW',
      eraser: 'ERASE',
      paint: 'PAINT',
      picker: 'PICK',
      duplicate: 'CLONE',
      clear: 'WIPE',
      ai_assist: 'AI ASSIST'
    },
    ui: {
      export: 'EXPORT',
      save: 'STORE',
      load: 'RECALL',
      undo: 'UNDO',
      redo: 'REDO',
      colors: 'SPECTRUM',
      gridSize: 'DIMENSION',
      gridDensity: 'GRID DENSITY',
      language: 'LANG',
      ai_prompt_placeholder: 'Describe a scene...',
      ai_button: 'PROCESS',
      ai_append: 'APPEND',
      ai_replace: 'REWRITE',
      ai_discard: 'DISCARD',
      ai_preview_title: 'PREVIEW READY',
      ai_preview_color: 'OVERRIDE COLOR',
      outlines: 'OUTLINES',
      library: 'LIBRARY',
      back_to_editor: 'BACK TO STATION',
      new_project: 'INIT NEW TAPE',
      delete: 'PURGE',
      confirm_delete: 'Confirm data purge?',
      no_projects: 'NO DATA TAPES FOUND.',
      project_name: 'ENTRY NAME',
      save_success: 'DATA STORED SUCCESSFULLY.',
      voxels_count: 'BLOCKS',
      last_modified: 'MODIFIED'
    }
  },
  [Language.CN]: {
    title: '体素猴',
    tools: {
      pencil: '绘制',
      eraser: '擦除',
      paint: '上色',
      picker: '吸色',
      duplicate: '克隆',
      clear: '清空',
      ai_assist: 'AI 辅助'
    },
    ui: {
      export: '导出',
      save: '储存',
      load: '读取',
      undo: '撤销',
      redo: '重做',
      colors: '色谱',
      gridSize: '尺寸',
      gridDensity: '网格密度',
      language: '语言',
      ai_prompt_placeholder: '描述一个场景...',
      ai_button: '处理',
      ai_append: '追加',
      ai_replace: '替换',
      ai_discard: '丢弃',
      ai_preview_title: '预览就绪',
      ai_preview_color: '覆写颜色',
      outlines: '轮廓',
      library: '作品库',
      back_to_editor: '返回工作站',
      new_project: '初始化新磁带',
      delete: '清除',
      confirm_delete: '确认清除数据？',
      no_projects: '未发现数据存档。',
      project_name: '存档名称',
      save_success: '数据已成功存入磁带。',
      voxels_count: '方块数',
      last_modified: '修改日期'
    }
  }
};
