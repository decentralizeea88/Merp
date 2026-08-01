# Starter Amharic strings

Drop these into `src/i18n/am.ts`. **Have a native speaker review this file before
you ship.** It is a solid starting point, not a finished localization — a few
entries below are marked `⚠` where more than one phrasing is defensible and a
native ear should pick.

Every string the player can see lives here. Nothing gets inlined in a component,
a template literal, or an `aria-label`.

## Chrome and navigation

| Key | Amharic | English (dev reference only) |
|---|---|---|
| `app.title` | ጥበብ | Tibeb |
| `nav.play` | ተጫወት | Play |
| `nav.newGame` | አዲስ ጨዋታ | New game |
| `nav.continue` | ቀጥል | Continue |
| `nav.gallery` | ማዕከለ ስዕላት ⚠ | Gallery |
| `nav.settings` | ቅንብሮች | Settings |
| `nav.back` | ተመለስ | Back |
| `nav.next` | ቀጣይ | Next |
| `nav.home` | ዋና ገጽ | Home |
| `common.yes` | አዎ | Yes |
| `common.no` | አይ | No |
| `common.cancel` | ሰርዝ | Cancel |
| `common.confirm` | አረጋግጥ | Confirm |
| `common.close` | ዝጋ | Close |

## Modes

| Key | Amharic | English |
|---|---|---|
| `mode.sliding` | ተንሸራታች | Sliding tiles |
| `mode.sliding.desc` | ሰቆችን በማንሸራተት ስዕሉን አሟላ | Slide the tiles to complete the picture |
| `mode.jigsaw` | እንቆቅልሽ | Jigsaw |
| `mode.jigsaw.desc` | ቁርጥራጮቹን አገጣጥም | Assemble the pieces |
| `mode.daily` | የዕለት እንቆቅልሽ | Daily puzzle |
| `mode.daily.desc` | በየቀኑ አዲስ ፈተና | A new challenge every day |

## Board and HUD

| Key | Amharic | English |
|---|---|---|
| `board.time` | ጊዜ | Time |
| `board.moves` | እንቅስቃሴ | Moves |
| `board.best` | ምርጥ | Best |
| `board.pause` | ለአፍታ አቁም | Pause |
| `board.resume` | ቀጥል | Resume |
| `board.restart` | እንደገና ጀምር | Restart |
| `board.hint` | ፍንጭ | Hint |
| `board.shuffle` | በትን ⚠ | Shuffle |
| `board.viewImage` | ስዕሉን አሳይ | Show the picture |
| `board.numeralMode` | ቁጥር | Numerals |
| `board.imageMode` | ስዕል | Picture |

## Difficulty

| Key | Amharic | English |
|---|---|---|
| `size.label` | መጠን | Size |
| `size.easy` | ቀላል | Easy |
| `size.medium` | መካከለኛ | Medium |
| `size.hard` | ከባድ | Hard |

## Completion

| Key | Amharic | English |
|---|---|---|
| `win.title` | እንኳን ደስ አለዎት | Congratulations |
| `win.completed` | ተጠናቀቀ | Completed |
| `win.yourTime` | ጊዜዎ | Your time |
| `win.yourMoves` | እንቅስቃሴዎ | Your moves |
| `win.newRecord` | አዲስ ክብረ ወሰን | New record |
| `win.mastery` | ብቃት | Mastery |
| `win.playAgain` | እንደገና ተጫወት | Play again |
| `win.nextPuzzle` | ቀጣይ እንቆቅልሽ | Next puzzle |

## Gallery

| Key | Amharic | English |
|---|---|---|
| `gallery.title` | ማዕከለ ስዕላት ⚠ | Gallery |
| `gallery.locked` | ተቆልፏል | Locked |
| `gallery.unlocked` | ተከፍቷል | Unlocked |
| `gallery.lockedHint` | እንቆቅልሹን ሲፈቱ ይከፈታል | Unlocks when you solve the puzzle |
| `gallery.empty` | እስካሁን የተከፈተ ስዕል የለም | No pictures unlocked yet |

## Settings

| Key | Amharic | English |
|---|---|---|
| `settings.title` | ቅንብሮች | Settings |
| `settings.theme` | ገጽታ | Theme |
| `settings.theme.light` | ብርሃን | Light |
| `settings.theme.dark` | ጨለማ | Dark |
| `settings.theme.system` | የስርዓቱ | System |
| `settings.sound` | ድምፅ | Sound |
| `settings.motion` | እንቅስቃሴ ቀንስ | Reduce motion |
| `settings.reset` | ሂደትን ደምስስ ⚠ | Reset progress |
| `settings.resetConfirm` | ሁሉም ሂደትዎ ይሰረዛል። እርግጠኛ ነዎት? | All your progress will be deleted. Are you sure? |

## Daily puzzle

| Key | Amharic | English |
|---|---|---|
| `daily.streak` | ተከታታይ | Streak |
| `daily.today` | የዛሬ | Today's |
| `daily.done` | የዛሬውን ጨርሰዋል | You've finished today's |
| `daily.comeBack` | ነገ ይመለሱ | Come back tomorrow |

## Ethiopian calendar

Months, in order — index 0 is መስከረም (New Year):

```
መስከረም ጥቅምት ኅዳር ታኅሣሥ ጥር የካቲት መጋቢት ሚያዝያ ግንቦት ሰኔ ሐምሌ ነሐሴ ጳጉሜ
```

Weekdays, starting Sunday:

```
እሑድ ሰኞ ማክሰኞ ረቡዕ ሐሙስ ዓርብ ቅዳሜ
```

## Ge'ez numerals

`core/geez.ts` must produce these. Note there is no zero and the system is
additive-multiplicative, not positional.

```
፩ 1   ፪ 2   ፫ 3   ፬ 4   ፭ 5   ፮ 6   ፯ 7   ፰ 8   ፱ 9
፲ 10  ፳ 20  ፴ 30  ፵ 40  ፶ 50  ፷ 60  ፸ 70  ፹ 80  ፺ 90
፻ 100   ፲፻ 1000
```

Composition: 15 → `፲፭`, 24 → `፳፬`, 99 → `፺፱`, 100 → `፻`, 137 → `፻፴፯`.
Unit tests must cover 1–100 plus the century boundary.

## The twelve artworks

Each needs a title and a one-or-two-sentence caption in Amharic. Titles below;
write the captions as part of Phase 2 and flag any you are unsure of.

| id | Title | Draws on |
|---|---|---|
| `harag` | ሐረግ | Illuminated manuscript interlace and vine borders |
| `lalibela-cross` | የላሊበላ መስቀል | Lalibela processional cross geometry |
| `axum-stele` | የአክሱም ሐውልት | The carved stelae of Aksum |
| `bete-giyorgis` | ቤተ ጊዮርጊስ | The cruciform plan seen from above |
| `tilf` | የጥልፍ ጥበብ | Habesha kemis woven border bands |
| `jebena` | ጀበና | The coffee ceremony, as flat still life |
| `simien` | ስሜን ተራሮች | Stepped highland ridgelines |
| `dallol` | ዳሎል | Danakil mineral color fields |
| `birana` | ብራና | Parchment, ink, and the ruled writing block |
| `fidel` | ግዕዝ ፊደል | The fidel grid as pure typographic composition |
| `abay` | ዓባይ | River and gorge, abstracted |
| `demera` | ደመራ | The Meskel bonfire, radial composition |
