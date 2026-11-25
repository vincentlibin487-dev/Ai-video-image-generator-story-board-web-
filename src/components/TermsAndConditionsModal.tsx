import React, { useState } from 'react';
import {
  ShieldCheck,
  FileWarning,
  HardDrive,
  AlertTriangle,
  Smartphone,
  CheckCircle2,
  Globe,
  X,
} from 'lucide-react';
import type { AppLang } from '../lib/i18n';

const TERMS_STORAGE_KEY = 'cinestudio_terms_accepted_v1';
const TERMS_VERSION = '2026-11-25';

let memoryTermsAccepted = false;

export function hasAcceptedTerms(): boolean {
  if (memoryTermsAccepted) return true;
  if (typeof window === 'undefined') return false;
  try {
    if (window.localStorage.getItem(TERMS_STORAGE_KEY) === TERMS_VERSION) {
      memoryTermsAccepted = true;
      return true;
    }
  } catch {}
  try {
    if (window.sessionStorage.getItem(TERMS_STORAGE_KEY) === TERMS_VERSION) {
      memoryTermsAccepted = true;
      return true;
    }
  } catch {}
  return false;
}

export function saveTermsAccepted(): void {
  memoryTermsAccepted = true;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TERMS_STORAGE_KEY, TERMS_VERSION);
  } catch {}
  try {
    window.sessionStorage.setItem(TERMS_STORAGE_KEY, TERMS_VERSION);
  } catch {}
}

interface TermsAndConditionsModalProps {
  open: boolean;
  lang: AppLang;
  onChangeLang?: (next: AppLang) => void;
  /** When false (first launch gate), user MUST tap I Agree / Continue before using the app. */
  alreadyAccepted?: boolean;
  onAccept: () => void;
  onCloseReview?: () => void;
}

export const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({
  open,
  lang,
  onChangeLang,
  alreadyAccepted = false,
  onAccept,
  onCloseReview,
}) => {
  const [hasConfirmedRead, setHasConfirmedRead] = useState<boolean>(true);

  if (!open) return null;

  const isMl = lang === 'ml';

  const copy = isMl
    ? {
        badge: 'ഉപയോഗിക്കുന്നതിന് മുൻപ് നിർബന്ധമായും വായിക്കുക',
        title: 'നിബന്ധനകളും വ്യവസ്ഥകളും (Terms & Conditions)',
        subtitle:
          'വെബ്‌സൈറ്റായും മൊബൈൽ ആപ്പ് / WebView വഴിയും സുരക്ഷിതമായി ഉപയോഗിക്കുന്നതിനുള്ള പ്രധാന വിവരങ്ങൾ.',
        agreeBtn: 'I Agree / Continue · സമ്മതിച്ച് തുടരുക',
        reviewCloseBtn: 'Close · അടയ്ക്കുക',
        checkLabel: 'മുകളിലുള്ള എല്ലാ നിബന്ധനകളും ഞാൻ വായിച്ച് മനസ്സിലാക്കി അംഗീകരിക്കുന്നു.',
        acceptedPill: 'അംഗീകരിച്ചത് · Accepted',
        sections: [
          {
            icon: FileWarning,
            accent: 'text-amber-400',
            border: 'border-amber-500/35 bg-amber-950/15',
            heading: '1. ഉപയോക്തൃ ഉത്തരവാദിത്തവും പകർപ്പവകാശവും (Copyright & Responsibility)',
            body: 'നിങ്ങൾ എഡിറ്റ് ചെയ്യുന്നതും എക്‌സ്‌പോർട്ട് ചെയ്യുന്നതുമായ എല്ലാ വീഡിയോ, ഓഡിയോ, ചിത്ര ഫയലുകളുടെയും പൂർണ്ണ ഉത്തരവാദിത്തം ഉപയോക്താവിന് മാത്രമായിരിക്കും. അനുമതിയില്ലാതെ പകർപ്പവകാശമുള്ളതോ (Copyrighted) നിയമവിരുദ്ധമായതോ ആയ ഉള്ളടക്കം ഉപയോഗിക്കരുത്.',
          },
          {
            icon: HardDrive,
            accent: 'text-teal-400',
            border: 'border-teal-500/35 bg-teal-950/15',
            heading: '2. ലോക്കൽ പ്രോസസ്സിംഗ് മാത്രം (No Cloud Media Upload)',
            body: 'നിങ്ങളുടെ ഉപകരണത്തിൽ (Device) നിന്ന് തിരഞ്ഞെടുക്കുന്ന വീഡിയോ, ഓഡിയോ, ഫോട്ടോ ഫയലുകൾ ഒരു ബാഹ്യ/പബ്ലിക് സെർവറിലേക്കും അപ്‌ലോഡ് ചെയ്യുകയോ സൂക്ഷിക്കുകയോ ഇല്ല. എല്ലാ എഡിറ്റിംഗും നിങ്ങളുടെ സ്വന്തം ഫോണിലോ ബ്രൗസറിലോ മാത്രമാണ് നടക്കുന്നത്.',
          },
          {
            icon: AlertTriangle,
            accent: 'text-rose-400',
            border: 'border-rose-500/35 bg-rose-950/15',
            heading: '3. പ്രോജക്റ്റ് ഡാറ്റ നഷ്ടപ്പെടാനുള്ള സാധ്യത (Local Data Loss Risk)',
            body: 'ബ്രൗസർ/ആപ്പ് ഡാറ്റ ക്ലിയർ ചെയ്യുകയോ, ആപ്പ് അൺഇൻസ്റ്റാൾ ചെയ്യുകയോ, ഉപകരണത്തിലെ യഥാർത്ഥ ഫയലുകൾ ഡിലീറ്റ് ചെയ്യുകയോ ചെയ്താൽ ലോക്കൽ പ്രോജക്റ്റ് വിവരങ്ങൾ നഷ്ടപ്പെടാം. എഡിറ്റ് പൂർത്തിയായ വീഡിയോകൾ ഉടൻ തന്നെ ഉപകരണത്തിലേക്ക് നേരിട്ട് Export/Save ചെയ്യേണ്ടതാണ്.',
          },
          {
            icon: Smartphone,
            accent: 'text-cyan-400',
            border: 'border-cyan-500/35 bg-cyan-950/15',
            heading: '4. വെബ്‌സൈറ്റിലും ആപ്പ് / WebView കണ്ടെയ്‌നറിലും ഉള്ള ഉപയോഗം',
            body: 'ഫയൽ തിരഞ്ഞെടുക്കൽ, മീഡിയ ഫോർമാറ്റുകൾ, വീഡിയോ എക്‌സ്‌പോർട്ട് വേഗത, ഡൗൺലോഡ് എന്നിവ നിങ്ങളുടെ ഉപകരണത്തിന്റെ സ്റ്റോറേജ്, നൽകിയിട്ടുള്ള പെർമിഷനുകൾ, ബ്രൗസർ അല്ലെങ്കിൽ മൊബൈൽ ആപ്പ് WebView സംവിധാനം എന്നിവയെ ആശ്രയിച്ചിരിക്കും.',
          },
        ],
      }
    : {
        badge: 'Mandatory Notice Before First Use',
        title: 'Terms & Conditions',
        subtitle:
          'Please review how your media, privacy, and local device storage work across both web browser and mobile app / WebView.',
        agreeBtn: 'I Agree / Continue',
        reviewCloseBtn: 'Close',
        checkLabel: 'I have read and agree to these Terms & Conditions.',
        acceptedPill: 'Accepted',
        sections: [
          {
            icon: FileWarning,
            accent: 'text-amber-400',
            border: 'border-amber-500/35 bg-amber-950/15',
            heading: '1. User Responsibility & Copyright',
            body: 'You retain sole responsibility for all video, audio, and image files you import, edit, or export. Do not use copyrighted, infringing, or illegal content without proper rights or permission.',
          },
          {
            icon: HardDrive,
            accent: 'text-teal-400',
            border: 'border-teal-500/35 bg-teal-950/15',
            heading: '2. Local-Only Processing & Private Storage',
            body: 'Your media files stay strictly on your own device and are processed locally inside your browser or app container. This platform does not upload or store your personal video, audio, or image files on external or public servers.',
          },
          {
            icon: AlertTriangle,
            accent: 'text-rose-400',
            border: 'border-rose-500/35 bg-rose-950/15',
            heading: '3. Local Project & Data Loss Risk',
            body: 'Clearing browser or app cache/storage, uninstalling the app, or deleting original media files from your device can permanently remove local project progress. Always export and save finished videos directly to your device.',
          },
          {
            icon: Smartphone,
            accent: 'text-cyan-400',
            border: 'border-cyan-500/35 bg-cyan-950/15',
            heading: '4. Web Browser & Mobile App (WebView) Usage',
            body: 'File selection, codec playback, export rendering, and direct downloads depend on your device hardware, granted media permissions, available storage, and your browser or mobile WebView container.',
          },
        ],
      };

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#07090e]/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
    >
      <div className="w-full max-w-2xl max-h-[92dvh] bg-[#10141e] border border-[#263042] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#0c1017] border-b border-[#1f2937] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-400/15 border border-teal-400/40 flex items-center justify-center text-teal-300 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                  {copy.badge}
                </span>
                {alreadyAccepted && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[9.5px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    {copy.acceptedPill}
                  </span>
                )}
              </div>
              <h2 id="terms-modal-title" className="text-sm sm:text-base font-extrabold text-white truncate">
                {copy.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onChangeLang && (
              <button
                type="button"
                onClick={() => onChangeLang(isMl ? 'en' : 'ml')}
                className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#18202c] hover:bg-[#222d3d] border border-[#2b3648] text-[11px] font-bold text-amber-300 flex items-center gap-1.5 cursor-pointer"
                title="Switch Language"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{isMl ? 'English' : 'മലയാളം'}</span>
              </button>
            )}
            {alreadyAccepted && onCloseReview && (
              <button
                type="button"
                onClick={onCloseReview}
                className="min-h-[36px] min-w-[36px] rounded-lg bg-[#18202c] hover:bg-[#222d3d] border border-[#2b3648] text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer"
                aria-label="Close Terms"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Terms Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 text-zinc-200">
          <p className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed">{copy.subtitle}</p>

          <div className="space-y-2.5">
            {copy.sections.map((sec) => {
              const IconComp = sec.icon;
              return (
                <div key={sec.heading} className={`p-3.5 rounded-xl border ${sec.border} space-y-1.5`}>
                  <div className="flex items-center gap-2">
                    <IconComp className={`w-4 h-4 shrink-0 ${sec.accent}`} />
                    <h3 className="text-xs sm:text-[13px] font-extrabold text-white leading-snug">
                      {sec.heading}
                    </h3>
                  </div>
                  <p className="text-[11.5px] sm:text-xs text-zinc-300 leading-relaxed">{sec.body}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sticky Footer CTA */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#0c1017] border-t border-[#1f2937] space-y-2.5 shrink-0">
          {!alreadyAccepted && (
            <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#151b26] border border-[#263244] cursor-pointer select-none min-h-[44px]">
              <input
                type="checkbox"
                checked={hasConfirmedRead}
                onChange={(e) => setHasConfirmedRead(e.target.checked)}
                className="w-4 h-4 accent-teal-400 rounded cursor-pointer shrink-0"
              />
              <span className="text-[11px] sm:text-xs text-zinc-200 font-semibold leading-snug">
                {copy.checkLabel}
              </span>
            </label>
          )}

          <div className="flex items-center justify-end gap-2.5">
            {alreadyAccepted && onCloseReview ? (
              <button
                type="button"
                onClick={onCloseReview}
                className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-zinc-950 font-extrabold text-xs sm:text-sm cursor-pointer shadow-lg"
              >
                {copy.reviewCloseBtn}
              </button>
            ) : (
              <button
                type="button"
                disabled={!hasConfirmedRead}
                onClick={() => {
                  saveTermsAccepted();
                  onAccept();
                }}
                className="w-full min-h-[46px] px-6 py-3 rounded-xl bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-teal-500/20 transition-all active:scale-[0.99]"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>{copy.agreeBtn}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
