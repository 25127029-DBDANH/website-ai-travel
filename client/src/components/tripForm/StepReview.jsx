import { Pencil } from 'lucide-react';
import { formatVnd } from '../../lib/format.js';
import { buildSpecialNotes, compactVnd } from '../../lib/tripFormLogic.js';
import { StepHeader } from './controls.jsx';

export default function StepReview({ form, t, lang, headingRef, onEditStep }) {
  const perPersonPerDay = Math.round(
    (Number(form.budget) || 0) / Math.max(1, (form.group_size || 1) * (form.days || 1))
  );

  const groupTags = [
    form.has_children ? t('form.hasChildrenLabel') : null,
    form.has_elderly ? t('form.hasElderlyLabel') : null,
    form.mobility === 'limited' ? t('form.mobilityLimitedLabel') : null
  ].filter(Boolean);

  const hoursLabel =
    form.day_start && form.day_end
      ? `${form.day_start} – ${form.day_end}`
      : t('form.review.flexibleHours');

  const notes = buildSpecialNotes(form.quick_notes, form.custom_notes);
  const constraintDetails = [
    t(`form.option.transport_mode.${form.transport_mode}`),
    form.dietary?.length
      ? form.dietary.map((item) => t(`form.option.dietary.${item}`)).join(', ')
      : null,
    form.avoid_districts?.length
      ? t('form.field.avoid_districts', { value: form.avoid_districts.join(', ') })
      : null,
    form.must_visit?.length
      ? t('form.review.mustVisit', { value: form.must_visit.map((p) => p.name).join(', ') })
      : null,
    notes ? t('form.review.notes', { value: notes }) : null
  ].filter(Boolean);

  const sections = [
    {
      id: 'trip',
      primary: `${t('common.days', { count: form.days })} · ${form.travel_date || t('form.review.flexibleDate')}`,
      secondary: form.start_location
    },
    {
      id: 'group',
      primary: `${t(`form.option.companions.${form.companions}`)} · ${t('form.options.groupCount', {
        count: form.group_size
      })}`,
      secondary: groupTags.join(' · ')
    },
    {
      id: 'budget',
      primary: formatVnd(form.budget, lang),
      secondary: t('form.budgetBreakdown', {
        perPerson: compactVnd(perPersonPerDay, lang),
        total: formatVnd(form.budget, lang),
        count: form.group_size,
        days: form.days
      })
    },
    {
      id: 'style',
      primary: (form.preferences || []).map((pref) => t(`preference.${pref}`)).join(', '),
      secondary: [
        t(`form.option.pace.${form.pace}`),
        hoursLabel,
        form.prefer_indoor ? t('form.review.indoor') : null
      ]
        .filter(Boolean)
        .join(' · ')
    },
    {
      id: 'constraints',
      primary: constraintDetails[0] || t('form.review.none'),
      secondary: constraintDetails.slice(1).join(' · ')
    }
  ];

  return (
    <div className="space-y-4">
      <StepHeader
        headingRef={headingRef}
        title={t('form.step.review.title')}
        hint={t('form.step.review.hint')}
      />

      <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-slate-50/50">
        {sections.map((section) => {
          const stepTitle = t(`form.step.${section.id}.title`);
          return (
            <section
              key={section.id}
              className="flex items-start justify-between gap-3 px-4 py-3.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-500">{stepTitle}</p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">{section.primary}</p>
                {section.secondary && (
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    {section.secondary}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onEditStep(section.id)}
                aria-label={t('form.wizard.editStep', { step: stepTitle })}
                className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-50"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t('form.wizard.edit')}</span>
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}
