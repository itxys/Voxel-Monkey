
export type Vector3 = [number, number, number];

export interface Voxel {
  position: Vector3;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  timestamp: number;
  voxels: Voxel[];
  gridSize: number;
  gridDensity: number;
  currentColor: string;
}

export type ToolType = 'PENCIL' | 'ERASER' | 'PAINT' | 'PICKER' | 'DUPLICATE';

export enum Language {
  EN = 'en',
  CN = 'cn'
}

export type ViewType = 'EDITOR' | 'GALLERY';

export interface TranslationSchema {
  title: string;
  tools: {
    pencil: string;
    eraser: string;
    paint: string;
    picker: string;
    duplicate: string;
    clear: string;
    ai_assist: string;
  };
  ui: {
    export: string;
    save: string;
    load: string;
    undo: string;
    redo: string;
    colors: string;
    gridSize: string;
    gridDensity: string;
    language: string;
    ai_prompt_placeholder: string;
    ai_button: string;
    ai_append: string;
    ai_replace: string;
    ai_discard: string;
    ai_preview_title: string;
    ai_preview_color: string;
    outlines: string;
    library: string;
    back_to_editor: string;
    new_project: string;
    delete: string;
    confirm_delete: string;
    no_projects: string;
    project_name: string;
    save_success: string;
    voxels_count: string;
    last_modified: string;
  };
}
