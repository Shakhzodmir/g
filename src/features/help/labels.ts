import type { ContactRole } from './model'
import type { HKey } from './strings'

/** String key of the name of each role (screen, copied text and printed sheet all use these). */
export const ROLE_KEY: Record<ContactRole, HKey> = {
  doctor: 'roleDoctor',
  pediatrician: 'rolePediatrician',
  logoped: 'roleLogoped',
  neurologist: 'roleNeurologist',
  ent: 'roleEnt',
  psychologist: 'rolePsychologist',
  centre: 'roleCentre',
  school: 'roleSchool',
  other: 'roleOther',
}
