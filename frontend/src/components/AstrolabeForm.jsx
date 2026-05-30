import { useState, useCallback, useEffect } from 'react'
import { MapPin, Clock, Calendar, Globe, Sparkles, AlertCircle, ChevronDown } from 'lucide-react'

const COMMON_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST) — UTC+5:30' },
  { value: 'America/New_York', label: 'Eastern Time (ET) — UTC-5/-4' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT) — UTC-8/-7' },
  { value: 'America/Chicago', label: 'Central Time (CT) — UTC-6/-5' },
  { value: 'America/Denver', label: 'Mountain Time (MT) — UTC-7/-6' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT) — UTC+0/+1' },
  { value: 'Europe/Paris', label: 'Central European Time (CET) — UTC+1/+2' },
  { value: 'Europe/Berlin', label: 'Central European Time (CET) — UTC+1/+2' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST) — UTC+9' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST) — UTC+8' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST) — UTC+4' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT) — UTC+8' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AEST) — UTC+10/+11' },
  { value: 'Pacific/Auckland', label: 'New Zealand Time (NZST) — UTC+12/+13' },
  { value: 'America/Sao_Paulo', label: 'Brasilia Time (BRT) — UTC-3' },
  { value: 'Africa/Cairo', label: 'Egypt Standard Time (EET) — UTC+2' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
]

const FIELD_VALIDATORS = {
  date: (v) => {
    if (!v) return 'Birth date is required'
    const d = new Date(v)
    if (isNaN(d.getTime())) return 'Invalid date format'
    if (d > new Date()) return 'Birth date cannot be in the future'
    if (d.getFullYear() < 1900) return 'Birth year must be after 1900'
    return null
  },
  time: (v) => {
    if (!v) return 'Birth time is required'
    if (!/^\d{2}:\d{2}$/.test(v)) return 'Time must be in HH:MM format'
    return null
  },
  latitude: (v) => {
    if (v === '' || v === null || v === undefined) return 'Latitude is required'
    const n = parseFloat(v)
    if (isNaN(n)) return 'Latitude must be a number'
    if (n < -90 || n > 90) return 'Latitude must be between -90° and 90°'
    return null
  },
  longitude: (v) => {
    if (v === '' || v === null || v === undefined) return 'Longitude is required'
    const n = parseFloat(v)
    if (isNaN(n)) return 'Longitude must be a number'
    if (n < -180 || n > 180) return 'Longitude must be between -180° and 180°'
    return null
  },
  timezone: (v) => {
    if (!v) return 'Timezone is required'
    return null
  },
}

function FormField({ id, label, icon: Icon, error, children, hint }) {
  return (
    <div className="space-y-1.5 relative">
      <label htmlFor={id} className="brass-label flex items-center gap-1.5">
        {Icon && <Icon size={10} className="opacity-70" />}
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[10px] font-sans text-white/25 italic pl-1">{hint}</p>
      )}
      {error && (
        <div className="flex items-center gap-1.5 mt-1 animate-fade-in absolute -bottom-4">
          <AlertCircle size={10} className="text-red-400 shrink-0" />
          <p className="text-[10px] font-sans text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}

function OrbitalRing({ size, duration, opacity, className = '' }) {
  return (
    <div
      className={`absolute rounded-full border border-brass-primary ${className}`}
      style={{
        width: size,
        height: size,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        animation: `spin ${duration}s linear infinite`,
        opacity,
      }}
    />
  )
}

export default function AstrolabeForm({ onSubmit, isLoading, threadId, savedProfile }) {
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    latitude: '',
    longitude: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    message: '',
  })

  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [showBirthFields, setShowBirthFields] = useState(true)
  const [detectedTz, setDetectedTz] = useState('')

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    setDetectedTz(detected)
  }, [])

  useEffect(() => {
    if (savedProfile && Object.keys(savedProfile).length > 0) {
      setFormData(prev => ({
        ...prev,
        date: savedProfile.date || prev.date,
        time: savedProfile.time || prev.time,
        latitude: savedProfile.latitude || prev.latitude,
        longitude: savedProfile.longitude || prev.longitude,
        timezone: savedProfile.timezone || prev.timezone,
      }))
    }
  }, [savedProfile])

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (touched[field] && FIELD_VALIDATORS[field]) {
      const err = FIELD_VALIDATORS[field](value)
      setErrors((prev) => ({ ...prev, [field]: err }))
    }
  }, [touched])

  const handleBlur = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    if (FIELD_VALIDATORS[field]) {
      const err = FIELD_VALIDATORS[field](formData[field])
      setErrors((prev) => ({ ...prev, [field]: err }))
    }
  }, [formData])

  const validateAll = useCallback(() => {
    const newErrors = {}
    let hasError = false
    if (showBirthFields) {
      Object.keys(FIELD_VALIDATORS).forEach((field) => {
        const err = FIELD_VALIDATORS[field](formData[field])
        if (err) {
          newErrors[field] = err
          hasError = true
        }
      })
    }
    setErrors(newErrors)
    setTouched(Object.fromEntries(Object.keys(FIELD_VALIDATORS).map((k) => [k, true])))
    return !hasError
  }, [formData, showBirthFields])

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    if (isLoading) return
    if (showBirthFields && !validateAll()) return

    const birthDetails = showBirthFields ? {
      date: formData.date,
      time: formData.time,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      timezone: formData.timezone,
    } : null

    const message = formData.message.trim() ||
      (showBirthFields
        ? `Please read my birth chart. I was born on ${formData.date} at ${formData.time}, at coordinates ${formData.latitude}°, ${formData.longitude}°, timezone ${formData.timezone}.`
        : 'Tell me more about my spiritual journey through the stars.')

    onSubmit({ message, birthDetails, threadId })
    setFormData((prev) => ({ ...prev, message: '' }))
  }, [formData, isLoading, onSubmit, showBirthFields, threadId, validateAll])

  const inputClass = (field) =>
    `engraved-input ${errors[field] ? 'border-red-500/50 focus:border-red-400/70 shadow-[inset_0_0_8px_rgba(239,68,68,0.2)]' : ''}`

  return (
    <div className="relative w-full max-w-md mx-auto skeuomorphic-panel">
      <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen opacity-20">
        <OrbitalRing size={350} duration={45} opacity={0.4} />
        <OrbitalRing size={250} duration={30} opacity={0.3} />
        <OrbitalRing size={150} duration={20} opacity={0.2} />
      </div>

      <div className="panel-content p-6 sm:p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="relative">
            <h2 className="display-text text-xl sm:text-2xl font-bold text-brass-shimmer tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Birth Intake
            </h2>
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-transparent via-[#d4af37] to-transparent opacity-50" />
          </div>
          <button
            type="button"
            onClick={() => setShowBirthFields((p) => !p)}
            className="brass-button-ghost text-[10px]"
          >
            <ChevronDown size={12} className={`transition-transform duration-300 ${showBirthFields ? 'rotate-180' : ''}`} />
            {showBirthFields ? 'Hide' : 'Show Details'}
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {showBirthFields && (
            <div className="space-y-6 mb-8 relative">
              <div className="grid grid-cols-2 gap-4">
                <FormField id="birth-date" label="Date of Birth" icon={Calendar} error={errors.date} hint="YYYY-MM-DD">
                  <input
                    id="birth-date" type="date"
                    className={inputClass('date')}
                    value={formData.date}
                    onChange={(e) => handleChange('date', e.target.value)}
                    onBlur={() => handleBlur('date')}
                    max={new Date().toISOString().split('T')[0]}
                    style={{ colorScheme: 'dark' }}
                  />
                </FormField>
                <FormField id="birth-time" label="Time of Birth" icon={Clock} error={errors.time} hint="24-hour (Local)">
                  <input
                    id="birth-time" type="time"
                    className={inputClass('time')}
                    value={formData.time}
                    onChange={(e) => handleChange('time', e.target.value)}
                    onBlur={() => handleBlur('time')}
                    style={{ colorScheme: 'dark' }}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField id="latitude" label="Latitude" icon={MapPin} error={errors.latitude} hint="Decimals (-90 to 90)">
                  <input
                    id="latitude" type="number" step="0.0001"
                    placeholder="19.0760"
                    className={inputClass('latitude')}
                    value={formData.latitude}
                    onChange={(e) => handleChange('latitude', e.target.value)}
                    onBlur={() => handleBlur('latitude')}
                  />
                </FormField>
                <FormField id="longitude" label="Longitude" icon={Globe} error={errors.longitude} hint="Decimals (-180 to 180)">
                  <input
                    id="longitude" type="number" step="0.0001"
                    placeholder="72.8777"
                    className={inputClass('longitude')}
                    value={formData.longitude}
                    onChange={(e) => handleChange('longitude', e.target.value)}
                    onBlur={() => handleBlur('longitude')}
                  />
                </FormField>
              </div>

              <FormField id="timezone" label="Timezone" icon={Globe} error={errors.timezone} hint={detectedTz && `Auto: ${detectedTz}`}>
                <div className="relative">
                  <select
                    id="timezone"
                    className={`${inputClass('timezone')} appearance-none pr-10`}
                    style={{ backgroundColor: '#100e18', color: '#e8d8c0', colorScheme: 'dark' }}
                    value={formData.timezone}
                    onChange={(e) => handleChange('timezone', e.target.value)}
                    onBlur={() => handleBlur('timezone')}
                  >
                    <option value="" style={{ background: '#0a0a12' }}>— Select Timezone —</option>
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value} style={{ background: '#141424' }}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--brass-primary)] opacity-50 pointer-events-none" />
                </div>
              </FormField>

              <div className="cosmic-divider" />
            </div>
          )}

          <FormField id="user-message" label="Cosmic Inquiry" icon={Sparkles}>
            <textarea
              id="user-message" rows={3}
              placeholder={showBirthFields ? "Add a personal note, or leave blank to cast your chart…" : "Ask about your planetary energies…"}
              className="engraved-input resize-none"
              value={formData.message}
              onChange={(e) => handleChange('message', e.target.value)}
              maxLength={2000}
            />
          </FormField>

          <div className="mt-8 relative">
            <div className="absolute -left-2 -right-2 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brass-primary)] to-transparent opacity-20 -translate-y-4" />
            <button type="submit" disabled={isLoading} className="brass-button w-full py-4 text-[15px]">
              {isLoading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-[var(--void-bg)] border-t-[var(--brass-light)] rounded-full animate-spin" />
                  Aligning Celestial Spheres…
                </>
              ) : (
                <>
                  <Sparkles size={16} className="text-current" />
                  {showBirthFields ? 'Cast My Astrolabe' : 'Seek Wisdom'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="absolute top-2 left-2 brass-rivet" />
      <div className="absolute top-2 right-2 brass-rivet" />
      <div className="absolute bottom-2 left-2 brass-rivet" />
      <div className="absolute bottom-2 right-2 brass-rivet" />
    </div>
  )
}
