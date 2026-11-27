import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { DEMO } from '../demo.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { api, assetUrl } from '../lib/api.js';
import { cn } from '../lib/cn.js';
import { translateApiError } from '../lib/errors.js';
import { formatVnd } from '../lib/format.js';
import { parseTripSentence } from '../lib/sentenceParser.js';
import {
  applyParsedToForm, applyTripTemplate, buildAiRequest, buildTripCreatePayload, canUseLocalItineraryFallback,
  defaultTripForm, describeFilledFields, districtFromStartLocation, makeFallbackConcept, missingParsedLabels,
  sanitizeInterests, validateTripForm
} from '../lib/tripFormLogic.js';
import { hasParsedTripContent, interestImage } from '../lib/tripOptions.js';
import {
  autoAdjustments, clearSessionDraft, findStepForErrors, firstIncompleteStep, focusFirstErrorField,
  INTRO_STEP, isImeComposing, readSessionDraft, stepIndexOf, stepStatus, SUBMIT_STEP_IDS, validateStep,
  WIZARD_STEPS, writeSessionDraft
} from '../lib/tripWizardLogic.js';
import { AiWaitingOverlay } from './tripForm/AiWaitingPanel.jsx';
import ConceptDialog from './tripForm/ConceptDialog.jsx';
import { WizardBanners, WizardFooter } from './tripForm/controls.jsx';
import StepFinetune from './tripForm/StepFinetune.jsx';
import StepVibe from './tripForm/StepVibe.jsx';
import StepWhenWhere from './tripForm/StepWhenWhere.jsx';
import StepWho from './tripForm/StepWho.jsx';
import TripIntro from './tripForm/TripIntro.jsx';
import { TripSummaryAside, TripSummarySheet } from './tripForm/TripSummary.jsx';
import WizardProgress from './tripForm/WizardProgress.jsx';

const LAST_STEP_INDEX = WIZARD_STEPS.length - 1;

export default function TripForm() {
  const { lang, t } = useI18n();
  const { loading } = useAuth();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  const [initialDraft] = useState(() => readSessionDraft());
  const [form, setForm] = useState(() => initialDraft?.form || defaultTripForm());
  const [step, setStep] = useState(() => initialDraft?.step || INTRO_STEP);
  const [maxStepIndex, setMaxStepIndex] = useState(() =>
    initialDraft?.step && initialDraft.step !== INTRO_STEP ? stepIndexOf(initialDraft.step) : 0
  );
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
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [matchInfo, setMatchInfo] = useState(null);

  const sentenceRef = useRef(null);
  const stepHeadingRef = useRef(null);
  const didMountRef = useRef(false);
  const skipHeadingFocusRef = useRef(false);

  const isIntro = step === INTRO_STEP;
  const currentIndex = isIntro ? -1 : stepIndexOf(step);

  useEffect(() => {
    const timer = setTimeout(() => writeSessionDraft({ form, step, sentence }), 400);
    return () => clearTimeout(timer);
  }, [form, step, sentence]);

  // Đổi bước → đưa focus về tiêu đề bước (trừ khi đang focus ô lỗi).
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return undefined; }
    if (skipHeadingFocusRef.current) { skipHeadingFocusRef.current = false; return undefined; }
    const raf = requestAnimationFrame(() => stepHeadingRef.current?.focus({ preventScroll: false }));
    return () => cancelAnimationFrame(raf);
  }, [step]);

  // Bộ đếm "Có N địa điểm hợp gu" (T-045). Debounce 400 ms; null/404/lỗi → ẩn.
  const interestsKey = sanitizeInterests(form.interests).join(',');
  const stayDistrict = districtFromStartLocation(form.start_location);
  useEffect(() => {
    if (isIntro || !interestsKey) { setMatchInfo(null); return undefined; }
    let active = true;
    const timer = setTimeout(async () => {
      const result = await api.matchCount({ interests: interestsKey.split(','), districts: [stayDistrict] });
      if (active) setMatchInfo(result);
    }, 400);
    return () => { active = false; clearTimeout(timer); };
  }, [isIntro, interestsKey, stayDistrict]);

  const waitingImages = useMemo(() => {
    const samples = (matchInfo?.samples || [])
      .filter((item) => item.photo_url)
      .map((item) => ({ src: assetUrl(item.photo_url), alt: item.name_vi }));
    if (samples.length >= 2) return samples.slice(0, 6);
    return sanitizeInterests(form.interests).map((key) => ({ src: interestImage(key), alt: t(`form.interest.${key}`) }));
  }, [matchInfo, form.interests, t]);

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
      const clearNotes = keys.includes('custom_notes');
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
    if (nextStepId !== INTRO_STEP) setMaxStepIndex((cur) => Math.max(cur, stepIndexOf(nextStepId)));
  };

  const showErrorsOn = (stepId, errors) => {
    if (stepId !== step) {
      skipHeadingFocusRef.current = true;
      goToStep(stepId);
    }
    setFieldErrors(errors);
    focusFirstErrorField(errors);
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

  const handlePickTemplate = (templateKey) => {
    const next = applyTripTemplate(form, templateKey);
    const adjusted = autoAdjustments(form, next);
    setForm(adjusted.form);
    setBudgetDraft(null);
    setLastParse(null);
    setParseSummary(null);
    setNotices([]);
    setHighlighted(new Set());
    setMaxStepIndex(LAST_STEP_INDEX);
    goToStep(firstIncompleteStep(adjusted.form));
  };

  // Nhảy tới bước bất kỳ (thanh tiến độ, thẻ tóm tắt): đi tới thì phải qua được các bước giữa.
  const handleSelectStep = (targetId) => {
    if (submitting) return;
    if (targetId === step) {
      stepHeadingRef.current?.focus();
      return;
    }
    const targetIndex = stepIndexOf(targetId);
    if (targetIndex > currentIndex) {
      for (let i = Math.max(0, currentIndex); i < targetIndex; i += 1) {
        const id = WIZARD_STEPS[i].id;
        const errors = validateStep(id, form, { budgetDraft });
        if (Object.keys(errors).length > 0) {
          showErrorsOn(id, errors);
          return;
        }
      }
    }
    setNotices([]);
    goToStep(targetId);
  };

  const handleNext = () => {
    const nextStep = WIZARD_STEPS[currentIndex + 1];
    if (nextStep) handleSelectStep(nextStep.id);
  };

  const handleBack = () => {
    setNotices([]);
    goToStep(currentIndex <= 0 ? INTRO_STEP : WIZARD_STEPS[currentIndex - 1].id);
  };

  const handleReset = () => {
    clearSessionDraft();
    setForm(defaultTripForm());
    setStep(INTRO_STEP);
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
    setSummaryOpen(false);
  };

  const handleFormKeyDown = (event) => {
    if (event.key !== 'Enter' || isImeComposing(event)) return;
    const target = event.target;
    if (target?.tagName?.toLowerCase() !== 'input' || target.dataset?.skipEnter === 'true') return;
    // Enter trong ô nhập không tự gửi form; ở bước 1–2 thì sang bước kế.
    event.preventDefault();
    if (!SUBMIT_STEP_IDS.includes(step) && !isIntro) handleNext();
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
    if (submitting || isIntro) return;
    if (!SUBMIT_STEP_IDS.includes(step)) { handleNext(); return; }
    setFormError('');
    setQuickFillError('');

    const validation = validateTripForm(form, budgetDraft);
    if (!validation.valid) {
      showErrorsOn(findStepForErrors(validation.errors) || step, validation.errors);
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
  const summaryProps = { form, t, lang, matchInfo, onEdit: handleSelectStep, currentStep: step };

  return (
    <>
      <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} noValidate aria-busy={submitting} aria-labelledby="plan-heading"
        className={cn('grid gap-4', !isIntro && 'lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start')}>
        <div className="min-w-0 rounded-3xl border border-slate-200 bg-white shadow-card">
          {!isIntro && (
            <WizardProgress steps={WIZARD_STEPS} currentStep={step} maxStepIndex={maxStepIndex}
              statuses={statuses} onSelectStep={handleSelectStep} onReset={handleReset} t={t} />
          )}

          <fieldset disabled={submitting} className="min-w-0 p-4 sm:p-6">
            {!isIntro && (
              <WizardBanners parseSummary={parseSummary} notices={notices}
                onDismissParse={() => setParseSummary(null)} onDismissNotices={() => setNotices([])} t={t} />
            )}

            <motion.div key={step} initial={reducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.16, ease: [0.23, 1, 0.32, 1] }}>
              {isIntro && (
                <TripIntro t={t} headingRef={stepHeadingRef} onPickTemplate={handlePickTemplate}
                  onManual={() => goToStep(WIZARD_STEPS[0].id)} sentence={sentence} quickFillError={quickFillError}
                  onSentenceChange={(val) => { setSentence(val); if (quickFillError) setQuickFillError(''); }}
                  onQuickFill={handleQuickFill} sentenceRef={sentenceRef} />
              )}
              {step === 'when_where' && <StepWhenWhere {...sharedStepProps} />}
              {step === 'who' && <StepWho {...sharedStepProps} />}
              {step === 'vibe' && (
                <StepVibe {...sharedStepProps} lang={lang} budgetDraft={budgetDraft} onBudgetDraftChange={setBudgetDraft} />
              )}
              {step === 'finetune' && <StepFinetune {...sharedStepProps} onSearchPlaces={searchPlaces} />}
            </motion.div>

            {formError && (
              <p id="trip-form-error" role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
                {formError}
              </p>
            )}

            {!isIntro && (
              <WizardFooter step={step} currentIndex={currentIndex} submitting={submitting} submissionStage={submissionStage}
                canSubmit={SUBMIT_STEP_IDS.includes(step)} onBack={handleBack} onNext={handleNext}
                onFinetune={() => handleSelectStep('finetune')} t={t}
                summarySlot={(
                  <TripSummarySheet {...summaryProps} open={summaryOpen}
                    onToggle={(value) => setSummaryOpen((cur) => (typeof value === 'boolean' ? value : !cur))} />
                )} />
            )}
          </fieldset>
        </div>

        {!isIntro && <TripSummaryAside {...summaryProps} />}
      </form>

      {submitting && submissionStage === 'concept' && !concept && (
        <AiWaitingOverlay stage="concept" images={waitingImages} t={t} />
      )}

      {concept && (
        <ConceptDialog concept={concept} submitting={submitting} submissionStage={submissionStage}
          error={formError} lang={lang} t={t} waitingImages={waitingImages}
          onClose={() => { setConcept(null); setPendingTrip(null); setFormError(''); }}
          onApprove={handleApproveConcept} />
      )}
    </>
  );
}
