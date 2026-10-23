// dialogues.js — all dialogue scripts (bilingual FA/EN)
// Original epic-style verse written for this game, in the spirit of the Shahnameh.

export const SPEAKERS = {
  narrator: { fa: 'راوی', en: 'NARRATOR', color: '#b5a888', emblem: 'n' },
  rostam:   { fa: 'رستم', en: 'ROSTAM', color: '#e8b64c', emblem: 'r' },
  rakhsh:   { fa: 'رخش', en: 'RAKHSH', color: '#9a8fc0', emblem: 'h' },
  lion:     { fa: 'شیرِ خوان', en: 'THE LION', color: '#d8734a', emblem: 'l' },
};

export const DIALOGUES = {
  trial1_intro: [
    {
      speaker: 'narrator',
      fa: 'چون شاه و سرانِ سپاه به دیوانِ مازندران گرفتار آمدند، پیلتنِ ایرانی زین اسب بست…',
      en: 'When the Shah and his captains fell into the demons\u2019 snare in Mazandaran, the Iranian paladin saddled his steed\u2026',
    },
    {
      speaker: 'rostam',
      fa: 'زره و سپر نمی‌جویم؛ گرزِ گاوسر و کمانم بس است. راهِ هفت‌خوان، از همین بیابان آغاز می‌شود.',
      en: 'I ask for no armor and no shield — my ox-headed mace and bow suffice. The road of Seven Trials begins in this desert.',
    },
    {
      speaker: 'rakhsh',
      fa: '«پرپر» — رخش، بهرام‌شکنِ سیاه، سُم بر خاک می‌کوبد و از راه می‌رسد.',
      en: '*Neigh!* — Rakhsh, the dark lion-queller, drums the earth with his hooves and answers the call.',
    },
    {
      speaker: 'narrator',
      fa: 'بشنو از نَی چون حکایت می‌کند — خوانِ اوّل: شیرِ گرسنه، بر سرِ راه است.',
      en: 'Listen to the tale as it unfolds — Trial the First: a hungry Lion blocks the road.',
    },
  ],

  trial1_hint: [
    {
      speaker: 'rostam',
      fa: 'خاک بیابان نرم است؛ باد، ردّ پای شیر را می‌آورد. آماده‌ام.',
      en: 'The desert sand is soft; the wind carries the lion\u2019s tracks. I am ready.',
    },
  ],

  checkpoint_resume: [
    {
      speaker: 'narrator',
      fa: 'پهلوان بر آستانهٔ لانهٔ شیر بازایستاد — رخش، سُم بر خاک می‌کوبد. (اقتباس آزاد از شاهنامه؛ نبردِ رستم و شیر در این بازی بازآفرینی آزادِ خوانِ اوّل است.)',
      en: 'The paladin stands again at the lion\u2019s threshold — Rakhsh drums the earth. (A free adaptation: this duel reimagines the First Trial of the Shahnameh.)',
    },
  ],

  pre_jackal: [
    {
      speaker: 'narrator',
      fa: 'از میان تپه‌ها، گرگیِ سپیدی برآمد — رهبرِ گله، ریش‌سفیدِ نبردها. چشم‌هایش آتش بود.',
      en: 'From among the dunes rose a white jackal — the pack\u2019s alpha, grey-muzzled veteran of a hundred fights. Its eyes burned.',
    },
    {
      speaker: 'rostam',
      fa: 'پیرِ گله خودش آمده! خب… اول راه را باز کن، بعد با شیر حرف می‌زنم.',
      en: 'The old one comes himself! Very well — clear the road first, then I shall speak with the lion.',
    },
    {
      speaker: 'narrator',
      fa: 'پندِ میدان: هرگاه دشمن به زانو درآمد، لحظهٔ «ضربهٔ نهایی» است — نزدیک شو و دکمهٔ فینیشر را درست بزن!',
      en: 'Field wisdom: whenever your foe is brought to their knees, the FINISHER window opens — get close and strike true!',
    },
  ],

  jackal_defeated: [
    {
      speaker: 'narrator',
      fa: 'شغالِ سپید بر خاک افتاد و گله، پراکنده شد. راه به سوی لانهٔ شیر گشوده شد…',
      en: 'The White Jackal fell, and the pack scattered. The road to the lion\u2019s lair lay open\u2026',
    },
    {
      speaker: 'rakhsh',
      fa: '«پرپر!»',
      en: '*Neigh!*',
    },
  ],

  pre_lion: [
    {
      speaker: 'narrator',
      fa: 'و ناگهان — خامُشی. پرندگان از آسمان برخاستند و خاکِ افق به لرزه درآمد.',
      en: 'And suddenly — silence. The birds scattered skyward and the horizon dust began to tremble.',
    },
    {
      speaker: 'lion',
      fa: '«غرش» — شیرِ کوه‌های مازندران، گرسنه و خشمگین، بر سرِ پل برمی‌خیزد!',
      en: '*ROAR!* — The lion of the Mazandaran peaks rises over the bridge, starving and furious!',
    },
    {
      speaker: 'rostam',
      fa: 'بیا، زورآزمای کهن. پهلوانی که تو را ببیند، از تو نترسد — و من تو را می‌بینم.',
      en: 'Come, ancient test of strength. The man who sees you does not fear you — and I see you.',
    },
  ],

  lion_half: [
    {
      speaker: 'lion',
      fa: 'شیر، خونین و شتاب‌زده، خشمِ کوه را در سینه دارد — غرشِ دومی، پرشتاب‌تر است!',
      en: 'Bloodied and maddened, the lion carries the mountain\u2019s wrath — its second roar comes faster!',
    },
  ],

  lion_defeated: [
    {
      speaker: 'narrator',
      fa: 'شیرِ خوان بر خاک افَت. پیلتن، خاکِ رخ را از آستین می‌تواند و راه را می‌گشاید…',
      en: 'The lion of the trial falls to the dust. The paladin brushes the dirt from his sleeve, and the road opens\u2026',
    },
    {
      speaker: 'rostam',
      fa: 'خوانِ اوّل گشوده شد. شش خوانِ دیگر بر سرِ راه است — و دیوِ سپید، در پایانِ راه.',
      en: 'The first trial is opened. Six trials remain upon the road — and the White Demon waits at its end.',
    },
    {
      speaker: 'rakhsh',
      fa: '«پرپر!»',
      en: '*Neigh!*',
    },
  ],
};
