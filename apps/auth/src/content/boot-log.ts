/**
 * Boot log — the rotating archive shown on the auth-center sign-in panel.
 *
 * This file holds the archive's STRUCTURE: the identifier, the date stamp and
 * the citations. It deliberately holds no prose. The copy — tag, title, body and
 * coda, in every locale — lives in the `boot-log` message catalog under
 * packages/platform/i18n/boot-log, where `pnpm i18n:translate` and
 * `pnpm i18n:check` reach it like any other catalog.
 *
 * The split is not cosmetic. Stamps and source URLs must never reach a
 * translator: a model asked to "translate" a citation will localise a URL or
 * reformat a date, and a wrong citation is the one defect this archive cannot
 * ship. Prose goes through the pipeline; evidence stays in code.
 *
 * English and Chinese are hand-authored and are the two sources of truth. Every
 * other locale is machine-translated from the English. The translator fills only
 * MISSING leaves unless run with --force, and that is the only thing keeping the
 * authored Chinese from being overwritten — do not run --force on this catalog.
 *
 * Editorial contract (read before adding an entry):
 *   1. Verifiable, not remembered. `sources` is required precisely so that an
 *      entry cannot be added from memory. Where the popular version of a story
 *      is wrong — Mariner 1's "hyphen", Hopper's moth, the "rsync" in the
 *      Dropbox comment — the entry states the checked version and lets the myth
 *      be the twist.
 *   2. It must turn. The last third contradicts what the first two thirds set
 *      up: a rejected paper that became a law, a demo nobody acted on, a fix so
 *      complete that people denied the problem had been real.
 *   3. The coda states an outcome, never a lesson. If it could end in an
 *      exclamation mark it is the wrong sentence — see the seven prohibitions in
 *      docs/microcopy/nebutra-microcopy-system.md.
 *   4. Body is 45–75 CJK characters. The card reserves a fixed height so the
 *      rotation never shifts the panel; longer entries defeat that.
 */

import type { BootLogCatalog, BootLogCopy } from "@nebutra/i18n/boot-log";

/** Where the entry was checked. Required — see rule 1. */
export interface BootLogSource {
  readonly label: string;
  readonly url: string;
}

/** The structural half of an entry. The prose half lives in the catalog. */
export interface BootLogEntry {
  readonly id: string;
  /** Cinematic date stamp, e.g. "1969.10.29". Shown verbatim, never translated. */
  readonly stamp: string;
  readonly sources: readonly BootLogSource[];
}

/** One entry as rendered — structure joined to the copy for one locale. */
export interface BootLogRecord extends BootLogCopy {
  readonly id: string;
  readonly stamp: string;
  /** Leading year of the stamp — where this entry sits on the rail. */
  readonly year: number;
}

export const BOOT_LOG_ENTRIES: readonly BootLogEntry[] = [
  {
    id: "tesla-westinghouse-royalty",
    stamp: "1888 · 1897",
    sources: [
      { label: "Wikipedia, Nikola Tesla", url: "https://en.wikipedia.org/wiki/Nikola_Tesla" },
    ],
  },
  {
    id: "transistor-name-off-patent-1947",
    stamp: "1947.12",
    sources: [
      {
        label: "Wikipedia, History of the transistor",
        url: "https://en.wikipedia.org/wiki/History_of_the_transistor",
      },
    ],
  },
  {
    id: "salk-polio-patent",
    stamp: "1955.04",
    sources: [
      { label: "Wikipedia, Jonas Salk", url: "https://en.wikipedia.org/wiki/Jonas_Salk" },
      { label: "Wikipedia, Polio vaccine", url: "https://en.wikipedia.org/wiki/Polio_vaccine" },
    ],
  },
  {
    id: "dartmouth-two-month-study-1956",
    stamp: "1956",
    sources: [
      {
        label: "Wikipedia, Dartmouth workshop",
        url: "https://en.wikipedia.org/wiki/Dartmouth_workshop",
      },
    ],
  },
  {
    id: "traitorous-eight-lie-detector-1957",
    stamp: "1957",
    sources: [
      {
        label: "Wikipedia, Traitorous eight",
        url: "https://en.wikipedia.org/wiki/Traitorous_eight",
      },
    ],
  },
  {
    id: "kilby-noyce-six-months-1958-1959",
    stamp: "1958 · 1959",
    sources: [
      { label: "Wikipedia, Jack Kilby", url: "https://en.wikipedia.org/wiki/Jack_Kilby" },
      { label: "Wikipedia, Robert Noyce", url: "https://en.wikipedia.org/wiki/Robert_Noyce" },
    ],
  },
  {
    id: "perceptron-conscious-machine-1958",
    stamp: "1958 · 1969",
    sources: [
      { label: "Wikipedia, Perceptron", url: "https://en.wikipedia.org/wiki/Perceptron" },
      { label: "Wikipedia, AI winter", url: "https://en.wikipedia.org/wiki/AI_winter" },
    ],
  },
  {
    id: "cobol-two-hundred-billion-lines",
    stamp: "1959 · 2020",
    sources: [{ label: "Wikipedia, COBOL", url: "https://en.wikipedia.org/wiki/COBOL" }],
  },
  {
    id: "hamilton-software-engineering",
    stamp: "1960s",
    sources: [
      {
        label: "Wikipedia, Margaret Hamilton (software engineer)",
        url: "https://en.wikipedia.org/wiki/Margaret_Hamilton_(software_engineer)",
      },
    ],
  },
  {
    id: "sabre-sage-to-booking",
    stamp: "1960 · 1964",
    sources: [
      {
        label: "Wikipedia, Sabre (travel reservation system)",
        url: "https://en.wikipedia.org/wiki/Sabre_(travel_reservation_system)",
      },
    ],
  },
  {
    id: "macau-seventeen-thousand",
    stamp: "1961.10",
    sources: [
      {
        label: "何鴻燊,中文維基百科",
        url: "https://zh.wikipedia.org/wiki/%E4%BD%95%E9%B4%BB%E7%87%8A",
      },
      {
        label: "澳門博彩業,中文維基百科",
        url: "https://zh.wikipedia.org/wiki/%E6%BE%B3%E9%96%80%E5%8D%9A%E5%BD%A9%E6%A5%AD",
      },
    ],
  },
  {
    id: "moores-law-ten-year-bet-1965",
    stamp: "1965",
    sources: [
      { label: "Wikipedia, Moore's law", url: "https://en.wikipedia.org/wiki/Moore%27s_law" },
    ],
  },
  {
    id: "eliza-secretary-1966",
    stamp: "1966",
    sources: [
      { label: "Wikipedia, ELIZA", url: "https://en.wikipedia.org/wiki/ELIZA" },
      {
        label: "Wikipedia, Joseph Weizenbaum",
        url: "https://en.wikipedia.org/wiki/Joseph_Weizenbaum",
      },
    ],
  },
  {
    id: "kay-objects-messaging",
    stamp: "1967",
    sources: [
      {
        label: "Wikipedia, Object-oriented programming",
        url: "https://en.wikipedia.org/wiki/Object-oriented_programming",
      },
      { label: "Wikipedia, Alan Kay", url: "https://en.wikipedia.org/wiki/Alan_Kay" },
    ],
  },
  {
    id: "engelbart-royalties",
    stamp: "1968",
    sources: [
      {
        label: "Douglas Engelbart, English Wikipedia",
        url: "https://en.wikipedia.org/wiki/Douglas_Engelbart",
      },
    ],
  },
  {
    id: "lo",
    stamp: "1969.10.29",
    sources: [
      {
        label: "Leonard Kleinrock, The first message ever sent on the internet (UCLA)",
        url: "https://www.lk.cs.ucla.edu/internet_first_words.html",
      },
      {
        label: "ICANN, The First Message Transmission",
        url: "https://www.icann.org/en/blogs/details/the-first-message-transmission-29-10-2019-en",
      },
    ],
  },
  {
    id: "multics",
    stamp: "1965",
    sources: [
      {
        label: "Corbató & Saltzer, Multics — the first seven years (MIT)",
        url: "https://web.mit.edu/saltzer/www/publications/multics/M0130.pdf",
      },
      { label: "Multics History, multicians.org", url: "https://www.multicians.org/history.html" },
    ],
  },
  {
    id: "rfc1",
    stamp: "1969.04.07",
    sources: [
      {
        label: "RFC 1 — Host Software, S. Crocker",
        url: "https://www.rfc-editor.org/rfc/rfc1.html",
      },
      {
        label: "Internet Society, 46 Years of RFCs",
        url: "https://www.internetsociety.org/blog/2015/04/46-years-of-rfcs-celebrating-the-anniversary-of-rfc-1/",
      },
    ],
  },
  {
    id: "pdp7",
    stamp: "1969.08",
    sources: [
      {
        label: "Computerworld, Unix turns 40",
        url: "https://www.computerworld.com/article/1553843/unix-turns-40-the-past-present-and-future-of-a-revolutionary-os.html",
      },
      { label: "Ken Thompson, Wikipedia", url: "https://en.wikipedia.org/wiki/Ken_Thompson" },
    ],
  },
  {
    id: "alarm-1202",
    stamp: "1969.07.20",
    sources: [
      {
        label: "Don Eyles, Tales from the Lunar Module Guidance Computer (AAS, 2004)",
        url: "https://klabs.org/history/apollo_11_alarms/eyles_2004/eyles_2004.htm",
      },
      {
        label: "NASA Apollo 11 Lunar Surface Journal, Eyles on the alarms",
        url: "https://www.nasa.gov/history/alsj/a11/a11Eyles.html",
      },
    ],
  },
  {
    id: "mariner-1",
    stamp: "1962.07.22",
    sources: [
      {
        label: "Mariner 1, Wikipedia (NASA post-flight account)",
        url: "https://en.wikipedia.org/wiki/Mariner_1",
      },
      {
        label: "Vice, Sometimes a Typo Means You Need to Blow Up Your Own Spacecraft",
        url: "https://www.vice.com/en/article/sometimes-a-typo-means-you-need-to-blow-up-your-spacecraft/",
      },
    ],
  },
  {
    id: "mother-of-all-demos",
    stamp: "1968.12.09",
    sources: [
      {
        label: "DARPA, Mother of All Demos",
        url: "https://www.darpa.mil/about/innovation-timeline/mother-of-all-demos",
      },
      {
        label: "Smithsonian Lemelson Center",
        url: "https://invention.si.edu/invention-stories/mother-all-demos",
      },
    ],
  },
  {
    id: "conway",
    stamp: "1967",
    sources: [
      {
        label: "Melvin Conway, Conway's Law (author's own page)",
        url: "https://www.melconway.com/Home/Conways_Law.html",
      },
      { label: "Conway's law, Wikipedia", url: "https://en.wikipedia.org/wiki/Conway%27s_law" },
    ],
  },
  {
    id: "apollo-burn-baby-burn",
    stamp: "1969.07",
    sources: [
      {
        label: "chrislgarry/Apollo-11, Luminary099/BURN_BABY_BURN--MASTER_IGNITION_ROUTINE.agc",
        url: "https://github.com/chrislgarry/Apollo-11/blob/master/Luminary099/BURN_BABY_BURN--MASTER_IGNITION_ROUTINE.agc",
      },
      {
        label: "chrislgarry/Apollo-11 repository",
        url: "https://github.com/chrislgarry/Apollo-11",
      },
    ],
  },
  {
    id: "waterfall",
    stamp: "1970",
    sources: [
      {
        label: "David A. Wheeler, The Waterfall Model (quotes the 1970 paper)",
        url: "https://dwheeler.com/essays/waterfall.html",
      },
      {
        label: "PM World Journal, Applying 1970 Waterfall Lessons Learned",
        url: "https://pmworldlibrary.net/wp-content/uploads/2018/07/pmwj72-Jul2018-Morgan-applying-1970-waterfall-lessons-umd-paper.pdf",
      },
    ],
  },
  {
    id: "moth",
    stamp: "1947.09.09",
    sources: [
      {
        label: "Smithsonian NMAH, Log Book With Computer Bug",
        url: "https://americanhistory.si.edu/collections/object/nmah_334663",
      },
      {
        label: "JSTOR Daily, The Bug in the Computer Bug Story",
        url: "https://daily.jstor.org/the-bug-in-the-computer-bug-story/",
      },
    ],
  },
  {
    id: "intel-4004-busicom-rights-1971",
    stamp: "1971",
    sources: [{ label: "Wikipedia, Intel 4004", url: "https://en.wikipedia.org/wiki/Intel_4004" }],
  },
  {
    id: "pong-coin-overflow",
    stamp: "1972.08",
    sources: [{ label: "Wikipedia, Pong", url: "https://en.wikipedia.org/wiki/Pong" }],
  },
  {
    id: "wozniak-breakout-bonus",
    stamp: "1973",
    sources: [
      { label: "Wikipedia, Steve Wozniak", url: "https://en.wikipedia.org/wiki/Steve_Wozniak" },
    ],
  },
  {
    id: "unix-not-expected-to-understand",
    stamp: "1975",
    sources: [
      {
        label: 'Wikipedia, "You are not expected to understand this"',
        url: "https://en.wikipedia.org/wiki/You_are_not_expected_to_understand_this",
      },
    ],
  },
  {
    id: "vi-adm3a-keys",
    stamp: "1977",
    sources: [
      {
        label: "Wikipedia, Vi (text editor)",
        url: "https://en.wikipedia.org/wiki/Vi_(text_editor)",
      },
    ],
  },
  {
    id: "voyager-68-kilobits",
    stamp: "1977.09",
    sources: [
      { label: "Wikipedia, Voyager 1", url: "https://en.wikipedia.org/wiki/Voyager_1" },
      { label: "Wikipedia, Voyager program", url: "https://en.wikipedia.org/wiki/Voyager_program" },
    ],
  },
  {
    id: "kildall-flying",
    stamp: "1980",
    sources: [
      { label: "Wikipedia, Gary Kildall", url: "https://en.wikipedia.org/wiki/Gary_Kildall" },
    ],
  },
  {
    id: "trusting-trust",
    stamp: "1984",
    sources: [
      {
        label: "Ken Thompson, Reflections on Trusting Trust, CACM 27(8)",
        url: "https://dl.acm.org/doi/10.1145/358198.358210",
      },
      {
        label: "Turing Award lecture (PDF, CMU mirror)",
        url: "https://www.cs.cmu.edu/~rdriley/487/papers/Thompson_1984_ReflectionsonTrustingTrust.pdf",
      },
    ],
  },
  {
    id: "arm-one-person-company-1985",
    stamp: "1985",
    sources: [
      { label: "Wikipedia, Acorn Computers", url: "https://en.wikipedia.org/wiki/Acorn_Computers" },
      { label: "Wikipedia, Arm Holdings", url: "https://en.wikipedia.org/wiki/Arm_Holdings" },
    ],
  },
  {
    id: "copyleft-all-rights-reversed",
    stamp: "1985 · 1989",
    sources: [
      { label: "Wikipedia, Copyleft", url: "https://en.wikipedia.org/wiki/Copyleft" },
      {
        label: "Wikipedia, GNU General Public License",
        url: "https://en.wikipedia.org/wiki/GNU_General_Public_License",
      },
    ],
  },
  {
    id: "tetris-unpaid-decade",
    stamp: "1985 · 1996",
    sources: [
      { label: "Wikipedia, Tetris", url: "https://en.wikipedia.org/wiki/Tetris" },
      { label: "Wikipedia, Alexey Pajitnov", url: "https://en.wikipedia.org/wiki/Alexey_Pajitnov" },
    ],
  },
  {
    id: "euv-twenty-three-hours-2018",
    stamp: "1986 · 2018",
    sources: [
      {
        label: "Wikipedia, Extreme ultraviolet lithography",
        url: "https://en.wikipedia.org/wiki/Extreme_ultraviolet_lithography",
      },
    ],
  },
  {
    id: "tsmc-foundry-fifty-six-1987",
    stamp: "1987",
    sources: [
      { label: "Wikipedia, Morris Chang", url: "https://en.wikipedia.org/wiki/Morris_Chang" },
      { label: "Wikipedia, TSMC", url: "https://en.wikipedia.org/wiki/TSMC" },
    ],
  },
  {
    id: "huawei-diet-pills",
    stamp: "1987 · 1989",
    sources: [
      { label: "Wikipedia (zh), 华为", url: "https://zh.wikipedia.org/wiki/%E5%8D%8E%E4%B8%BA" },
    ],
  },
  {
    id: "gif-lzw-unisys",
    stamp: "1987 · 1994",
    sources: [{ label: "Wikipedia, GIF", url: "https://en.wikipedia.org/wiki/GIF" }],
  },
  {
    id: "morris",
    stamp: "1988.11.02",
    sources: [
      {
        label: "Spafford, The Internet Worm Program: An Analysis",
        url: "https://dl.acm.org/doi/10.1145/66093.66095",
      },
      { label: "Morris worm, Wikipedia", url: "https://en.wikipedia.org/wiki/Morris_worm" },
    ],
  },
  {
    id: "naur",
    stamp: "1985",
    sources: [
      {
        label: "Peter Naur, Programming as Theory Building (PDF)",
        url: "https://pages.cs.wisc.edu/~remzi/Naur.pdf",
      },
      {
        label: "Science of Computer Programming 5 (1985) 253–261",
        url: "https://www.sciencedirect.com/science/article/abs/pii/0165607485900328",
      },
    ],
  },
  {
    id: "mit-license-171-words",
    stamp: "1988 · 2025",
    sources: [
      { label: "Wikipedia, MIT License", url: "https://en.wikipedia.org/wiki/MIT_License" },
    ],
  },
  {
    id: "photoshop-display-origin",
    stamp: "1988 · 1995",
    sources: [
      { label: "Wikipedia, Adobe Photoshop", url: "https://en.wikipedia.org/wiki/Adobe_Photoshop" },
      { label: "Wikipedia, Thomas Knoll", url: "https://en.wikipedia.org/wiki/Thomas_Knoll" },
    ],
  },
  {
    id: "sosumi-so-sue-me",
    stamp: "1991",
    sources: [{ label: "Wikipedia — Sosumi", url: "https://en.wikipedia.org/wiki/Sosumi" }],
  },
  {
    id: "zimmermann-pgp-release",
    stamp: "1991 · 1996",
    sources: [
      { label: "Wikipedia, Phil Zimmermann", url: "https://en.wikipedia.org/wiki/Phil_Zimmermann" },
    ],
  },
  {
    id: "www-royalty-free",
    stamp: "1993.04.30",
    sources: [
      {
        label: "World Wide Web, English Wikipedia",
        url: "https://en.wikipedia.org/wiki/World_Wide_Web",
      },
    ],
  },
  {
    id: "doom-ftp-crash",
    stamp: "1993.12",
    sources: [
      {
        label: "Wikipedia, Doom (1993 video game)",
        url: "https://en.wikipedia.org/wiki/Doom_(1993_video_game)",
      },
    ],
  },
  {
    id: "zlib-two-authors",
    stamp: "1995",
    sources: [{ label: 'Wikipedia, "Zlib"', url: "https://en.wikipedia.org/wiki/Zlib" }],
  },
  {
    id: "byd-battery-to-car",
    stamp: "1995 · 2003",
    sources: [
      {
        label: "Wikipedia (zh), 比亚迪",
        url: "https://zh.wikipedia.org/wiki/%E6%AF%94%E4%BA%9A%E8%BF%AA",
      },
    ],
  },
  {
    id: "ariane-501",
    stamp: "1996.06.04",
    sources: [
      {
        label: "ESA, Ariane 501 — Presentation of Inquiry Board report",
        url: "https://www.esa.int/Newsroom/Press_Releases/Ariane_501_-_Presentation_of_Inquiry_Board_report",
      },
      {
        label: "Lions report, full text (MIT mirror)",
        url: "http://sunnyday.mit.edu/nasa-class/Ariane5-report.html",
      },
    ],
  },
  {
    id: "deep-blue-move-44-1997",
    stamp: "1997",
    sources: [
      {
        label: "Wikipedia, Deep Blue versus Garry Kasparov",
        url: "https://en.wikipedia.org/wiki/Deep_Blue_versus_Garry_Kasparov",
      },
    ],
  },
  {
    id: "curl-one-maintainer",
    stamp: "1998",
    sources: [
      { label: 'curl.se, "History of curl"', url: "https://curl.se/docs/history.html" },
      { label: 'curl.se, "Who uses curl?"', url: "https://curl.se/docs/companies.html" },
    ],
  },
  {
    id: "book-of-mozilla-verses",
    stamp: "1998.05",
    sources: [
      {
        label: 'Wikipedia, "The Book of Mozilla"',
        url: "https://en.wikipedia.org/wiki/The_Book_of_Mozilla",
      },
    ],
  },
  {
    id: "http-418-teapot",
    stamp: "1998.04",
    sources: [
      {
        label: "IETF, RFC 2324 — Hyper Text Coffee Pot Control Protocol",
        url: "https://www.rfc-editor.org/rfc/rfc2324",
      },
      {
        label:
          "IETF, RFC 7168 — The Hyper Text Coffee Pot Control Protocol for Tea Efflux Appliances",
        url: "https://www.rfc-editor.org/rfc/rfc7168",
      },
    ],
  },
  {
    id: "open-source-coined-1998",
    stamp: "1998.02",
    sources: [
      {
        label: "Wikipedia, Christine Peterson",
        url: "https://en.wikipedia.org/wiki/Christine_Peterson",
      },
      {
        label: "Wikipedia, Open Source Initiative",
        url: "https://en.wikipedia.org/wiki/Open_Source_Initiative",
      },
    ],
  },
  {
    id: "netscape-source-1998",
    stamp: "1998.01 · 1998.02",
    sources: [
      { label: "Wikipedia, Netscape", url: "https://en.wikipedia.org/wiki/Netscape" },
      { label: "Wikipedia, Mozilla", url: "https://en.wikipedia.org/wiki/Mozilla" },
    ],
  },
  {
    id: "bsd-75-acknowledgments",
    stamp: "1999.07",
    sources: [
      { label: "Wikipedia, BSD licenses", url: "https://en.wikipedia.org/wiki/BSD_licenses" },
    ],
  },
  {
    id: "red-hat-ipo-1999",
    stamp: "1999.08",
    sources: [{ label: "Wikipedia, Red Hat", url: "https://en.wikipedia.org/wiki/Red_Hat" }],
  },
  {
    id: "multics-shutdown",
    stamp: "2000.10.30",
    sources: [
      { label: "Multics, English Wikipedia", url: "https://en.wikipedia.org/wiki/Multics" },
    ],
  },
  {
    id: "sqlite-no-license",
    stamp: "2000",
    sources: [
      {
        label: 'SQLite, "Most Widely Deployed SQL Database Engine"',
        url: "https://www.sqlite.org/mostdeployed.html",
      },
      { label: 'SQLite, "Copyright"', url: "https://www.sqlite.org/copyright.html" },
    ],
  },
  {
    id: "smic-tsmc-lawsuit",
    stamp: "2000 · 2009",
    sources: [
      {
        label: "Wikipedia (zh), 中芯国际",
        url: "https://zh.wikipedia.org/wiki/%E4%B8%AD%E8%8A%AF%E5%9B%BD%E9%99%85",
      },
    ],
  },
  {
    id: "json-good-not-evil",
    stamp: "2001 · 2002",
    sources: [
      { label: "Wikipedia, JSON", url: "https://en.wikipedia.org/wiki/JSON" },
      { label: "JSON license", url: "https://www.json.org/license.html" },
    ],
  },
  {
    id: "sogou-movie-line",
    stamp: "2001 · 2004.08",
    sources: [
      { label: "Wikipedia, 搜狗", url: "https://zh.wikipedia.org/wiki/%E6%90%9C%E7%8B%97" },
      { label: "Wikipedia, 大腕", url: "https://zh.wikipedia.org/wiki/%E5%A4%A7%E8%85%95" },
    ],
  },
  {
    id: "api-mandate",
    stamp: "2002",
    sources: [
      {
        label: "Steve Yegge, Google Platforms Rant (archived gist)",
        url: "https://gist.github.com/chitchcock/1281611",
      },
      {
        label: "University of Washington CSE452 course copy",
        url: "https://courses.cs.washington.edu/courses/cse452/23wi/papers/yegge-platform-rant.html",
      },
    ],
  },
  {
    id: "hupu-rumours",
    stamp: "2004.01",
    sources: [
      { label: "虎扑,中文維基百科", url: "https://zh.wikipedia.org/wiki/%E8%99%8E%E6%89%91" },
    ],
  },
  {
    id: "jd-the-other-name",
    stamp: "2004",
    sources: [
      { label: "京東集團,中文維基百科", url: "https://zh.wikipedia.org/wiki/%E4%BA%AC%E4%B8%9C" },
    ],
  },
  {
    id: "douban-hutong",
    stamp: "2005.03.06",
    sources: [
      {
        label: "豆瓣網,中文維基百科",
        url: "https://zh.wikipedia.org/wiki/%E8%B1%86%E7%93%A3%E7%BD%91",
      },
    ],
  },
  {
    id: "git-information-manager-hell",
    stamp: "2005.04.07",
    sources: [
      {
        label: "git/git, commit e83c516",
        url: "https://github.com/git/git/commit/e83c5163316f89bfbde7d9ab23ca2e25604af290",
      },
      {
        label: "GitHub API, commit metadata",
        url: "https://api.github.com/repos/git/git/commits/e83c5163316f89bfbde7d9ab23ca2e25604af290",
      },
    ],
  },
  {
    id: "knuth-reward-check",
    stamp: "2005",
    sources: [
      {
        label: "Wikipedia — Knuth reward check",
        url: "https://en.wikipedia.org/wiki/Knuth_reward_check",
      },
    ],
  },
  {
    id: "dji-helicopter-first",
    stamp: "2006 · 2008",
    sources: [
      {
        label: "Wikipedia (zh), 大疆创新",
        url: "https://zh.wikipedia.org/wiki/%E5%A4%A7%E7%96%86%E5%88%9B%E6%96%B0",
      },
      {
        label: "Wikipedia (zh), 汪滔 (工程師)",
        url: "https://zh.wikipedia.org/wiki/%E6%B1%AA%E6%BB%94_(%E5%B7%A5%E7%A8%8B%E5%B8%AB)",
      },
    ],
  },
  {
    id: "dropbox-hn",
    stamp: "2007.04.04",
    sources: [
      {
        label: "Hacker News: My YC app: Dropbox — Throw away your USB drive",
        url: "https://news.ycombinator.com/item?id=8863",
      },
      {
        label: "Drew Houston on the thread, 2018",
        url: "https://news.ycombinator.com/item?id=16659180",
      },
    ],
  },
  {
    id: "butterfield",
    stamp: "2004 · 2013",
    sources: [
      {
        label: "Britannica, Stewart Butterfield",
        url: "https://www.britannica.com/money/Stewart-Butterfield",
      },
      {
        label: "Glitch (video game), Wikipedia",
        url: "https://en.wikipedia.org/wiki/Glitch_(video_game)",
      },
    ],
  },
  {
    id: "blockbuster",
    stamp: "2000",
    sources: [
      {
        label: "Inc., Blockbuster Could Have Bought Netflix for $50 Million",
        url: "https://www.inc.com/minda-zetlin/netflix-blockbuster-meeting-marc-randolph-reed-hastings-john-antioco.html",
      },
      {
        label: "Marc Randolph's account, Built In",
        url: "https://builtin.com/corporate-innovation/netflix-blockbuster-buyout",
      },
    ],
  },
  {
    id: "y2k",
    stamp: "2000.01.01",
    sources: [
      {
        label: "Year 2000 problem, Wikipedia (Gartner estimates)",
        url: "https://en.wikipedia.org/wiki/Year_2000_problem",
      },
      {
        label: "John Koskinen, What Happened to Y2K? (transcript, Jan 2000)",
        url: "https://co-intelligence.org/y2k_KoskinenJan2000.html",
      },
    ],
  },
  {
    id: "unsourced",
    stamp: "1953 · 1981",
    sources: [
      {
        label: "Quote Investigator, 640K Ought to be Enough",
        url: "https://quoteinvestigator.com/2011/09/08/640k-enough/",
      },
      {
        label: "Freakonomics, Did IBM Really See a World Market For About Five Computers?",
        url: "https://freakonomics.com/2008/04/our-daily-bleg-did-ibm-really-see-a-world-market-for-about-five-computers/",
      },
    ],
  },
  {
    id: "homebrew-volunteer-team",
    stamp: "2009",
    sources: [
      {
        label: 'Wikipedia, "Homebrew (package manager)"',
        url: "https://en.wikipedia.org/wiki/Homebrew_(package_manager)",
      },
    ],
  },
  {
    id: "tbl-double-slash",
    stamp: "2009.10",
    sources: [
      { label: "Wikipedia, URL", url: "https://en.wikipedia.org/wiki/URL" },
      { label: "Wikipedia, Tim Berners-Lee", url: "https://en.wikipedia.org/wiki/Tim_Berners-Lee" },
    ],
  },
  {
    id: "bilibili-mikufans",
    stamp: "2009.06 · 2010.01",
    sources: [
      {
        label: "Wikipedia, 哔哩哔哩",
        url: "https://zh.wikipedia.org/wiki/%E5%93%94%E5%93%A9%E5%93%94%E5%93%A9",
      },
    ],
  },
  {
    id: "xiaomi-software-first",
    stamp: "2010 · 2011",
    sources: [
      {
        label: "Wikipedia (zh), 小米集团",
        url: "https://zh.wikipedia.org/wiki/%E5%B0%8F%E7%B1%B3%E9%9B%86%E5%9B%A2",
      },
    ],
  },
  {
    id: "ritchie-same-week",
    stamp: "2011.10",
    sources: [
      { label: "Wikipedia, Dennis Ritchie", url: "https://en.wikipedia.org/wiki/Dennis_Ritchie" },
    ],
  },
  {
    id: "kuaishou-gif-app",
    stamp: "2011.03 · 2014",
    sources: [
      {
        label: "Wikipedia, 快手 (軟體)",
        url: "https://zh.wikipedia.org/wiki/%E5%BF%AB%E6%89%8B_(%E8%BB%9F%E9%AB%94)",
      },
    ],
  },
  {
    id: "zhihu-invite-only",
    stamp: "2011.01 · 2013.03",
    sources: [
      { label: "Wikipedia, 知乎", url: "https://zh.wikipedia.org/wiki/%E7%9F%A5%E4%B9%8E" },
    ],
  },
  {
    id: "leap-second",
    stamp: "2012.06.30",
    sources: [
      {
        label: "The Register, Leap second bug cripples Linux servers at airlines, Reddit, LinkedIn",
        url: "https://www.theregister.com/2012/07/02/leap_second_crashes_airlines/",
      },
      {
        label: "LKML, Fix for leapsecond caused hrtimer/futex issue",
        url: "https://lkml.iu.edu/hypermail/linux/kernel/1207.1/01403.html",
      },
    ],
  },
  {
    id: "gregorian-1752-eleven-days",
    stamp: "1752.09",
    sources: [
      {
        label: "IFLScience — The Calendar Riots: The Myth and Truth of Britain's Missing 11 Days",
        url: "https://www.iflscience.com/the-calendar-riots-the-myth-and-truth-of-britains-missing-11-days-75336",
      },
      {
        label: "Britannica — Did a Calendar Change Cause Riots in England?",
        url: "https://www.britannica.com/story/did-a-calendar-change-cause-riots-in-england",
      },
    ],
  },
  {
    id: "bootstrap-the-impossible-joke",
    stamp: "1785 · 1953",
    sources: [
      {
        label: "Boot: Computing Term Origins and Bootstrap History — World Wide Words",
        url: "https://www.worldwidewords.org/qa-boo2.htm",
      },
      { label: "Bootstrapping — Wikipedia", url: "https://en.wikipedia.org/wiki/Bootstrapping" },
    ],
  },
  {
    id: "french-revolutionary-decimal-time",
    stamp: "1793 · 1795.04",
    sources: [
      { label: "Wikipedia — Decimal time", url: "https://en.wikipedia.org/wiki/Decimal_time" },
    ],
  },
  {
    id: "railway-time-gwr",
    stamp: "1840.11 · 1880.08",
    sources: [
      { label: "Wikipedia — Railway time", url: "https://en.wikipedia.org/wiki/Railway_time" },
    ],
  },
  {
    id: "western-union-telephone-memo-1876",
    stamp: "1876",
    sources: [
      {
        label:
          "History of Phone Phreaking, \"The Greatest 'Bad Business Decision' Quotation That Never Was\"",
        url: "https://blog.historyofphonephreaking.org/2011/01/the-greatest-bad-business-decision-quotation-that-never-was.html",
      },
      {
        label: "Snopes-adjacent research via The Quotations Page (cross-referenced primary claim)",
        url: "https://www.quotationspage.com/quote/27283.html",
      },
    ],
  },
  {
    id: "nintendo-hanafuda-detours",
    stamp: "1889 · 1966",
    sources: [
      {
        label: 'Wikipedia, "History of Nintendo"',
        url: "https://en.wikipedia.org/wiki/History_of_Nintendo",
      },
      {
        label: 'MoneyWeek, "23 September 1889: Nintendo starts making playing cards"',
        url: "https://moneyweek.com/349214/23-september-1889-nintendo-starts-making-playing-cards",
      },
    ],
  },
  {
    id: "wrigley-premiums-premium",
    stamp: "1891 · 1892",
    sources: [
      {
        label: 'Encyclopedia.com, "William Wrigley Jr."',
        url: "https://www.encyclopedia.com/history/encyclopedias-almanacs-transcripts-and-maps/william-wrigley-jr",
      },
      {
        label: 'Britannica, "William Wrigley, Jr."',
        url: "https://www.britannica.com/money/William-Wrigley-Jr",
      },
    ],
  },
  {
    id: "robot-labor-not-brother",
    stamp: "1920",
    sources: [
      {
        label: "R.U.R. — Wikipedia (cites Čapek's Lidové noviny column)",
        url: "https://en.wikipedia.org/wiki/R.U.R.",
      },
      {
        label: "Science Diction: The Origin Of The Word 'Robot' — NPR",
        url: "https://www.npr.org/2011/04/22/135634400/science-diction-the-origin-of-the-word-robot",
      },
    ],
  },
  {
    id: "play-doh-wallpaper-cleaner",
    stamp: "1933 · 1956",
    sources: [
      { label: 'Wikipedia, "Play-Doh"', url: "https://en.wikipedia.org/wiki/Play-Doh" },
      {
        label: 'Smithsonian Magazine, "The Accidental Invention Of Play-Doh"',
        url: "https://www.smithsonianmag.com/innovation/accidental-invention-play-doh-180973527/",
      },
    ],
  },
  {
    id: "hedy-lamarr-frequency-hopping-patent",
    stamp: "1942.08",
    sources: [
      {
        label: "Military.com — Why the Navy Rejected Hedy Lamarr's Invention",
        url: "https://www.military.com/history/hedy-lamarrs-invention-changed-communications-heres-why-navy-rejected-it-during-wwii.html",
      },
      {
        label: "National Inventors Hall of Fame — Hedy Lamarr",
        url: "https://www.invent.org/inductees/hedy-lamarr",
      },
    ],
  },
  {
    id: "bush-1945-memex",
    stamp: "1945.07",
    sources: [
      {
        label: 'Vannevar Bush, "As We May Think," The Atlantic, July 1945',
        url: "https://liacs.leidenuniv.nl/~verbeekfj/courses/hci/memex-vbush.pdf",
      },
      {
        label: 'Wikipedia, "As We May Think" (publication history)',
        url: "https://en.wikipedia.org/wiki/As_We_May_Think",
      },
    ],
  },
  {
    id: "jean-bartik-eniac-dinner",
    stamp: "1946.02.14",
    sources: [
      {
        label: "Penn Today — ENIAC's Anniversary, a Nod to Its Female Computers",
        url: "https://penntoday.upenn.edu/news/eniacs-anniversary-nod-its-female-computers",
      },
      { label: "Jean Bartik, Wikipedia", url: "https://en.wikipedia.org/wiki/Jean_Bartik" },
    ],
  },
  {
    id: "claude-shannon-juggling-theorem",
    stamp: "1948 · 1980s",
    sources: [
      {
        label: "Shannon's Juggling Theorem, Humberto Ortiz-Zuazaga (UPRRP)",
        url: "https://ccom.uprrp.edu/~humberto/shannons-juggling-theorem.html",
      },
      {
        label: "American Scientist — Random Paths to Frequency Hopping (Bell Labs background)",
        url: "https://www.americanscientist.org/article/random-paths-to-frequency-hopping",
      },
    ],
  },
  {
    id: "mccarthy-1960-eval",
    stamp: "1960.04",
    sources: [
      {
        label:
          'McCarthy, "Recursive Functions of Symbolic Expressions and Their Computation by Machine, Part I"',
        url: "https://www-formal.stanford.edu/jmc/recursive.pdf",
      },
      {
        label: "MIT DSpace record of the 1960 CACM paper",
        url: "https://dspace.mit.edu/handle/1721.1/6096",
      },
    ],
  },
  {
    id: "licklider-1960-symbiosis",
    stamp: "1960.03",
    sources: [
      {
        label:
          'Licklider, "Man-Computer Symbiosis," IRE Transactions on Human Factors in Electronics, 1960',
        url: "https://ieeexplore.ieee.org/document/9357681",
      },
      {
        label: 'Wikipedia, "Man–Computer Symbiosis"',
        url: "https://en.wikipedia.org/wiki/Man%E2%80%93Computer_Symbiosis",
      },
    ],
  },
  {
    id: "ctss-1962-password-leak",
    stamp: "1962",
    sources: [
      {
        label: 'Slashdot, "How Allan Scherr Hacked Around the First Computer Password"',
        url: "https://it.slashdot.org/story/12/01/28/024220/how-allan-scherr-hacked-around-the-first-computer-password",
      },
      {
        label: 'Wikipedia, "Allan L. Scherr"',
        url: "https://en.wikipedia.org/wiki/Allan_L._Scherr",
      },
    ],
  },
  {
    id: "katherine-johnson-check-the-numbers",
    stamp: "1962.02",
    sources: [
      {
        label: "NASA — Katherine Johnson Biography",
        url: "https://www.nasa.gov/centers-and-facilities/langley/katherine-johnson-biography/",
      },
      {
        label: "IEEE Spectrum — Katherine Johnson, the Hidden Figures Mathematician",
        url: "https://spectrum.ieee.org/katherine-johnson-the-hidden-figures-mathematician-who-got-astronaut-john-glenn-into-space",
      },
    ],
  },
  {
    id: "daemon-backronym",
    stamp: "1963",
    sources: [
      {
        label: "The Origin of the Word Daemon — OSnews",
        url: "https://www.osnews.com/story/24884/the-origin-of-the-word-daemon/",
      },
      {
        label: "Maxwell's demon — Wikipedia",
        url: "https://en.wikipedia.org/wiki/Maxwell%27s_demon",
      },
    ],
  },
  {
    id: "sketchpad-1963",
    stamp: "1963.01",
    sources: [
      {
        label: 'Computer History Museum, "Ivan Sutherland Introduces the Sketchpad"',
        url: "https://www.computerhistory.org/tdih/January/7/",
      },
      {
        label:
          'Ivan Sutherland, "Sketchpad: A Man-Machine Graphical Communication System," MIT PhD thesis, 1963',
        url: "https://www.cl.cam.ac.uk/techreports/UCAM-CL-TR-574.pdf",
      },
    ],
  },
  {
    id: "douglas-mcilroy-garden-hose-pipe",
    stamp: "1964.10 · 1973",
    sources: [
      {
        label: "Metaphorex — McIlroy's Pipes Memo",
        url: "https://www.metaphorex.org/works/mcilroy-pipes-memo/",
      },
      {
        label: "Source Reader — Unix Pipes: Doug McIlroy & Ken Thompson",
        url: "https://sourcereader.org/lessons/pipes/",
      },
    ],
  },
  {
    id: "berkshire-hathaway-spite-buy",
    stamp: "1964 · 1985",
    sources: [
      {
        label: 'CNBC, "Warren Buffett: Buying Berkshire Hathaway Was $200 Billion Blunder"',
        url: "https://www.cnbc.com/2010/10/18/warren-buffett-buying-berkshire-hathaway-was-200-billion-blunder.html",
      },
      {
        label: 'Wikipedia, "Berkshire Hathaway"',
        url: "https://en.wikipedia.org/wiki/Berkshire_Hathaway",
      },
    ],
  },
  {
    id: "nelson-1965-hypertext",
    stamp: "1965",
    sources: [
      {
        label:
          'History of Information, "Ted Nelson Coins the Terms Hypertext, Hypermedia, and Hyperlink"',
        url: "https://www.historyofinformation.com/detail.php?id=830",
      },
      { label: 'Wikipedia, "Project Xanadu"', url: "https://en.wikipedia.org/wiki/Project_Xanadu" },
    ],
  },
  {
    id: "mary-allen-wilkes-linc",
    stamp: "1965",
    sources: [
      {
        label: "Make Tech Easier — Mary Allen Wilkes and the LINC",
        url: "https://maketecheasier.com/mte-in-1965-mary-allen-wilkes-wrote-lap6-for-the-linc-computer-from-her-parents-baltimore-home-testing-an-interactive-operating-system-on-a-250-pound-machine-in-the-living-room-and-becoming-the-fi/",
      },
      {
        label: "Mary Allen Wilkes, Wikipedia",
        url: "https://en.wikipedia.org/wiki/Mary_Allen_Wilkes",
      },
    ],
  },
  {
    id: "hoares-billion-dollar-mistake",
    stamp: "1965 · 2009",
    sources: [
      {
        label: 'InfoQ, "Null References: The Billion Dollar Mistake", Tony Hoare, QCon London 2009',
        url: "https://www.infoq.com/presentations/Null-References-The-Billion-Dollar-Mistake-Tony-Hoare/",
      },
      { label: 'Wikipedia, "ALGOL W"', url: "https://en.wikipedia.org/wiki/ALGOL_W" },
    ],
  },
  {
    id: "johnson-vs-cern-touchscreen",
    stamp: "1965 · 1972",
    sources: [
      {
        label: 'CERN Courier, "The first capacitative touch screens at CERN"',
        url: "https://cerncourier.com/a/the-first-capacitative-touch-screens-at-cern/",
      },
      { label: 'Wikipedia, "Touchscreen"', url: "https://en.wikipedia.org/wiki/Touchscreen" },
    ],
  },
  {
    id: "second-redefined-1967",
    stamp: "1967",
    sources: [
      {
        label:
          "NIST — A Historical Review of U.S. Contributions to the Atomic Definition of the SI Second",
        url: "https://www.nist.gov/publications/historical-review-u-s-contributions-atomic-definition-si-second",
      },
      {
        label: "BIPM — FAQ: redefinition of the second",
        url: "https://www.bipm.org/en/faq-redefinition-second",
      },
    ],
  },
  {
    id: "goto-statement-considered-harmful",
    stamp: "1968.03",
    sources: [
      {
        label: "Dijkstra, EWD1308 \"What led to 'Notes on Structured Programming'\"",
        url: "https://www.cs.utexas.edu/~EWD/transcriptions/EWD13xx/EWD1308.html",
      },
      {
        label: 'Wikipedia, "Go To Statement Considered Harmful"',
        url: "https://en.wikipedia.org/wiki/Go_To_Statement_Considered_Harmful",
      },
    ],
  },
  {
    id: "rollkugel-vs-mouse",
    stamp: "1968",
    sources: [
      { label: 'Wikipedia, "Computer mouse"', url: "https://en.wikipedia.org/wiki/Computer_mouse" },
      { label: 'Wikipedia, "Rollkugel"', url: "https://en.wikipedia.org/wiki/Rollkugel" },
    ],
  },
  {
    id: "peter-principle-verified",
    stamp: "1969 · 2019",
    sources: [
      {
        label: 'Wikipedia, "Peter principle"',
        url: "https://en.wikipedia.org/wiki/Peter_principle",
      },
      {
        label: 'NBER Working Paper 24343, Benson, Li, Shue, "Promotions and the Peter Principle"',
        url: "https://www.nber.org/papers/w24343",
      },
    ],
  },
  {
    id: "lanpar-vs-visicalc",
    stamp: "1969 · 1979",
    sources: [
      { label: 'Wikipedia, "LANPAR"', url: "https://en.wikipedia.org/wiki/LANPAR" },
      { label: 'Wikipedia, "Spreadsheet"', url: "https://en.wikipedia.org/wiki/Spreadsheet" },
    ],
  },
  {
    id: "spam-vikings-not-marketers",
    stamp: "1970 · 1994",
    sources: [
      { label: "Email spam — Wikipedia", url: "https://en.wikipedia.org/wiki/Email_spam" },
      {
        label: "Monty Python and spam — Brett Rutledge",
        url: "https://www.brettrutledge.com/commentary/monty-python-and-spam",
      },
    ],
  },
  {
    id: "codd-1970-relational-model",
    stamp: "1970.06",
    sources: [
      {
        label:
          'Codd, "A Relational Model of Data for Large Shared Data Banks," Communications of the ACM 13(6)',
        url: "https://dl.acm.org/doi/10.1145/362384.362685",
      },
      {
        label: 'IBM, "The relational database" history page',
        url: "https://www.ibm.com/history/relational-database",
      },
    ],
  },
  {
    id: "linnainmaa-backpropagation",
    stamp: "1970 · 1986",
    sources: [
      {
        label: 'Jürgen Schmidhuber, "Who Invented Backpropagation?"',
        url: "https://people.idsia.ch/~juergen/who-invented-backpropagation.html",
      },
      {
        label: 'Wikipedia, "Backpropagation"',
        url: "https://en.wikipedia.org/wiki/Backpropagation",
      },
    ],
  },
  {
    id: "at-sign-arbitrary-pick",
    stamp: "1971",
    sources: [
      {
        label: "Ray Tomlinson, Who Saved the '@' Symbol, Dies — TIME",
        url: "https://time.com/4249407/tomlinson-history-at-symbol/",
      },
    ],
  },
  {
    id: "parnas-module-decomposition",
    stamp: "1971 · 1972.12",
    sources: [
      {
        label:
          'The Morning Paper, "On the criteria to be used in decomposing systems into modules"',
        url: "https://blog.acolyer.org/2016/09/05/on-the-criteria-to-be-used-in-decomposing-systems-into-modules/",
      },
      {
        label:
          'D.L. Parnas, "On the Criteria To Be Used in Decomposing Systems into Modules", CACM 15(12), Dec. 1972',
        url: "https://www.researchgate.net/publication/200085877_On_the_Criteria_To_Be_Used_in_Decomposing_Systems_into_Modules",
      },
    ],
  },
  {
    id: "karen-sparck-jones-idf",
    stamp: "1972",
    sources: [
      {
        label: "The Spärck Jones / Robertson IDF page, City University London",
        url: "https://www.staff.city.ac.uk/~sbrp622/idf.html",
      },
      {
        label: "Karen Spärck Jones, Wikipedia",
        url: "https://en.wikipedia.org/wiki/Karen_Sp%C3%A4rck_Jones",
      },
    ],
  },
  {
    id: "cyclades-pouzin-tcpip",
    stamp: "1972 · 2004",
    sources: [{ label: 'Wikipedia, "CYCLADES"', url: "https://en.wikipedia.org/wiki/CYCLADES" }],
  },
  {
    id: "ethernet-1973-memo",
    stamp: "1973.05.22",
    sources: [
      {
        label: 'Computer History Museum, "Xerox Researcher Proposes Ethernet"',
        url: "https://www.computerhistory.org/tdih/may/22/",
      },
      {
        label: "DigiBarn Computer Museum, original Ethernet sketch",
        url: "https://digibarn.com/collections/diagrams/ethernet-original/",
      },
    ],
  },
  {
    id: "vint-cerf-envelope-sketch",
    stamp: "1973",
    sources: [
      {
        label: "Ability Magazine — Vint Cerf, Co-creator of the Internet and Email",
        url: "https://abilitymagazine.com/vint-cerf-co-creator-of-the-internet-and-email/",
      },
      { label: "Vint Cerf, Wikipedia", url: "https://en.wikipedia.org/wiki/Vint_Cerf" },
    ],
  },
  {
    id: "gchq-nonsecret-encryption",
    stamp: "1973 · 1976",
    sources: [
      {
        label: 'NSA, "Clifford Cocks, James Ellis, and Malcolm Williamson"',
        url: "https://www.nsa.gov/History/Cryptologic-History/Historical-Figures/Historical-Figures-View/Article/3006218/clifford-cocks-james-ellis-and-malcolm-williamson/",
      },
      {
        label: 'The Cipher Museum, "The GCHQ Trio — Ellis, Cocks, and Williamson"',
        url: "https://ciphermuseum.com/ciphers/gchq-trio.html",
      },
    ],
  },
  {
    id: "kodak-digital-camera-1975",
    stamp: "1975",
    sources: [
      {
        label: 'PetaPixel, "What Kodak Said About Digital Photography in 1975"',
        url: "https://petapixel.com/2017/09/21/kodak-said-digital-photography-1975/",
      },
      {
        label: 'Snopes, "Did Kodak Hide Invention of the Digital Camera in the \'70s"',
        url: "https://www.snopes.com/fact-check/eastman-kodak-invented-first-digital-camera/",
      },
    ],
  },
  {
    id: "galls-law-origin",
    stamp: "1975",
    sources: [
      { label: 'Wikipedia, "Systemantics"', url: "https://en.wikipedia.org/wiki/Systemantics" },
    ],
  },
  {
    id: "ken-olsen-home-computer-1977",
    stamp: "1977",
    sources: [
      {
        label:
          'Quote Investigator, "There is No Reason for Any Individual To Have a Computer in Their Home"',
        url: "https://quoteinvestigator.com/2017/09/14/home-computer/",
      },
    ],
  },
  {
    id: "kernighans-debugging-law",
    stamp: "1978",
    sources: [
      {
        label: 'Wikiquote, "Brian Kernighan"',
        url: "https://en.wikiquote.org/wiki/Brian_Kernighan",
      },
      {
        label: 'Wikipedia, "The Elements of Programming Style"',
        url: "https://en.wikipedia.org/wiki/The_Elements_of_Programming_Style",
      },
    ],
  },
  {
    id: "xerox-parc-1979-visit",
    stamp: "1979.12",
    sources: [
      {
        label: 'MakeUseOf, "The real story behind Jobs\' 1979 PARC visit"',
        url: "https://www.makeuseof.com/xerox-invented-the-future-in-1979-then-handed-it-to-a-24-year-old/",
      },
      {
        label: "Computer History Museum, Xerox PARC revolution exhibit",
        url: "https://www.computerhistory.org/revolution/input-output/14/348",
      },
    ],
  },
  {
    id: "visicalc-1979-no-patent",
    stamp: "1979",
    sources: [
      { label: 'Dan Bricklin, "Patenting VisiCalc"', url: "http://www.bricklin.com/patenting.htm" },
      { label: 'Wikipedia, "VisiCalc"', url: "https://en.wikipedia.org/wiki/VisiCalc" },
    ],
  },
  {
    id: "ibm-microsoft-dos-1980",
    stamp: "1980.11.06",
    sources: [
      {
        label: 'Computing History, "Microsoft signs contract with IBM to create MS-DOS"',
        url: "https://www.computinghistory.org.uk/det/6083/Microsoft-signs-contract-with-IBM-to-create-MS-DOS/",
      },
      {
        label: 'Truth on the Market, "The Ghosts of Antitrust Past: Part 2 (IBM)"',
        url: "https://truthonthemarket.com/2020/02/03/the-ghosts-of-antitrust-past-part-2-ibm/",
      },
    ],
  },
  {
    id: "postel-law-robustness-reversal",
    stamp: "1980 · 2023",
    sources: [
      {
        label: "RFC 761, DOD Standard Transmission Control Protocol, IETF RFC Editor",
        url: "https://www.rfc-editor.org/rfc/rfc761",
      },
      {
        label: "RFC 9413, Maintaining Robust Protocols, IAB / IETF RFC Editor",
        url: "https://www.rfc-editor.org/rfc/rfc9413",
      },
    ],
  },
  {
    id: "end-to-end-argument",
    stamp: "1981 · 1984",
    sources: [
      {
        label:
          'Saltzer, Reed & Clark, "End-to-End Arguments in System Design" (author\'s plaintext copy)',
        url: "https://web.mit.edu/Saltzer/www/publications/endtoend/endtoend.txt",
      },
      {
        label: "ACM Transactions on Computer Systems 2(4), Nov. 1984, DOI record",
        url: "https://dl.acm.org/doi/10.1145/357401.357402",
      },
    ],
  },
  {
    id: "excel-1900-leap-year",
    stamp: "1983 · 2026",
    sources: [
      {
        label: "Microsoft Learn — Excel incorrectly assumes 1900 is a leap year",
        url: "https://learn.microsoft.com/en-us/troubleshoot/microsoft-365-apps/excel/wrongly-assumes-1900-is-leap-year",
      },
    ],
  },
  {
    id: "avatar-before-snow-crash",
    stamp: "1985 · 1992",
    sources: [
      {
        label: "The Lessons of Lucasfilm's Habitat — Morningstar & Farmer, 1990",
        url: "https://www.crockford.com/ec/lessons.html",
      },
      {
        label: "On the Origins of Avatars — Bokardo",
        url: "http://bokardo.com/archives/on-the-origins-of-avatar/",
      },
    ],
  },
  {
    id: "radia-perlman-algorhyme",
    stamp: "1985",
    sources: [
      {
        label: "Interview with Radia Perlman, LACNIC Blog",
        url: "https://blog.lacnic.net/en/an-interview-with-internet-pioneer-radia-perlman/",
      },
      {
        label: "Algorhyme (poem text), etherealmind.com",
        url: "https://etherealmind.com/algorhyme-radia-perlman/",
      },
    ],
  },
  {
    id: "brooks-no-silver-bullet",
    stamp: "1986 · 1987",
    sources: [
      {
        label:
          'The Morning Paper, "No Silver Bullet – Essence and Accident in Software Engineering"',
        url: "https://blog.acolyer.org/2016/09/06/no-silver-bullet-essence-and-accident-in-software-engineering/",
      },
      {
        label: 'Wikipedia, "No Silver Bullet"',
        url: "https://en.wikipedia.org/wiki/No_Silver_Bullet",
      },
    ],
  },
  {
    id: "tz-olson-database",
    stamp: "1986 · 2011",
    sources: [
      { label: "Wikipedia — Tz database", url: "https://en.wikipedia.org/wiki/Tz_database" },
    ],
  },
  {
    id: "china-1987-first-email",
    stamp: "1987.09.20",
    sources: [
      {
        label: "中国第一封电子邮件, 北京日报/京报网",
        url: "https://news.bjd.com.cn/2025/09/14/11307655.shtml",
      },
      {
        label: "钱天白, 维基百科",
        url: "https://zh.wikipedia.org/zh-hans/%E9%92%B1%E5%A4%A9%E7%99%BD",
      },
    ],
  },
  {
    id: "barbara-liskov-substitution-property",
    stamp: "1987",
    sources: [
      {
        label: "Liskov substitution principle, Wikipedia",
        url: "https://en.wikipedia.org/wiki/Liskov_substitution_principle",
      },
      {
        label:
          'Barbara Liskov, "Data Abstraction and Hierarchy" (OOPSLA \'87 keynote, SIGPLAN Notices 23:5, 1988)',
        url: "https://www.cs.tufts.edu/~nr/cs257/archive/barbara-liskov/data-abstraction-and-hierarchy.pdf",
      },
    ],
  },
  {
    id: "go-corporation-pen-computing",
    stamp: "1987",
    sources: [
      { label: 'Wikipedia, "GO Corporation"', url: "https://en.wikipedia.org/wiki/GO_Corporation" },
      {
        label: 'Wikipedia, "iPad (1st generation)"',
        url: "https://en.wikipedia.org/wiki/IPad_(1st_generation)",
      },
    ],
  },
  {
    id: "iso8601-unify-then-fork",
    stamp: "1988 · 1997",
    sources: [
      { label: "ISO 8601, Wikipedia", url: "https://en.wikipedia.org/wiki/ISO_8601" },
      {
        label: "RFC 3339, Date and Time on the Internet: Timestamps, IETF RFC Editor",
        url: "https://www.rfc-editor.org/rfc/rfc3339",
      },
    ],
  },
  {
    id: "python-christmas-project",
    stamp: "1989.12",
    sources: [
      {
        label: 'Python Software Foundation, "General Python FAQ"',
        url: "https://docs.python.org/3/faq/general.html",
      },
      {
        label: 'Wikipedia, "Guido van Rossum"',
        url: "https://en.wikipedia.org/wiki/Guido_van_Rossum",
      },
    ],
  },
  {
    id: "worse-is-better",
    stamp: "1989 · 1991",
    sources: [
      {
        label: 'Richard P. Gabriel, dreamsongs.com, "Worse Is Better"',
        url: "https://dreamsongs.com/WorseIsBetter.html",
      },
    ],
  },
  {
    id: "rfc1149-avian-carriers-test",
    stamp: "1990.04.01 · 2001.04.28",
    sources: [
      {
        label:
          "RFC 1149, Standard for the Transmission of IP Datagrams on Avian Carriers, IETF Datatracker",
        url: "https://datatracker.ietf.org/doc/html/rfc1149",
      },
      {
        label: "IP over Avian Carriers, Wikipedia",
        url: "https://en.wikipedia.org/wiki/IP_over_Avian_Carriers",
      },
    ],
  },
  {
    id: "att-1990-break-statement",
    stamp: "1990.01.15",
    sources: [
      {
        label: 'California Polytechnic State University, "All Circuits are Busy Now" (case study)',
        url: "https://users.csc.calpoly.edu/~jdalbey/SWE/Papers/att_collapse",
      },
      {
        label: "TUM application note on the AT&T crash",
        url: "https://www5.in.tum.de/~huckle/attcrash1.htm",
      },
    ],
  },
  {
    id: "aspec-vs-musicam",
    stamp: "1990 · 1991",
    sources: [{ label: 'Wikipedia, "MP3"', url: "https://en.wikipedia.org/wiki/MP3" }],
  },
  {
    id: "linux-minix-post",
    stamp: "1991.08.25",
    sources: [
      {
        label: "Linus Torvalds, comp.os.minix Usenet post",
        url: "https://groups.google.com/g/comp.os.minix/c/dlNtH7RRrGA/m/SwRavCzVE7gJ",
      },
      {
        label: 'Wikipedia, "History of Linux"',
        url: "https://en.wikipedia.org/wiki/History_of_Linux",
      },
    ],
  },
  {
    id: "web-vs-gopher-1991",
    stamp: "1991 · 1993",
    sources: [
      {
        label: 'Wikipedia, "Gopher (protocol)"',
        url: "https://en.wikipedia.org/wiki/Gopher_(protocol)",
      },
      { label: 'Wikipedia, "World Wide Web"', url: "https://en.wikipedia.org/wiki/World_Wide_Web" },
    ],
  },
  {
    id: "rough-consensus-running-code",
    stamp: "1992.07",
    sources: [
      {
        label:
          'D.D. Clark, "A Cloudy Crystal Ball" plenary slides, 24th IETF, July 1992 — MIT CSAIL',
        url: "https://groups.csail.mit.edu/ana/People/DDC/future_ietf_92.pdf",
      },
      {
        label: '"Running code at IETF", APNIC Blog',
        url: "https://blog.apnic.net/2021/08/20/running-code-at-ietf/",
      },
    ],
  },
  {
    id: "han-unification-japanese-delegate",
    stamp: "1992",
    sources: [
      {
        label:
          '"Han Unification History", The Unicode Standard 16.0.0, Appendix E, Unicode Consortium',
        url: "https://www.unicode.org/versions/Unicode16.0.0/core-spec/appendix-e/",
      },
      { label: "Han unification, Wikipedia", url: "https://en.wikipedia.org/wiki/Han_unification" },
    ],
  },
  {
    id: "china-first-internet-line",
    stamp: "1993.03 · 1994.04.20",
    sources: [
      {
        label: "第一条国际计算机联网专线的开通, 中国科学院高能物理研究所",
        url: "https://www.ihep.cas.cn/kxcb/kpcg/jsywl/200909/t20090901_2461523.html",
      },
      {
        label: "共和国60周年：中国接入互联网, 中国新闻网",
        url: "https://www.chinanews.com.cn/special/guoqing/60/2009/06-25/122.shtml",
      },
    ],
  },
  {
    id: "wiki-the-airport-shuttle",
    stamp: "1994 · 1995",
    sources: [
      {
        label: "Wiki Wiki Shuttle — Wikipedia",
        url: "https://en.wikipedia.org/wiki/Wiki_Wiki_Shuttle",
      },
      {
        label: "History of wikis — Wikipedia",
        url: "https://en.wikipedia.org/wiki/History_of_wikis",
      },
    ],
  },
  {
    id: "robots-exclusion-rfc9309",
    stamp: "1994 · 2022.09",
    sources: [
      {
        label: "RFC 9309, Robots Exclusion Protocol, IETF Datatracker",
        url: "https://datatracker.ietf.org/doc/html/rfc9309",
      },
      {
        label:
          '"RFC 9309: Robots.txt Is Now an Official IETF Internet Standard", Search Engine World',
        url: "https://www.searchengineworld.com/rfc9309-robots-txt-quietly-became-an-official-internet-standard",
      },
    ],
  },
  {
    id: "pentium-fdiv-writeoff",
    stamp: "1994.10.19",
    sources: [
      {
        label: "Wikipedia, Pentium FDIV bug",
        url: "https://en.wikipedia.org/wiki/Pentium_FDIV_bug",
      },
    ],
  },
  {
    id: "general-magic-private-network",
    stamp: "1994.09",
    sources: [
      {
        label: 'Commoncog, "General Magic: The Future, Too Early"',
        url: "https://commoncog.com/c/cases/general-magic/",
      },
      { label: 'Wikipedia, "General Magic"', url: "https://en.wikipedia.org/wiki/General_Magic" },
    ],
  },
  {
    id: "ibm-simon-first-touchscreen",
    stamp: "1994.08",
    sources: [
      { label: 'Wikipedia, "IBM Simon"', url: "https://en.wikipedia.org/wiki/Simon_(phone)" },
      {
        label: 'Wikipedia, "iPhone (1st generation)"',
        url: "https://en.wikipedia.org/wiki/IPhone_(1st_generation)",
      },
    ],
  },
  {
    id: "cors-same-origin-orphaned",
    stamp: "1995 · 2014 · 2020",
    sources: [
      {
        label: "Cross-Origin Resource Sharing, W3C Recommendation, 16 January 2014",
        url: "https://www.w3.org/TR/2014/REC-cors-20140116/",
      },
      {
        label: "Cross-Origin Resource Sharing publication history, W3C Standards",
        url: "https://www.w3.org/standards/history/cors.html",
      },
    ],
  },
  {
    id: "php-resume-counter",
    stamp: "1995.06",
    sources: [
      {
        label: 'PHP Manual, "History of PHP"',
        url: "https://www.php.net/manual/en/history.php.php",
      },
      { label: 'Wikipedia, "PHP"', url: "https://en.wikipedia.org/wiki/PHP" },
    ],
  },
  {
    id: "craigslist-email-list",
    stamp: "1995",
    sources: [
      { label: 'Wikipedia, "Craigslist"', url: "https://en.wikipedia.org/wiki/Craigslist" },
      { label: 'Wikipedia, "Craig Newmark"', url: "https://en.wikipedia.org/wiki/Craig_Newmark" },
    ],
  },
  {
    id: "wirths-law-misattributed",
    stamp: "1995",
    sources: [
      { label: 'Wikipedia, "Wirth\'s law"', url: "https://en.wikipedia.org/wiki/Wirth%27s_law" },
    ],
  },
  {
    id: "general-magic-weekend-site",
    stamp: "1995",
    sources: [
      { label: 'Wikipedia, "Pierre Omidyar"', url: "https://en.wikipedia.org/wiki/Pierre_Omidyar" },
      { label: 'Wikipedia, "eBay"', url: "https://en.wikipedia.org/wiki/EBay" },
    ],
  },
  {
    id: "gettickcount-776-day-bug",
    stamp: "1995 · 2025",
    sources: [
      {
        label: "Microsoft Learn — GetTickCount resets to zero after approximately 776 days",
        url: "https://learn.microsoft.com/en-us/troubleshoot/windows/win32/gettickcount-resets-zero-after-approximately-776-days",
      },
    ],
  },
  {
    id: "bluetooth-the-placeholder",
    stamp: "1996",
    sources: [
      {
        label: "Origin of the name — Bluetooth SIG (official)",
        url: "https://www.bluetooth.com/about-us/bluetooth-origin/",
      },
    ],
  },
  {
    id: "chinaren-detour",
    stamp: "1996 · 2004",
    sources: [
      {
        label: "IOI Statistics, 1996 results",
        url: "https://stats.ioinformatics.org/results/1996",
      },
      {
        label: "Wikipedia (zh),「王小川」",
        url: "https://zh.wikipedia.org/wiki/%E7%8E%8B%E5%B0%8F%E5%B7%9D",
      },
    ],
  },
  {
    id: "google-a-typo",
    stamp: "1997.09.15",
    sources: [
      {
        label: 'Origin of the name "Google" — Stanford (David Koller)',
        url: "https://graphics.stanford.edu/~dk/google_name_origin.html",
      },
    ],
  },
  {
    id: "rfc2119-must-should",
    stamp: "1997.03 · 2017",
    sources: [
      {
        label:
          "RFC 2119, Key words for use in RFCs to Indicate Requirement Levels, IETF RFC Editor",
        url: "https://www.rfc-editor.org/rfc/rfc2119",
      },
      {
        label:
          "RFC 8174, Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words, IETF RFC Editor",
        url: "https://www.rfc-editor.org/rfc/rfc8174",
      },
    ],
  },
  {
    id: "netease-license-mail-1997",
    stamp: "1997.06",
    sources: [
      {
        label: "Wikipedia, 网易公司",
        url: "https://zh.wikipedia.org/wiki/%E7%BD%91%E6%98%93%E5%85%AC%E5%8F%B8",
      },
    ],
  },
  {
    id: "lixiang-graphics-card-home",
    stamp: "1998.06",
    sources: [
      {
        label: "Wikipedia, 李想 (企業家)",
        url: "https://zh.wikipedia.org/wiki/%E6%9D%8E%E6%83%B3_(%E4%BC%81%E4%B8%9A%E5%AE%B6)",
      },
    ],
  },
  {
    id: "china-oicq-to-qq",
    stamp: "1999.02 · 2000.11",
    sources: [
      { label: "Tencent QQ, Wikipedia", url: "https://en.wikipedia.org/wiki/Tencent_QQ" },
      { label: "QQ是怎么来的, 网易", url: "https://www.163.com/dy/article/EPF3DA1F0511V6CK.html" },
    ],
  },
  {
    id: "excite-google-1999",
    stamp: "1999",
    sources: [
      {
        label: "Internet History Podcast, interview with George Bell",
        url: "https://www.internethistorypodcast.com/2014/11/the-real-reason-excite-turned-down-buying-google-for-750000-in-1999/",
      },
      {
        label: 'TechCrunch, "When Google Wanted To Sell To Excite For Under $1 Million"',
        url: "https://techcrunch.com/2010/09/29/google-excite/",
      },
    ],
  },
  {
    id: "mars-climate-orbiter-units",
    stamp: "1999.09.23",
    sources: [
      {
        label: "NASA Mars Climate Orbiter Mishap Investigation Board, Phase I Report",
        url: "https://llis.nasa.gov/llis_lib/pdf/1009464main1_0641-mr.pdf",
      },
      {
        label: "Wikipedia, Mars Climate Orbiter",
        url: "https://en.wikipedia.org/wiki/Mars_Climate_Orbiter",
      },
    ],
  },
  {
    id: "paypal-palm-beaming",
    stamp: "1999",
    sources: [
      {
        label: 'Commoncog, "PayPal: The Beamers Didn\'t Come"',
        url: "https://commoncog.com/c/cases/paypal-idea-maze/",
      },
      {
        label: 'Slashdot, "Beaming Money" (July 27, 1999)',
        url: "https://slashdot.org/story/99/07/27/1754207/beaming-money",
      },
    ],
  },
  {
    id: "cai-500-yuan",
    stamp: "1999",
    sources: [
      {
        label: "快科技,《蔡崇信回忆加入阿里：放弃百万年薪拿500块工资》",
        url: "https://news.mydrivers.com/1/1103/1103727.htm",
      },
      {
        label: "新浪财经,《蔡崇信详解阿里往事》",
        url: "https://finance.sina.cn/stock/jdts/2026-02-11/detail-inhmkixz5215932.d.html",
      },
    ],
  },
  {
    id: "gps-week-rollover",
    stamp: "1999.08 · 2019.04",
    sources: [
      {
        label: "GPS.gov — GPS Week Number Rollover",
        url: "https://www.gps.gov/news/gps-week-number-rollover",
      },
    ],
  },
  {
    id: "foxmail-resold",
    stamp: "2000 · 2005",
    sources: [
      {
        label: "Wikipedia (zh),「张小龙」",
        url: "https://zh.wikipedia.org/wiki/%E5%BC%A0%E5%B0%8F%E9%BE%99",
      },
    ],
  },
  {
    id: "danger-duarte-android-reunion",
    stamp: "2000 · 2010",
    sources: [
      {
        label: 'Wikipedia, "Danger (company)"',
        url: "https://en.wikipedia.org/wiki/Danger_(company)",
      },
      { label: 'Wikipedia, "Matias Duarte"', url: "https://en.wikipedia.org/wiki/Matias_Duarte" },
    ],
  },
  {
    id: "slashdot-ipod-2001",
    stamp: "2001.10.23",
    sources: [
      {
        label: 'Slashdot, "Apple Releases iPod" (original thread and editor\'s comment)',
        url: "https://slashdot.org/story/01/10/23/1816257/apple-releases-ipod",
      },
    ],
  },
  {
    id: "discuz-shenyang-dorm",
    stamp: "2001.06",
    sources: [{ label: "Wikipedia, Discuz!", url: "https://zh.wikipedia.org/wiki/Discuz!" }],
  },
  {
    id: "wikipedia-side-wiki",
    stamp: "2001.01.10",
    sources: [
      {
        label: 'Wikipedia, "History of Wikipedia"',
        url: "https://en.wikipedia.org/wiki/History_of_Wikipedia",
      },
      { label: 'Wikipedia, "Wikipedia"', url: "https://en.wikipedia.org/wiki/Wikipedia" },
    ],
  },
  {
    id: "bittorrent-mailing-list",
    stamp: "2001.07.02",
    sources: [
      { label: 'Wikipedia, "BitTorrent"', url: "https://en.wikipedia.org/wiki/BitTorrent" },
      { label: 'Wikipedia, "Bram Cohen"', url: "https://en.wikipedia.org/wiki/Bram_Cohen" },
    ],
  },
  {
    id: "webvan-thirty-minute-window",
    stamp: "2001.07",
    sources: [
      { label: 'Wikipedia, "Webvan"', url: "https://en.wikipedia.org/wiki/Webvan" },
      {
        label: 'Forbes, "Webvan And Other IPO Epic Failures"',
        url: "https://www.forbes.com/sites/greatspeculations/2010/12/13/the-biggest-ipo-flops/",
      },
    ],
  },
  {
    id: "kozmo-free-hour-delivery",
    stamp: "2001.04",
    sources: [
      { label: 'Wikipedia, "Kozmo.com"', url: "https://en.wikipedia.org/wiki/Kozmo.com" },
      { label: 'Wikipedia, "DoorDash"', url: "https://en.wikipedia.org/wiki/DoorDash" },
    ],
  },
  {
    id: "flooz-digital-currency",
    stamp: "2001.08",
    sources: [
      { label: 'Wikipedia, "Flooz.com"', url: "https://en.wikipedia.org/wiki/Flooz.com" },
      { label: 'Wikipedia, "Bitcoin"', url: "https://en.wikipedia.org/wiki/Bitcoin" },
    ],
  },
  {
    id: "yahoo-google-2002",
    stamp: "2002",
    sources: [
      {
        label: "Wired, on Terry Semel's Yahoo acquisition talks with Google",
        url: "https://www.wired.com/2009/12/fail-yahoo-microsoft/",
      },
      {
        label:
          'Fortune, "Dumb iPhone predictions: A look back" (context roundup, cross-checked against Yahoo coverage)',
        url: "https://fortune.com/2008/10/22/dumb-iphone-predictions-a-look-back",
      },
    ],
  },
  {
    id: "pplive-dorm-2002",
    stamp: "2002.06",
    sources: [
      { label: "Wikipedia, PP视频", url: "https://zh.wikipedia.org/wiki/PP%E8%A7%86%E9%A2%91" },
    ],
  },
  {
    id: "china-alipay-escrow",
    stamp: "2003.10",
    sources: [
      { label: "支付宝的“长征”, 人人都是产品经理", url: "https://www.woshipm.com/it/4101109.html" },
      {
        label: "支付宝, 维基百科",
        url: "https://zh.wikipedia.org/wiki/%E6%94%AF%E4%BB%98%E5%AE%9D",
      },
    ],
  },
  {
    id: "china-taobao-free-vs-ebay",
    stamp: "2003.05 · 2006",
    sources: [
      { label: "易趣消亡史, 经济观察网", url: "http://m.eeo.com.cn/2022/0729/545987.shtml" },
      { label: "易趣不复返, 品玩", url: "https://www.pingwest.com/a/267841" },
    ],
  },
  {
    id: "dianping-zagat-notes",
    stamp: "2003.04",
    sources: [
      {
        label: "Wikipedia, 大众点评",
        url: "https://zh.wikipedia.org/wiki/%E5%A4%A7%E4%BC%97%E7%82%B9%E8%AF%84",
      },
    ],
  },
  {
    id: "wordpress-b2-post",
    stamp: "2003.01",
    sources: [
      {
        label: 'Matt Mullenweg, "The Blogging Software Dilemma"',
        url: "https://ma.tt/2003/01/the-blogging-software-dilemma/",
      },
      { label: 'Wikipedia, "WordPress"', url: "https://en.wikipedia.org/wiki/WordPress" },
    ],
  },
  {
    id: "2003-blackout-race-condition",
    stamp: "2003.08.14",
    sources: [
      {
        label: 'The Register, "Tracking the Blackout bug"',
        url: "https://www.theregister.com/2004/04/08/blackout_bug_report/",
      },
      {
        label:
          "U.S.-Canada Power System Outage Task Force, Final Report on the August 14, 2003 Blackout",
        url: "https://www.energy.gov/sites/prod/files/oeprod/DocumentsandMedia/BlackoutFinal-Web.pdf",
      },
    ],
  },
  {
    id: "aws-not-leftover-servers",
    stamp: "2003 · 2006",
    sources: [
      {
        label: 'Benjamin Black, "EC2 Origins"',
        url: "https://blog.b3k.us/2009/01/25/ec2-origins.html",
      },
      {
        label: "Network World, \"The myth about how Amazon's web service started just won't die\"",
        url: "https://www.networkworld.com/article/936248/the-myth-about-how-amazon-s-web-service-started-just-won-t-die.html",
      },
    ],
  },
  {
    id: "maps-intern-friendfeed",
    stamp: "2003 · 2009",
    sources: [
      { label: 'Wikipedia, "Bret Taylor"', url: "https://en.wikipedia.org/wiki/Bret_Taylor" },
      { label: 'Wikipedia, "FriendFeed"', url: "https://en.wikipedia.org/wiki/FriendFeed" },
    ],
  },
  {
    id: "friendster-forty-second-load",
    stamp: "2003",
    sources: [
      {
        label: 'High Scalability, "Friendster Lost Lead Because of a Failure to Scale"',
        url: "https://highscalability.com/friendster-lost-lead-because-of-a-failure-to-scale/",
      },
      { label: 'Wikipedia, "Friendster"', url: "https://en.wikipedia.org/wiki/Friendster" },
    ],
  },
  {
    id: "shopify-snowdevil-software",
    stamp: "2004 · 2006",
    sources: [
      { label: 'Wikipedia, "Shopify"', url: "https://en.wikipedia.org/wiki/Shopify" },
      {
        label: 'NPR, "Shopify: Tobias Lütke"',
        url: "https://www.npr.org/2019/08/02/747660923/shopify-tobias-l-tke",
      },
    ],
  },
  {
    id: "twitter-odeo-podcast-pivot",
    stamp: "2005 · 2006",
    sources: [
      {
        label: 'Apple Newsroom, "Apple Takes Podcasting Mainstream" (June 28, 2005)',
        url: "https://www.apple.com/newsroom/2005/06/28Apple-Takes-Podcasting-Mainstream/",
      },
      { label: 'Wikipedia, "Twitter"', url: "https://en.wikipedia.org/wiki/Twitter" },
    ],
  },
  {
    id: "youtube-tune-in-hook-up",
    stamp: "2005",
    sources: [
      { label: 'Wikipedia, "YouTube"', url: "https://en.wikipedia.org/wiki/YouTube" },
      { label: 'Wikipedia, "Jawed Karim"', url: "https://en.wikipedia.org/wiki/Jawed_Karim" },
    ],
  },
  {
    id: "duan-buffett-lunch",
    stamp: "2006",
    sources: [
      {
        label: "品玩,《不是拼多多不行，是段永平不够用了》",
        url: "https://www.pingwest.com/a/229100",
      },
      {
        label: "知乎,《浙大校友段永平与中国新晋首富拼多多黄峥的因缘际会》",
        url: "https://zhuanlan.zhihu.com/p/16538514102",
      },
    ],
  },
  {
    id: "blackberry-iphone-2007",
    stamp: "2007.01",
    sources: [
      {
        label: 'Forbes, excerpt reporting on "Losing the Signal" by McNish and Silcoff',
        url: "https://www.forbes.com/sites/parmyolson/2015/05/26/blackberry-iphone-book/",
      },
    ],
  },
  {
    id: "dvorak-iphone-2007",
    stamp: "2007.03.28",
    sources: [
      {
        label: 'MarketWatch (archived), "Apple should pull the plug on the iPhone"',
        url: "https://web.archive.org/web/20090605161036/https://www.marketwatch.com/story/apple-should-pull-the-plug-on-the-iphone",
      },
      {
        label: "Network World, \"Wrong? Dvorak blames his 'getting screwed over' by Apple\"",
        url: "https://www.networkworld.com/article/741894/wireless-wrong-dvorak-blames-his-getting-screwed-over-by-apple.html",
      },
    ],
  },
  {
    id: "auctomatic-taggar-yc",
    stamp: "2007 · 2010",
    sources: [
      {
        label: 'Wikipedia, "Patrick Collison"',
        url: "https://en.wikipedia.org/wiki/Patrick_Collison",
      },
      { label: 'Wikipedia, "Harj Taggar"', url: "https://en.wikipedia.org/wiki/Harj_Taggar" },
    ],
  },
  {
    id: "justintv-backpack-cruise",
    stamp: "2007 · 2016",
    sources: [
      { label: 'Wikipedia, "Justin.tv"', url: "https://en.wikipedia.org/wiki/Justin.tv" },
      { label: 'Wikipedia, "Kyle Vogt"', url: "https://en.wikipedia.org/wiki/Kyle_Vogt" },
    ],
  },
  {
    id: "stackoverflow-blog-post",
    stamp: "2008.04.16",
    sources: [
      {
        label: 'Jeff Atwood, "Introducing Stackoverflow.com", Coding Horror',
        url: "https://blog.codinghorror.com/introducing-stackoverflow-com/",
      },
      { label: 'Wikipedia, "Stack Overflow"', url: "https://en.wikipedia.org/wiki/Stack_Overflow" },
    ],
  },
  {
    id: "zune-leap-year-freeze",
    stamp: "2008.12.31",
    sources: [
      { label: "Wikipedia — Zune Meltdown", url: "https://en.wikipedia.org/wiki/Zune_Meltdown" },
    ],
  },
  {
    id: "china-wang-jian-alibaba-cloud",
    stamp: "2009 · 2012 · 2020",
    sources: [
      {
        label: "从“骗子”王坚到行癫张建锋，阿里云终上岸, 搜狐",
        url: "https://www.sohu.com/a/448563477_335896",
      },
      { label: "阿里出了个院士叫王坚, 虎嗅", url: "https://m.huxiu.com/article/327675.html" },
    ],
  },
  {
    id: "taobao-double11-2009",
    stamp: "2009.11",
    sources: [
      {
        label: "Wikipedia, 双十一购物节",
        url: "https://zh.wikipedia.org/wiki/%E5%8F%8C%E5%8D%81%E4%B8%80%E8%B4%AD%E7%89%A9%E8%8A%82",
      },
      { label: "Wikipedia, Singles' Day", url: "https://en.wikipedia.org/wiki/Singles%27_Day" },
    ],
  },
  {
    id: "cloudflare-hbs-elective",
    stamp: "2009",
    sources: [
      { label: 'Cloudflare, "Our Story"', url: "https://www.cloudflare.com/our-story/" },
      {
        label:
          'Forbes, "The Story Behind The Canadian Immigrant Who Helped CloudFlare Succeed In America"',
        url: "https://www.forbes.com/sites/stuartanderson/2016/03/23/the-story-behind-the-canadian-immigrant-who-helped-cloudflare-succeed-in-america/",
      },
    ],
  },
  {
    id: "china-3q-war",
    stamp: "2010.11.03",
    sources: [
      {
        label: "马化腾与周鸿祎握手背后：被遗忘的3Q大战, 腾讯新闻",
        url: "https://news.qq.com/rain/a/20240422A05U0300",
      },
      {
        label: "腾讯360之争, 百度百科",
        url: "https://baike.baidu.com/item/%E8%85%BE%E8%AE%AF360%E4%B9%8B%E4%BA%89/7181338",
      },
    ],
  },
  {
    id: "china-thousand-groupon-war",
    stamp: "2010 · 2011.08 · 2014",
    sources: [
      {
        label: "千团大战, 百度百科",
        url: "https://baike.baidu.com/item/%E5%8D%83%E5%9B%A2%E5%A4%A7%E6%88%98/6873063",
      },
      {
        label: "团购网站从5000家锐减至176家, 新浪博客",
        url: "https://blog.sina.com.cn/s/blog_12e1b22420102v4w2.html",
      },
    ],
  },
  {
    id: "semver-dependency-hell",
    stamp: "2010",
    sources: [
      {
        label: "Semantic Versioning 1.0.0 spec, semver.org",
        url: "https://semver.org/spec/v1.0.0.html",
      },
      { label: "Semantic Versioning, Devopedia", url: "https://devopedia.org/semantic-versioning" },
    ],
  },
  {
    id: "instagram-burbn-cut",
    stamp: "2010",
    sources: [
      {
        label: 'TechCrunch, "A Pivotal Pivot" (Nov 8, 2010)',
        url: "https://techcrunch.com/2010/11/08/instagram-a-pivotal-pivot/",
      },
    ],
  },
  {
    id: "tz-database-lawsuit",
    stamp: "2011.10 · 2012.02",
    sources: [
      {
        label: '"ICANN rescues time zone database", The Register',
        url: "https://www.theregister.com/2011/10/16/icann_rescues_time_zone_database/",
      },
      {
        label: '"Tz Database lawsuit dismissed", Neowin',
        url: "https://www.neowin.net/news/tz-database-lawsuit-dismissed-no-copyright-for-the-rising-sun-yet/",
      },
    ],
  },
  {
    id: "instagram-facebook-2012",
    stamp: "2012.04",
    sources: [
      {
        label:
          "Forbes, \"Jon Stewart On Facebook's Billion Dollar Instagram Purchase: 'Really Lame'\"",
        url: "https://www.forbes.com/sites/erikkain/2012/04/11/jon-stewart-on-facebooks-billion-dollar-instagram-purchase-really-lame",
      },
      {
        label: 'Fortune, "Instagram deal now worth $948 million"',
        url: "https://fortune.com/2012/05/30/instagram-deal-now-worth-948-million",
      },
    ],
  },
  {
    id: "didi-alibaba-resignation",
    stamp: "2012.06",
    sources: [
      { label: "Wikipedia, Didi Chuxing", url: "https://en.wikipedia.org/wiki/Didi_Chuxing" },
      { label: "Wikipedia, 程维", url: "https://zh.wikipedia.org/wiki/%E7%A8%8B%E7%BB%B4" },
    ],
  },
  {
    id: "knight-capital-power-peg",
    stamp: "2012.08.01",
    sources: [
      {
        label: "SEC Order In the Matter of Knight Capital Americas LLC (Release No. 70694)",
        url: "https://www.sec.gov/files/litigation/admin/2013/34-70694.pdf",
      },
    ],
  },
  {
    id: "dnnresearch-week-of-bidding",
    stamp: "2012",
    sources: [
      {
        label: 'TIME, "Geoffrey Hinton" (TIME100 AI)',
        url: "https://time.com/collections/time100-ai/6309026/geoffrey-hinton/",
      },
      { label: 'Wikipedia, "AlexNet"', url: "https://en.wikipedia.org/wiki/AlexNet" },
    ],
  },
  {
    id: "xiaohongshu-name",
    stamp: "2013.10",
    sources: [
      {
        label: "小紅書,中文維基百科",
        url: "https://zh.wikipedia.org/wiki/%E5%B0%8F%E7%B4%85%E6%9B%B8",
      },
      { label: "Xiaohongshu, English Wikipedia", url: "https://en.wikipedia.org/wiki/Xiaohongshu" },
    ],
  },
  {
    id: "china-wechat-red-envelope-pearl-harbor",
    stamp: "2014.01-02",
    sources: [
      {
        label: "马云：微信抢红包是“珍珠港偷袭”, 每经网",
        url: "https://www.nbd.com.cn/articles/2014-02-06/807037.html",
      },
      {
        label: "微信红包“线上偷袭”始末, 人民网",
        url: "http://tc.people.com.cn/n/2014/0213/c183175-24345940.html",
      },
    ],
  },
  {
    id: "heartbleed-two-person-team",
    stamp: "2014.04.07",
    sources: [
      {
        label: "Heartbleed.com, official bug information site (Codenomicon)",
        url: "https://heartbleed.com/",
      },
    ],
  },
  {
    id: "goto-fail-duplicate",
    stamp: "2014.02",
    sources: [
      {
        label: "Adam Langley, imperialviolet.org — Apple's SSL/TLS bug",
        url: "https://www.imperialviolet.org/2014/02/22/applebug.html",
      },
      {
        label: "Wikipedia — Transport Layer Security",
        url: "https://en.wikipedia.org/wiki/Transport_Layer_Security",
      },
    ],
  },
  {
    id: "ntp-harlan-stenn",
    stamp: "2015.03",
    sources: [
      {
        label: 'Wikipedia, "Network Time Protocol"',
        url: "https://en.wikipedia.org/wiki/Network_Time_Protocol",
      },
      { label: "Network Time Foundation, nwtime.org", url: "https://www.nwtime.org/" },
    ],
  },
  {
    id: "alphago-lee-sedol-2016",
    stamp: "2016.3",
    sources: [
      {
        label: "Wikipedia, AlphaGo versus Lee Sedol",
        url: "https://en.wikipedia.org/wiki/AlphaGo_versus_Lee_Sedol",
      },
    ],
  },
  {
    id: "aws-s3-2017-typo",
    stamp: "2017.02.28",
    sources: [
      {
        label:
          'AWS, "Summary of the Amazon S3 Service Disruption in the Northern Virginia (US-EAST-1) Region"',
        url: "https://aws.amazon.com/message/41926/",
      },
    ],
  },
  {
    id: "gitlab-2017-rm-rf",
    stamp: "2017.01.31",
    sources: [
      {
        label: 'GitLab, "Postmortem of database outage of January 31"',
        url: "https://about.gitlab.com/blog/postmortem-of-database-outage-of-january-31/",
      },
    ],
  },
  {
    id: "attention-title-beatles-2017",
    stamp: "2017.6",
    sources: [
      {
        label: "Wikipedia, Attention Is All You Need",
        url: "https://en.wikipedia.org/wiki/Attention_Is_All_You_Need",
      },
    ],
  },
  {
    id: "cloudflare-2019-regex",
    stamp: "2019.07.02",
    sources: [
      {
        label: 'Cloudflare, "Details of the Cloudflare outage on July 2, 2019"',
        url: "https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/",
      },
    ],
  },
  {
    id: "requests-kenneth-reitz",
    stamp: "2019",
    sources: [
      {
        label: 'Wikipedia, "Requests (software)"',
        url: "https://en.wikipedia.org/wiki/Requests_(software)",
      },
    ],
  },
  {
    id: "linux-y2038-kernel-fix",
    stamp: "2020.01",
    sources: [
      {
        label:
          "Phoronix — Linux 5.6 Is The First Kernel For 32-Bit Systems Ready To Run Past Year 2038",
        url: "https://www.phoronix.com/news/Linux-5.6-32-bit-Past-Y2038",
      },
    ],
  },
  {
    id: "log4shell-eight-years",
    stamp: "2021.12.10",
    sources: [
      { label: 'Wikipedia, "Log4Shell"', url: "https://en.wikipedia.org/wiki/Log4Shell" },
      { label: 'Wikipedia, "Log4j"', url: "https://en.wikipedia.org/wiki/Log4j" },
    ],
  },
  {
    id: "core-js-denis-pushkarev",
    stamp: "2023.02.14",
    sources: [
      {
        label: 'core-js docs, "So, what\'s next" (Denis Pushkarev)',
        url: "https://github.com/zloirock/core-js/blob/master/docs/2023-02-14-so-whats-next.md",
      },
      { label: "GitHub, zloirock/core-js", url: "https://github.com/zloirock/core-js" },
    ],
  },
];

/**
 * Leading year of a stamp. Stamps are display strings — "1969.10.29", "1969.08",
 * "1965", "2004 · 2013" — so the rail reads the first four-digit run and, for a
 * two-date entry, plots the earlier one.
 */
export function bootLogYear(stamp: string): number {
  const match = /\d{4}/.exec(stamp);
  return match ? Number(match[0]) : Number.NaN;
}

/**
 * Every year in the archive, sorted. The rail draws one bar per slice of these,
 * so what the reader sees is the actual density of the record — where the years
 * crowd, where they thin — rather than a decorative ruler.
 */
export const BOOT_LOG_YEARS: readonly number[] = BOOT_LOG_ENTRIES.map((entry) =>
  bootLogYear(entry.stamp),
)
  .filter((year) => Number.isFinite(year))
  .sort((a, b) => a - b);

export interface BootLogSpan {
  readonly from: number;
  readonly to: number;
  /** Entries older than `from`. They stack in the first bar; the label says so. */
  readonly earlier: number;
}

/** Entries a decade must hold before the rail is willing to start there. */
const CONTINUOUS_DECADE = 3;

/**
 * Rail bounds.
 *
 * The left end is where the record becomes CONTINUOUS, not the single oldest
 * curiosity in it. A handful of entries reach back to the Gregorian switch and
 * to decimal time; anchoring a linear axis on 1752 squeezes the whole computing
 * era into the right third and turns the rail into one spike beside a long empty
 * plain. So the search walks forward from the oldest decade while each holds
 * fewer than CONTINUOUS_DECADE entries, and stops at the first that does not.
 * Anything older stacks in the first bar and the left label is prefixed with ‹ —
 * "this and earlier" — because a bare year there would be a false claim about
 * where the archive starts. The rule is the same one the bars draw: density,
 * not calendar. Add thirty 19th-century entries and the left end moves back on
 * its own.
 *
 * The right end is the CURRENT YEAR, not the newest entry. Ending the rail at
 * the last thing that happened would draw a closed period — history as a
 * finished exhibit — and the last slot would be somebody else's. Running it to
 * today leaves the final bar empty, every year, for whoever is reading. Nothing
 * on the panel says that; the empty slot is the whole statement, and a line of
 * copy explaining it would take the statement away.
 *
 * It is a parameter rather than a `new Date()` inside this module so that the
 * year is read once on the server — a module-level constant would freeze at
 * process start, and computing it on the client would risk a January-1 mismatch
 * against what the server rendered.
 */
export function bootLogSpan(currentYear: number): BootLogSpan {
  const earliest = BOOT_LOG_YEARS[0] ?? 1940;
  const latest = BOOT_LOG_YEARS[BOOT_LOG_YEARS.length - 1] ?? currentYear;

  const perDecade = new Map<number, number>();
  for (const year of BOOT_LOG_YEARS) {
    const decade = Math.floor(year / 10) * 10;
    perDecade.set(decade, (perDecade.get(decade) ?? 0) + 1);
  }

  let from = Math.floor(earliest / 10) * 10;
  const lastDecade = Math.floor(latest / 10) * 10;
  while (from < lastDecade && (perDecade.get(from) ?? 0) < CONTINUOUS_DECADE) {
    from += 10;
  }

  return {
    from,
    to: Math.max(currentYear, latest),
    earlier: BOOT_LOG_YEARS.filter((year) => year < from).length,
  };
}

/** Which bar of the rail a year falls in. Out-of-span years clamp to an end. */
export function bootLogBucket(year: number, buckets: number, span: BootLogSpan): number {
  if (!Number.isFinite(year) || span.to <= span.from || buckets < 1) return 0;
  const ratio = (year - span.from) / (span.to - span.from);
  return Math.min(buckets - 1, Math.max(0, Math.round(ratio * (buckets - 1))));
}

/**
 * How many entries fall in each bar of the rail.
 *
 * The rail draws this, not an evenly-spaced ruler: bar height is the archive's
 * own density, so the reader sees where the record crowds and where it thins. An
 * even tick every decade would look like a slider — and would be a claim about
 * the calendar rather than about the archive.
 */
export function bootLogDensity(buckets: number, span: BootLogSpan): number[] {
  const counts = new Array<number>(Math.max(1, buckets)).fill(0);
  for (const year of BOOT_LOG_YEARS) {
    const bucket = bootLogBucket(year, counts.length, span);
    counts[bucket] = (counts[bucket] ?? 0) + 1;
  }
  return counts;
}

/** Fisher–Yates over a copy — the source array is never touched. */
function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const swap = out[i] as T;
    out[i] = out[j] as T;
    out[j] = swap;
  }
  return out;
}

/**
 * Pick the rotation this page load will cycle through.
 *
 * Called from a server component on a force-dynamic route, so the draw is
 * genuinely per visit. Only `count` resolved records cross to the client —
 * handing over the whole catalog would be most of the panel's payload.
 *
 * An entry whose id is missing from the catalog is skipped rather than rendered
 * blank. A locale file can lag the archive between a merge and a translation
 * pass, and a short rotation is better than an empty panel.
 */
export function pickBootLogRotation(
  catalog: BootLogCatalog,
  count = 4,
  random: () => number = Math.random,
): BootLogRecord[] {
  return shuffle(BOOT_LOG_ENTRIES, random)
    .map((entry) => {
      const copy = catalog.entries[entry.id];
      return copy
        ? { id: entry.id, stamp: entry.stamp, year: bootLogYear(entry.stamp), ...copy }
        : null;
    })
    .filter((record): record is BootLogRecord => record !== null)
    .slice(0, Math.max(1, Math.min(count, BOOT_LOG_ENTRIES.length)));
}
