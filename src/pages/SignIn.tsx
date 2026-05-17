import React, { FormEvent, useState } from 'react';
import { ArrowRight, Languages, LockKeyhole, Sparkles, UserRound } from 'lucide-react';
import { cn } from '../lib/utils';
import { useI18n } from '../lib/i18n';

const DEMO_CREDENTIALS = {
  name: 'Alex Rivera',
  password: 'Workspace-2026',
};

interface SignInProps {
  onSignIn: (rememberMe: boolean) => void;
}

export default function SignIn({ onSignIn }: SignInProps) {
  const { isRTL, language, setLanguage } = useI18n();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');

  const copy = isRTL
    ? {
        title: 'התחברות',
        subtitle: 'התחבר כדי להמשיך ללוח הניהול של הפרויקטים.',
        name: 'שם מלא',
        namePlaceholder: 'אלכס ריברה',
        password: 'סיסמה',
        passwordPlaceholder: 'הקלד סיסמה',
        remember: 'זכור אותי',
        signIn: 'כניסה',
        forgot: 'שכחת סיסמה?',
        autofill: 'מילוי אוטומטי',
        helper: 'צריך כניסה מהירה? מלא פרטי דמו בלחיצה.',
        heroEyebrow: 'סביבת ניהול פרויקטים',
        heroTitle: 'ברוך הבא בחזרה ל־LinnoProjact',
        heroBody: 'כל הפרויקטים, החסמים, ההגשות והסיוע של ה־AI זמינים ממסך אחד, בסביבה נקייה וממוקדת ביצוע.',
        heroKicker: 'מרכז שליטה אחד לצוות, למשימות וללקוחות.',
        heroCardTitle: 'גישה מהירה לצוות המוביל',
        heroCardBody: 'מילוי אוטומטי שומר על מבנה כניסה פשוט ומאפשר כניסה מיידית לסביבת העבודה.',
        error: 'יש למלא שם וסיסמה לפני הכניסה.',
      }
    : {
        title: 'Sign in',
        subtitle: 'Access the PM workspace with your name and password.',
        name: 'Full Name',
        namePlaceholder: 'Alex Rivera',
        password: 'Password',
        passwordPlaceholder: 'Enter your password',
        remember: 'Remember me',
        signIn: 'Sign in',
        forgot: 'Forgot Password?',
        autofill: 'Autofill',
        helper: 'Need quick access? Fill demo credentials in one click.',
        heroEyebrow: 'Project Management Workspace',
        heroTitle: 'Welcome back to LinnoProjact',
        heroBody: 'Keep projects, blockers, submissions, and AI support in one focused control surface built for day-to-day delivery.',
        heroKicker: 'One control center for team velocity, client visibility, and execution.',
        heroCardTitle: 'Fast access for the lead team',
        heroCardBody: 'Autofill replaces GitHub sign-in with a faster local entry path for the workspace.',
        error: 'Enter both name and password before signing in.',
      };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !password.trim()) {
      setError(copy.error);
      return;
    }

    setError('');
    onSignIn(rememberMe);
  }

  function handleAutofill() {
    setName(DEMO_CREDENTIALS.name);
    setPassword(DEMO_CREDENTIALS.password);
    setError('');
  }

  const brandWordmark = (
    <span className="text-[1.35rem] font-semibold tracking-[-0.04em]">
      <span>Linno</span>
      <span className="text-[#0080EC]">Projact</span>
    </span>
  );

  return (
    <div className="min-h-screen bg-[#f4f1eb] text-zinc-950">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-[-12rem] top-[-10rem] h-[24rem] w-[24rem] rounded-full bg-white/70 blur-3xl" />
        <div className="absolute bottom-[-12rem] right-[-8rem] h-[22rem] w-[22rem] rounded-full bg-[#d8d1c7]/45 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] items-center px-[5vw] py-8 lg:py-[5vh]">
        <button
          type="button"
          onClick={() => setLanguage(language === 'en' ? 'he' : 'en')}
          className={cn(
            'absolute top-6 flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm backdrop-blur-sm transition hover:bg-white',
            isRTL ? 'left-[5vw]' : 'right-[5vw]'
          )}
        >
          <Languages size={14} />
          {language === 'en' ? 'עברית' : 'English'}
        </button>

        <div className="grid w-full items-center gap-8 xl:gap-10 lg:grid-cols-[minmax(340px,410px)_minmax(420px,620px)] xl:grid-cols-[minmax(360px,420px)_minmax(480px,680px)] lg:justify-between">
          <section className={cn('mx-auto w-full max-w-[390px] lg:mx-0', isRTL && 'text-right')}>
            <div className={cn('mb-12 flex items-center gap-3', isRTL && 'flex-row-reverse')}>
              <img src="/favicon.svg" alt="LinnoProjact icon" className="h-8 w-auto" />
              <div className="text-zinc-950">{brandWordmark}</div>
            </div>

            <div className="space-y-2">
              <h1 className="text-[2.55rem] font-semibold tracking-[-0.04em] text-zinc-950">{copy.title}</h1>
              <p className="max-w-sm text-sm leading-6 text-zinc-500">{copy.subtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-9 space-y-5">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{copy.name}</span>
                <div className="relative">
                  <UserRound
                    size={16}
                    className={cn('pointer-events-none absolute top-1/2 -translate-y-1/2 text-zinc-400', isRTL ? 'right-4' : 'left-4')}
                  />
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={copy.namePlaceholder}
                    className={cn(
                      'h-12 w-full rounded-2xl border border-zinc-200 bg-white px-11 text-sm text-zinc-950 shadow-[0_1px_0_rgba(255,255,255,0.8)] outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-200/70',
                      isRTL && 'text-right'
                    )}
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{copy.password}</span>
                <div className="relative">
                  <LockKeyhole
                    size={16}
                    className={cn('pointer-events-none absolute top-1/2 -translate-y-1/2 text-zinc-400', isRTL ? 'right-4' : 'left-4')}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={copy.passwordPlaceholder}
                    className={cn(
                      'h-12 w-full rounded-2xl border border-zinc-200 bg-white px-11 text-sm text-zinc-950 shadow-[0_1px_0_rgba(255,255,255,0.8)] outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-200/70',
                      isRTL && 'text-right'
                    )}
                  />
                </div>
              </label>

              <div className={cn('flex items-center justify-between gap-4 text-sm', isRTL && 'flex-row-reverse')}>
                <label className={cn('flex items-center gap-3 text-zinc-600', isRTL && 'flex-row-reverse')}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-300"
                  />
                  <span>{copy.remember}</span>
                </label>
                <button type="button" className="text-sm text-zinc-500 transition hover:text-zinc-900">
                  {copy.forgot}
                </button>
              </div>

              {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 text-sm font-semibold text-white shadow-lg shadow-zinc-950/10 transition hover:bg-zinc-800"
              >
                {copy.signIn}
                <ArrowRight size={15} className={isRTL ? 'rotate-180' : ''} />
              </button>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAutofill}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50"
                >
                  <Sparkles size={15} />
                  {copy.autofill}
                </button>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{copy.helper}</p>
              </div>
            </form>
          </section>

          <section className={cn(
            "relative hidden w-full max-w-[min(46vw,680px)] self-stretch overflow-hidden rounded-[2.2rem] bg-[#0d0d10] px-7 py-7 text-white shadow-[0_28px_70px_rgba(15,15,20,0.18)] lg:flex lg:min-h-[min(72vh,760px)] lg:flex-col xl:px-8 xl:py-8",
            isRTL && "text-right"
          )}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.02),transparent_60%)]" />
            <div className="absolute right-[-2.5rem] top-[-3rem] h-56 w-20 rotate-[38deg] bg-gradient-to-b from-white/30 via-white/5 to-transparent blur-sm xl:h-64 xl:w-24" />
            <div className="absolute right-10 top-0 h-[22rem] w-px rotate-[38deg] bg-gradient-to-b from-transparent via-white/16 to-transparent xl:h-[25rem]" />
            <div className="absolute bottom-0 right-20 h-44 w-px rotate-[38deg] bg-gradient-to-b from-transparent via-indigo-300/35 to-transparent xl:h-52" />

            <div className={cn("relative z-10 flex items-center gap-3", isRTL && "flex-row-reverse")}>
              <img src="/favicon.svg" alt="LinnoProjact icon" className="h-7 w-auto brightness-0 invert" />
              <div className="text-white">{brandWordmark}</div>
            </div>

            <div className="relative z-10 mt-7 flex flex-1 flex-col justify-between xl:mt-8">
              <div className="relative mx-auto flex h-[min(24vw,18rem)] min-h-[14rem] max-h-[18rem] items-center justify-center xl:h-[19rem]">
                <div className="absolute h-56 w-56 rounded-full bg-white/4 blur-3xl xl:h-72 xl:w-72" />
                <img
                  src="/favicon.svg"
                  alt="LinnoProjact mark"
                  className="relative h-[min(18vw,13rem)] min-h-[9rem] w-auto opacity-85 brightness-[0.25] contrast-125 saturate-0 xl:h-56"
                />
                <div className="absolute h-28 w-28 rounded-full bg-[#7d6b5c]/18 blur-2xl xl:h-40 xl:w-40" />
              </div>

              <div className={cn("max-w-[24rem] xl:max-w-[26rem]", isRTL && "ml-auto")}>
                <p className="text-sm font-medium text-zinc-400">{copy.heroEyebrow}</p>
                <h2 className="mt-4 text-[clamp(2rem,2.7vw,2.9rem)] font-semibold tracking-[-0.04em] leading-[1.08]">{copy.heroTitle}</h2>
                <p className="mt-4 max-w-[22rem] text-sm leading-7 text-zinc-400">{copy.heroBody}</p>
                <p className="mt-5 max-w-[22rem] text-sm text-zinc-300">{copy.heroKicker}</p>
              </div>
            </div>

            <div className={cn(
              "relative z-10 mt-8 w-full max-w-[24rem] xl:max-w-[26rem] rounded-[1.8rem] bg-white/12 p-6 xl:p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-md transition-all duration-300 hover:bg-white/15",
              isRTL && "ml-auto"
            )}>
              <div className={cn(
                "absolute bottom-0 h-20 w-20 bg-white/9 transition-all duration-300 xl:h-24 xl:w-24",
                isRTL
                  ? "left-0 rounded-tr-[1.8rem] rounded-bl-[1.8rem]"
                  : "right-0 rounded-tl-[1.8rem] rounded-br-[1.8rem]"
              )} />
              <div className="relative">
                <h3 className="max-w-[13rem] text-[1.45rem] font-semibold leading-7 tracking-[-0.04em] xl:max-w-[14rem] xl:text-[1.65rem] xl:leading-8">{copy.heroCardTitle}</h3>
                <p className={cn(
                  "mt-4 text-sm leading-6 text-zinc-300",
                  isRTL ? "max-w-[13.5rem] xl:max-w-[15rem] ml-auto" : "max-w-[13.5rem] xl:max-w-[15rem] mr-auto"
                )}>
                  {copy.heroCardBody}
                </p>
                <div className={cn(
                  "absolute bottom-0 z-20 flex items-center",
                  isRTL ? "left-0" : "right-0"
                )}>
                  <div className={cn("flex", isRTL ? "flex-row-reverse -space-x-3 -space-x-reverse" : "-space-x-3")}>
                    {['AR', 'PM', 'AI'].map((initials, index) => (
                      <div
                        key={initials}
                        className={cn(
                          'flex h-9 w-9 xl:h-10 xl:w-10 items-center justify-center rounded-full border-2 border-[#16161c] text-[10px] xl:text-[11px] font-semibold text-white shadow-md',
                          index === 0 && 'bg-[#6c5a48]',
                          index === 1 && 'bg-[#2f5d9a]',
                          index === 2 && 'bg-[#505865]'
                        )}
                      >
                        {initials}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
