import { createTacticalMastery, CurriculumPort, TacticalMasteryApi } from './mastery';

export function createApi(C: {
  skills: CurriculumPort['skills'];
  byId: CurriculumPort['byId'];
  stepSkills(step: number): CurriculumPort['skills'];
}): TacticalMasteryApi {
  return createTacticalMastery({
    skills: C.skills,
    byId: C.byId,
    stepSkills: (step) => C.stepSkills(step),
  });
}
