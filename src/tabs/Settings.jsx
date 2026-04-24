import { useState } from 'react'
import SettingsGeneral from '../components/settings/SettingsGeneral'
import SettingsHabits from '../components/settings/SettingsHabits'
import SettingsRoutines from '../components/settings/SettingsRoutines'
import SettingsExercises from '../components/settings/SettingsExercises'

const SECTIONS = [
  { id: 'general',   label: 'General' },
  { id: 'habits',    label: 'Habits' },
  { id: 'routines',  label: 'Routines' },
  { id: 'exercises', label: 'Exercises' },
]

export default function Settings(props) {
  const [section, setSection] = useState('general')

  return (
    <>
      <div className="settings-h">Settings</div>

      <div className="settings-subnav">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            className={section === s.id ? 'active' : ''}
            onClick={() => setSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'general'   && <SettingsGeneral {...props} />}
      {section === 'habits'    && <SettingsHabits {...props} />}
      {section === 'routines'  && <SettingsRoutines {...props} />}
      {section === 'exercises' && <SettingsExercises {...props} />}
    </>
  )
}
