/** Leerdoel from the Stappenmethode-aligned curriculum (app design, not a diploma). */
export interface Skill {
  id: string;
  step: number;
  label: { nl: string; en: string };
  ply: number;
  prerequisites: string[];
  tags: string[];
  required: boolean;
  source: string;
  outline: boolean;
  prerequisiteSource: string;
}

export interface CurriculumData {
  skills: Skill[];
  sources: Record<string, string>;
}
