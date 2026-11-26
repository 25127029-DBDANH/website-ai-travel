import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { DEMO } from '../demo.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { api } from '../lib/api.js';
import { translateApiError } from '../lib/errors.js';
import { formatVnd } from '../lib/format.js';
import { parseTripSentence } from '../lib/sentenceParser.js';
import {
  applyParsedToForm, buildAiRequest, buildTripCreatePayload, canUseLocalItineraryFallback,
  defaultTripForm, describeFilledFields, makeFallbackConcept, missingParsedLabels, validateTripForm
} from '../lib/tripFormLogic.js';
import { hasParsedTripContent } from '../lib/tripOptions.js';
import {
  autoAdjustments, clearSessionDraft, findStepForErrors, firstIncompleteStep,
  focusFirstErrorField, readSessionDraft, stepIndexOf, stepStatus, validateStep,
  WIZARD_STEPS, writeSessionDraft
} from '../lib/tripWizardLogic.js';
import ConceptDialog from './tripForm/ConceptDialog.jsx';
import { WizardBanners, WizardFooter } from './tripForm/controls.jsx';
import StepBudget from './tripForm/StepBudget.jsx';
import StepConstraints from './tripForm/StepConstraints.jsx';
import StepGroup from './tripForm/StepGroup.jsx';
import StepReview from './tripForm/StepReview.jsx';
import StepStyle from './tripForm/StepStyle.jsx';
import StepTrip from './tripForm/StepTrip.jsx';
import WizardProgress from './tripForm/WizardProgress.jsx';

export default function TripForm() {
  const { lang, t } = useI18n();
  const { loading } = useAuth();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  const [initialDraft] = useState(() => readSessionDraft(t('form.startDefault')));
  const [form, setForm] = useState(() => initialDraft?.form || defaultTripForm(t('form.startDefault')));
  const [step, setStep] = useState(() => initialDraft?.step || WIZARD_STEPS[0].id);
  const [maxStepIndex, setMaxStepIndex] = useState(() => (initialDraft?.step ? stepIndexOf(initialDraft.step) : 0));
  const [sentence, setSentence] = useState(() => initialDraft?.sentence || '');
  const [budgetDraft, setBudgetDraft] = useState(null);
  const [quickFillError, setQuickFillError] = useState('');
  const [lastParse, setLastParse] = useState(null);
  const [highlighted, setHighlighted] = useState(() => new Set());
  const [parseSummary, setParseSummary] = useState(null);
  const [notices, setNotices] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState('');
  const [concept, setConcept] = useState(null);
  const [pendingTrip, setPendingTrip] = useState(null);

  const defaultStartRef = useRef(t('form.startDefault'));
  const sentenceRef = useRef(null);
  const stepHeadingRef = useRef(null);
  const didMountRef = useRef(false);

  useEffect(() => {
    const previousDefault = defaultStartRef.current;
    const nextDefault = t('form.startDefault');
    setForm((cur) => (cur.start_location === previousDefault ? { ...cur, start_location: nextDefault } : cur));
    defaultStartRef.current = nextDefault;
  }, [t]);

  useEffect(() => {
    const timer = setTimeout(() => writeSessionDraft({ form, step, sentence }), 400);
    return () => clearTimeout(timer);
  }, [form, step, sentence]);

  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    requestAnimationFrame(() => stepHeadingRef.current?.focus({ preventScroll: true }));
  }, [step]);

  const update = (patch) => {
    const keys = Object.keys(patch);
    const adjusted = autoAdjustments(form, { ...form, ...patch });
    setForm(adjusted.form);
    if (adjusted.notices.length > 0) setNotices(adjusted.notices);

    setHighlighted((cur) => {
      if (!keys.some((k) => cur.has(k))) return cur;
      const next = new Set(cur);
      keys.forEach((k) => next.delete(k));
      return next;
    });
    setFieldErrors((cur) => {
      const clearTime = keys.includes('day_start') || keys.includes('day_end');
      const clearNotes = keys.includes('custom_notes') || keys.includes('quick_notes');
      if (!keys.some((k) => k in cur) && !clearTime && !clearNotes) return cur;
      const next = { ...cur };
      keys.forEach((k) => delete next[k]);
      if (clearTime) { delete next.day_start; delete next.day_end; }
      if (clearNotes) delete next.special_notes;
      return next;
    });
    if (formError) setFormError('');
  };

  const goToStep = (nextStepId) => {
    setFieldErrors({});
    setFormError('');
    setStep(nextStepId);
    setMaxStepIndex((cur) => Math.max(cur, stepIndexOf(nextStepId)));
  };

  const handleQuickFill = (inputSentence = sentence) => {
    setQuickFillError('');
    setFormError('');
    const text = String(inputSentence || '').trim();
    if (text.length < 6) {
      setQuickFillError(t('form.sentence.tooShort'));
      requestAnimationFrame(() => sentenceRef.current?.focus());
      return;
    }
    const parsed = parseTripSentence(text);
    if (!hasParsedTripContent(parsed)) {
      setQuickFillError(t('form.sentence.parsedNone'));
      requestAnimationFrame(() => sentenceRef.current?.focus());
      return;
    }
    const applied = applyParsedToForm(form, parsed, lastParse);
    const adjusted = autoAdjustments(form, applied.form);
    setForm(adjusted.form);
    setLastParse(applied.parse);
    setBudgetDraft(null);
    setHighlighted(new Set(applied.parse.keys));
    setNotices(adjusted.notices);
    setParseSummary({
      count: applied.parse.keys.length,
      badges: describeFilledFields(applied.parse.keys, adjusted.form, t, formatVnd, lang),
      missing: missingParsedLabels(parsed, t)
    });
    goToStep(firstIncompleteStep(adjusted.form, parsed));
  };

  const currentIndex = stepIndexOf(step);

  const validateAndJump = (stepToCheck, targetId) => {
    const errors = validateStep(stepToCheck, form, { budgetDraft });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      focusFirstErrorField(errors);
      return;
    }
    setNotices([]);
    goToStep(targetId);
  };

  const handleNext = () => {
    const nextStep = WIZARD_STEPS[currentIndex + 1];
    if (nextStep) validateAndJump(step, nextStep.id);
  };

  const handleBack = () => {
    const prevStep = WIZARD_STEPS[currentIndex - 1];
    if (prevStep) { setNotices([]); goToStep(prevStep.id); }
  };

  const handleSelectStep = (targetId) => {
    const targetIndex = stepIndexOf(targetId);
    if (targetIndex > maxStepIndex || targetId === step) return;
    if (targetIndex > currentIndex) { validateAndJump(step, targetId); return; }
    setNotices([]);
    goToStep(targetId);
  };

  const handleReset = () => {
    clearSessionDraft();
    setForm(defaultTripForm(t('form.startDefault')));
    setStep(WIZARD_STEPS[0].id);
    setMaxStepIndex(0);
    setSentence('');
    setBudgetDraft(null);
    setQuickFillError('');
    setLastParse(null);
    setHighlighted(new Set());
    setParseSummary(null);
    setNotices([]);
    setFieldErrors({});
    setFormError('');
  };

  const handleFormKeyDown = (event) => {
    if (event.key !== 'Enter' || step === 'review') return;
    const target = event.target;
    if (target?.tagName?.toLowerCase() !== 'input' || target.dataset?.skipEnter === 'true') return;
    event.preventDefault();
    handleNext();
  };

  const formatRequestError = (requestError) => {
    const code = requestError?.code;
    if (code && (code === 'NETWORK_ERROR' || t(`error.${code}`) !== `error.${code}`)) {
      return translateApiError(t, requestError);
    }
    return requestError?.message || translateApiError(t, requestError);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (step !== 'review') { handleNext(); return; }
    setFormError('');
    setQuickFillError('');

    const validation = validateTripForm(form, budgetDraft);
    if (!validation.valid) {
      const errStep = findStepForErrors(validation.errors);
      if (errStep && errStep !== step) setStep(errStep);
      setFieldErrors(validation.errors);
      focusFirstErrorField(validation.errors);
      return;
    }
    setFieldErrors({});

    if (loading) return;

    setSubmitting(true);
    if (DEMO) { clearSessionDraft(); navigate('/trip/demo'); return; }

    const tripRequest = buildAiRequest(form);
    try {
      setPendingTrip(tripRequest);
      setSubmissionStage('concept');
      const suggestedConcept = await api.suggestTripConcept(tripRequest);
      setConcept(suggestedConcept);
    } catch (requestError) {
      if (canUseLocalItineraryFallback(requestError)) {
        setPendingTrip(tripRequest);
        setConcept(makeFallbackConcept(tripRequest, requestError, formatVnd, lang));
      } else {
        setFormError(formatRequestError(requestError));
      }
    } finally {
      setSubmitting(false);
      setSubmissionStage('');
    }
  };

  const handleApproveConcept = async () => {
    if (!pendingTrip || !concept || submitting || loading) return;

    setFormError('');
    setSubmitting(true);
    setSubmissionStage('generate');
    try {
      let generated;
      if (concept.fallback_reason) {
        generated = { source: 'fallback', itinerary_items: null };
      } else {
        try {
          generated = await api.generateAiItinerary({ ...pendingTrip, approved_concept: concept });
        } catch (requestError) {
          if (!canUseLocalItineraryFallback(requestError)) throw requestError;
          generated = { source: 'fallback', itinerary_items: null };
        }
      }

      setSubmissionStage('save');
      const trip = await api.createTrip(buildTripCreatePayload(pendingTrip, generated, lastParse ? 'sentence' : 'form'));
      clearSessionDraft();
      navigate(`/trip/${trip.id}`, {
        state: { aiConceptSource: concept.source || 'gemini', aiGenerationSource: generated.source || 'gemini' }
      });
    } catch (requestError) {
      setFormError(formatRequestError(requestError));
    } finally {
      setSubmitting(false);
      setSubmissionStage('');
    }
  };

  const statuses = stepStatus(form, { budgetDraft });
  const searchPlaces = useCallback((params) => api.searchPlaces(params), []);
  const sharedStepProps = { form, onPatch: update, errors: fieldErrors, t, highlighted, headingRef: stepHeadingRef };

  return (
    <>
      <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} noValidate aria-busy={submitting}
        className="rounded-3xl border border-slate-200 bg-white shadow-card">
        <WizardProgress steps={WIZARD_STEPS} currentStep={step} maxStepIndex={maxStepIndex}
          statuses={statuses} onSelectStep={handleSelectStep} onReset={handleReset} t={t} />

        <fieldset disabled={submitting} className="min-w-0 p-4 sm:p-6">
          <WizardBanners parseSummary={parseSummary} notices={notices}
            onDismissParse={() => setParseSummary(null)} onDismissNotices={() => setNotices([])} t={t} />

          <motion.div key={step} initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.16, ease: [0.23, 1, 0.32, 1] }}>
            {step === 'trip' && (
              <StepTrip {...sharedStepProps} sentence={sentence} quickFillError={quickFillError}
                onSentenceChange={(val) => { setSentence(val); if (quickFillError) setQuickFillError(''); }}
                onQuickFill={handleQuickFill} sentenceRef={sentenceRef} />
            )}
            {step === 'group' && <StepGroup {...sharedStepProps} />}
            {step === 'budget' && (
              <StepBudget {...sharedStepProps} lang={lang} budgetDraft={budgetDraft} onBudgetDraftChange={setBudgetDraft} />
            )}
            {step === 'style' && <StepStyle {...sharedStepProps} />}
            {step === 'constraints' && <StepConstraints {...sharedStepProps} onSearchPlaces={searchPlaces} />}
            {step === 'review' && <StepReview {...sharedStepProps} lang={lang} onEditStep={goToStep} />}
          </motion.div>

          {formError && (
            <p id="trip-form-error" role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
              {formError}
            </p>
          )}

          <WizardFooter step={step} currentIndex={currentIndex} submitting={submitting} submissionStage={submissionStage}
            onBack={handleBack} onNext={handleNext} onSkip={() => validateAndJump('constraints', 'review')} t={t} />
        </fieldset>
      </form>

      {concept && (
        <ConceptDialog concept={concept} submitting={submitting} submissionStage={submissionStage}
          error={formError} lang={lang} t={t}
          onClose={() => { setConcept(null); setPendingTrip(null); setFormError(''); }}
          onApprove={handleApproveConcept} />
      )}
    </>
  );
}
