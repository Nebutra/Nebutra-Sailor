/**
 * Boot log — the rotating archive entry on the auth-center left panel.
 *
 * Editorial contract (read before adding an entry):
 *   1. Verifiable, not remembered. `sources` is a required field precisely so
 *      that an entry cannot be added from memory. Every date, figure and
 *      attribution below was checked against the cited pages. Where the popular
 *      version of a story is wrong — Mariner 1's "hyphen", Hopper's moth, the
 *      "rsync" in the Dropbox comment — the entry states the checked version
 *      and lets the myth be the twist.
 *   2. It must turn. The last third of the body contradicts what the first two
 *      thirds set up: a rejected paper that became a law, a demo nobody acted
 *      on, a fix so complete that people denied the problem had been real.
 *   3. The coda states an outcome, never a lesson. It is the flat line after
 *      the turn, not a moral. If it could end in an exclamation mark it is the
 *      wrong sentence — see the seven prohibitions in
 *      docs/microcopy/nebutra-microcopy-system.md.
 *   4. Body ≈ 90–140 CJK characters. The card reserves a fixed height so the
 *      rotation never shifts the panel; longer entries defeat that.
 *
 * Sources are maintainer-facing and deliberately not rendered — the panel sits
 * beside a login form, and an outbound link there is an exit, not a feature.
 *
 * Copy lives here rather than in packages/platform/i18n/locales/*.json on
 * purpose: those 35 catalogs are gated for key parity, and this is editorial
 * prose that would need re-translating by hand on every edit. Two languages are
 * authored; every other locale reads the English.
 */

/** Languages this archive is authored in. */
export type BootLogLocale = "zh" | "en";

/** Where the entry was checked. Required — see rule 1. */
export interface BootLogSource {
  readonly label: string;
  readonly url: string;
}

/** One entry as rendered — locale already resolved. */
export interface BootLogRecord {
  readonly id: string;
  /** Cinematic date stamp, e.g. "1969.10.29". Shown verbatim. */
  readonly stamp: string;
  /** Leading year of the stamp — where this entry sits on the rail. */
  readonly year: number;
  /** Short category, shown in the eyebrow. */
  readonly tag: string;
  readonly title: string;
  readonly body: string;
  /** The flat line after the turn. */
  readonly coda: string;
}

type BootLogCopy = Omit<BootLogRecord, "id" | "stamp" | "year">;

interface BootLogEntry {
  readonly id: string;
  readonly stamp: string;
  readonly sources: readonly BootLogSource[];
  readonly zh: BootLogCopy;
  readonly en: BootLogCopy;
}

/** Panel eyebrow — signing in is booting; this is the log it prints. */
export const BOOT_LOG_LABEL: Record<BootLogLocale, string> = {
  zh: "引导记录",
  en: "Boot log",
};

export const BOOT_LOG_ENTRIES: readonly BootLogEntry[] = [
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
    zh: {
      tag: "投标",
      title: "一万七千元",
      body: "1961年10月,何鸿燊与霍英东、叶汉、叶德利合组的财团投标澳门博彩专营权,出价三百一十六万七千元,比对手多出一万七千元。",
      coda: "这个专营权,他们垄断了四十余年。",
    },
    en: {
      tag: "Tender",
      title: "Seventeen thousand",
      body: "In October 1961 a syndicate formed by Stanley Ho, Henry Fok, Yip Hon and Teddy Yip bid for the Macau gaming monopoly. They offered 3,167,000 patacas, seventeen thousand more than the rival bid.",
      coda: "The monopoly that margin bought them held for more than forty years.",
    },
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
    zh: {
      tag: "专利",
      title: "四万美元",
      body: "演示过那只木盒鼠标之后,SRI给它申请了专利,却没看出它值多少钱。若干年后外界才知道,他们把授权卖给了苹果,大约四万美元。",
      coda: "恩格尔巴特本人,从这项发明里一分版税也没拿到。",
    },
    en: {
      tag: "Patent",
      title: "Forty thousand dollars",
      body: "SRI patented the mouse after the demo and, by its own account, had no real idea of its value. Some years later it emerged that they had licensed it to Apple for something like $40,000.",
      coda: "Engelbart never received any royalties for inventing it.",
    },
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
    zh: {
      tag: "首次通信",
      title: "LO",
      body: "克莱因要从洛杉矶登录斯坦福研究院的主机。L 到了,O 到了,敲到 G,那头崩了。",
      coda: "人类在互联网上说出的第一句话,是两个字母:LO。",
    },
    en: {
      tag: "First contact",
      title: "LO",
      body: "Charley Kline set out to log in to a machine at SRI from UCLA. The L arrived. The O arrived. On the G the far end crashed.",
      coda: "The first thing ever said on the internet was two letters: LO.",
    },
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
    zh: {
      tag: "蓝图",
      title: "按需供应的算力",
      body: "Multics 要造的不是一台电脑,是一家计算公用事业:像电力一样不停供应,同一台机器上的租户互相隔离。它太晚太贵,贝尔实验室四年后退出。",
      coda: "五十年后,这个设想改名叫云计算。",
    },
    en: {
      tag: "Blueprint",
      title: "Computing as a utility",
      body: "Multics was not designed as a computer but as a computing utility: always on, the way power is, with the tenants of one machine sealed off from each other. It shipped late and expensive, and Bell Labs walked away.",
      coda: "Fifty years later the idea was renamed cloud computing.",
    },
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
    zh: {
      tag: "治理",
      title: "请求评论",
      body: "克罗克要给刚联网的几台主机写第一份规范。没人授权他,他怕读起来像拿架子,于是把这类文档叫作「请求评论」。",
      coda: "互联网此后所有的规矩,都还叫 RFC。",
    },
    en: {
      tag: "Governance",
      title: "Request for Comments",
      body: "Steve Crocker had to write the first rules for a few networked hosts. Nobody had given him the authority, and he feared it would read as pulling rank — so he called the genre a Request for Comments.",
      coda: "Every rule the internet has agreed on since is still called an RFC.",
    },
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
    zh: {
      tag: "起点",
      title: "一台没人要的机器",
      body: "退出 Multics 后,汤普森手上只剩一台被淘汰的 PDP-7。妻儿回圣迭戈探亲的那个月,他一周写一样:内核、shell、编辑器、汇编器。",
      coda: "四周后,那台没人要的机器上跑起了 Unix。",
    },
    en: {
      tag: "Origin",
      title: "The machine nobody wanted",
      body: "After Bell Labs quit Multics, Ken Thompson had a cast-off PDP-7 and a month alone while his wife and son were in San Diego. He gave himself a week per piece: kernel, shell, editor, assembler.",
      coda: "Four weeks later the machine nobody wanted was running Unix.",
    },
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
    zh: {
      tag: "事故",
      title: "1202",
      body: "着陆前四分钟,导航计算机报了五次警:交会雷达开关留错了位置,一直在灌无用数据。它没有死机,而是丢掉低优先任务、重启,只保住着陆要用的。",
      coda: "过载时知道该放弃什么,是系统设计里最贵的一课。",
    },
    en: {
      tag: "Incident",
      title: "Program alarm 1202",
      body: "Four minutes from the surface the guidance computer raised five alarms: a rendezvous radar switch left in the wrong position was eating its cycles. It did not hang. It shed the low-priority jobs, restarted, and kept the landing.",
      coda: "Knowing what to drop under load is the expensive lesson.",
    },
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
    zh: {
      tag: "事故",
      title: "一条上划线",
      body: "水手一号升空 293 秒后被炸毁。机上信标失灵,加上制导方程抄进程序时,变量 R 头上那条表示「取平均」的上划线漏掉了。",
      coda: "媒体嫌上划线不好解释,写成了连字符,一直传到今天。",
    },
    en: {
      tag: "Incident",
      title: "One missing overbar",
      body: "Mariner 1 was destroyed 293 seconds after launch. An onboard beacon had failed, and when the guidance equations were copied into the program an overbar was dropped from R. The bar meant take the average.",
      coda: "The press found overbar hard to explain and wrote hyphen. The hyphen stuck.",
    },
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
    zh: {
      tag: "演示",
      title: "母之演示",
      body: "恩格尔巴特拿到九十分钟。终端通过电话线连着三十英里外的主机,他当场演示了鼠标、超链接、多窗口、屏幕共享,和两个人同改一份文档。",
      coda: "台下一千人。散场后回去继续用打孔卡片,又用了十几年。",
    },
    en: {
      tag: "Demo",
      title: "The Mother of All Demos",
      body: "Engelbart was given ninety minutes. His terminal ran over telephone lines to a machine thirty miles away, and he demonstrated the mouse, hyperlinks, windows, screen sharing, and two people editing one document at once.",
      coda: "A thousand people watched, then went back to punch cards for another decade.",
    },
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
    zh: {
      tag: "定律",
      title: "一篇被退稿的论文",
      body: "康威把「系统结构会复制出组织的沟通结构」写成论文投给《哈佛商业评论》,被退稿,理由是他没有证明自己的论点。",
      coda: "后来布鲁克斯引用了这个未获证明的论点,管它叫康威定律。",
    },
    en: {
      tag: "Law",
      title: "The paper that was turned down",
      body: 'Melvin Conway wrote up the observation that a system\'s structure ends up mirroring the communication structure of the organisation that built it, and sent "How Do Committees Invent?" to Harvard Business Review. They rejected it on the grounds that he had not proved his thesis. Datamation ran it in 1968.',
      coda: "Fred Brooks later cited the unproven thesis and named it Conway's law.",
    },
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
    zh: {
      tag: "源码",
      title: "点火程序注释",
      body: "登月舱的主点火程序在源码里被写作「BURN_BABY_BURN」。这名字不是点火那一刻的激动,是借自当年一个灵魂乐电台主持人的口头禅。",
      coda: "该注释随源码保存在公开仓库中,未再修改。",
    },
    en: {
      tag: "Comment",
      title: "Burn, Baby, Burn",
      body: "The lunar module's master ignition routine is labelled BURN_BABY_BURN in the source. The name is not about the thrust; it was borrowed from a soul radio DJ's catchphrase of the day.",
      coda: "The line still sits unedited in the public repository.",
    },
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
    zh: {
      tag: "误读",
      title: "那张图是反例",
      body: "罗伊斯画下了后来被叫作瀑布模型的流程图,紧接着写:「我认同这个概念,但上面这种实现方式风险很大,而且招致失败。」",
      coda: "行业记住了那张图,没记住那句话。",
    },
    en: {
      tag: "Misreading",
      title: "The diagram was the counterexample",
      body: 'In "Managing the Development of Large Software Systems" Winston Royce drew the chart the industry would come to call the waterfall model, then wrote: "I believe in this concept, but the implementation described above is risky and invites failure." The rest of the paper is about making it iterative.',
      coda: "The industry kept the diagram and dropped the sentence.",
    },
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
    zh: {
      tag: "词源",
      title: "第一只 bug",
      body: "马克二号的继电器里夹出一只飞蛾,贴进日志本。那行字常被当成 bug 的出处,可它写的是「首次找到真正意义上的 bug」。",
      coda: "这词爱迪生早就在用。博物馆则认为,那页不是霍珀的笔迹。",
    },
    en: {
      tag: "Etymology",
      title: "The first actual bug",
      body: "A moth was pulled from a relay of the Harvard Mark II and taped into the logbook. The line beside it is cited as the origin of the word, but what it says is: first actual case of bug being found.",
      coda: "Engineers had said bug since Edison. The museum doubts the page is even in Hopper's hand.",
    },
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
    zh: {
      tag: "内核",
      title: "这题不考",
      body: "「You are not expected to understand this」——第六版Unix源码slp.c注释。里奇后来说,那只是句玩笑话。",
      coda: "该函数逻辑后来在第七版Unix中被重写。",
    },
    en: {
      tag: "Kernel",
      title: "Not Expected to Understand",
      body: "Sixth Edition Unix's slp.c contains the line 'You are not expected to understand this,' attached to process-swap stack-restoration code built on PDP-11 compiler quirks. Dennis Ritchie later said he meant it the way a teacher says this won't be on the exam.",
      coda: "The routine was rewritten for Seventh Edition Unix.",
    },
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
    zh: {
      tag: "信任",
      title: "反思对信任的信任",
      body: "汤普森在图灵奖演讲里演示了一个后门:改过的编译器给登录程序种后门,并在编译编译器自己时把这套手法再种回去。从干净源码重编,后门还在。",
      coda: "结论是:你无法信任任何不是自己完整写出来的代码。",
    },
    en: {
      tag: "Trust",
      title: "Reflections on Trusting Trust",
      body: "Thompson's Turing lecture described a compiler that plants a backdoor in the login program, and reinstalls the entire trick whenever it compiles a compiler. Rebuild from clean source and the backdoor survives.",
      coda: "You cannot trust code you did not totally create yourself.",
    },
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
    zh: {
      tag: "事故",
      title: "一次测量",
      body: "莫里斯想量一量互联网有多大,写了个会自我复制的程序。为防止管理员伪装成「已感染」骗过它,他让它遇到同类时仍有七分之一的概率再装一遍。",
      coda: "那个七分之一,让六万台联网主机里约六千台瘫痪。",
    },
    en: {
      tag: "Incident",
      title: "A measurement",
      body: "Morris wanted to know how big the internet was, so he wrote a program that copied itself. To stop hosts faking an already-infected reply, he gave it a one-in-seven chance of reinfecting anyway.",
      coda: "That one-in-seven took down about 6,000 of the 60,000 hosts then online.",
    },
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
    zh: {
      tag: "哲学",
      title: "程序不是产物",
      body: "瑙尔提出:程序真正的载体不是源码,而是写它的人脑子里那套「问题为什么这样解」的理论。源码是这套理论的一次有损投影。",
      coda: "他把理论持有者全部离开的那一刻,称为程序的死亡。",
    },
    en: {
      tag: "Philosophy",
      title: "The program is not the artifact",
      body: "Naur argued that a program does not live in its source but as a theory, held by the people who wrote it, of why the problem is solved this way. The source is a lossy projection of it.",
      coda: "He called the moment the last theory-holder leaves the death of the program.",
    },
  },
  {
    id: "sosumi-so-sue-me",
    stamp: "1991",
    sources: [{ label: "Wikipedia — Sosumi", url: "https://en.wikipedia.org/wiki/Sosumi" }],
    zh: {
      tag: "命名",
      title: "所以告我啊",
      body: "1991年,苹果法务驳回了「Let It Beep」这个提案,理由是太像音乐。声音设计师回了一句「so sue me」,然后把它拼成「sosumi」交了上去。",
      coda: "这个提示音用了近三十年,2020年才被替换。",
    },
    en: {
      tag: "Naming",
      title: "So Sue Me",
      body: 'In 1991, Apple\'s legal department rejected the alert-sound name "Let It Beep" as too musical, under a settlement barring Apple Computer from music-related trademarks. Sound designer Jim Reekes wrote back "so sue me," then filed it as "sosumi."',
      coda: "The sound shipped in Mac OS for nearly three decades before Big Sur replaced it in 2020.",
    },
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
    zh: {
      tag: "放弃",
      title: "不收费的那一天",
      body: "1993年4月30日,CERN把万维网的协议和代码免除版税公开发布。任何人都可以拿去用,不必付钱,也不必来问。",
      coda: "此后没有人为使用它付过一分版税。",
    },
    en: {
      tag: "Given away",
      title: "The day it stopped costing",
      body: "On 30 April 1993 CERN made the protocol and the code of the World Wide Web available royalty-free. Anyone could take it, without paying and without asking.",
      coda: "Nobody has paid a royalty to use it since.",
    },
  },
  {
    id: "zlib-two-authors",
    stamp: "1995",
    sources: [{ label: 'Wikipedia, "Zlib"', url: "https://en.wikipedia.org/wiki/Zlib" }],
    zh: {
      tag: "地基",
      title: "两个人的压缩层",
      body: "zlib 嵌在 Linux、macOS、iOS 和多代游戏主机里,Git 与 OpenSSH 都靠它压缩。1995年,两个人写出了它的第一版。",
      coda: "作者栏此后再未新增第三个名字。",
    },
    en: {
      tag: "Foundation",
      title: "The Compression Layer of Two",
      body: "zlib sits inside Linux, macOS, iOS and successive generations of game consoles; Git and OpenSSH both lean on it to compress. Two people wrote its first public release in 1995.",
      coda: "The authorship line has never grown a third name.",
    },
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
    zh: {
      tag: "事故",
      title: "三十七秒",
      body: "起飞三十七秒,惯性参考系统把 64 位浮点数转成 16 位整数,溢出了;约四十秒,箭体解体。那段代码从四号原样搬来,五号起飞后根本不需要它运行。",
      coda: "约三亿七千万美元,花在一段本该关掉的代码上。",
    },
    en: {
      tag: "Incident",
      title: "Thirty-seven seconds",
      body: "Thirty-seven seconds in, the inertial reference system converted a 64-bit float to a 16-bit integer and overflowed; at about forty seconds the vehicle broke up. The routine came unchanged from Ariane 4 and had no reason to be running after liftoff.",
      coda: "Roughly $370 million, spent on code that should have been switched off.",
    },
  },
  {
    id: "curl-one-maintainer",
    stamp: "1998",
    sources: [
      { label: 'curl.se, "History of curl"', url: "https://curl.se/docs/history.html" },
      { label: 'curl.se, "Who uses curl?"', url: "https://curl.se/docs/companies.html" },
    ],
    zh: {
      tag: "地基",
      title: "一个人的协议栈",
      body: "curl文档称libcurl已装入约百亿台设备,覆盖百余种系统与二十八种架构。项目自1998年起,由Daniel Stenberg一人主导维护。",
      coda: "该职位仍无继任者名单。",
    },
    en: {
      tag: "Foundation",
      title: "One Man's Protocol Stack",
      body: "curl's own docs put libcurl on roughly ten billion devices, running on 110 operating systems and 28 CPU architectures. The project has carried Daniel Stenberg's name as lead maintainer since it was renamed curl in 1998.",
      coda: "No named successor has ever been listed.",
    },
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
    zh: {
      tag: "彩蛋",
      title: "摩西拉之书",
      body: "在地址栏输入about:mozilla可见「摩西拉之书」,历代版本各附一句经文式警句,野兽与玛门缠斗。经文编号并非章节,而是发布日期。",
      coda: "最新一节写于2020年Nightly发布。",
    },
    en: {
      tag: "Easter Egg",
      title: "The Book of Mozilla",
      body: "Typing about:mozilla into the address bar reveals the Book of Mozilla, an apocalyptic verse pitting 'the beast' against 'Mammon' that each browser generation updates. The verse numbers are not chapter markers: they are release dates.",
      coda: "The newest verse, 6:27, first shipped in a Firefox Nightly build in 2020.",
    },
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
    zh: {
      tag: "标准",
      title: "我是茶壶",
      body: "RFC 2324 发布于1998年4月1日,把418定义为「我是茶壶」,文件类别是非正式。2014年的愚人节,RFC 7168 又给它补了煮茶条款。",
      coda: "两份愚人节文件,定义了一个真被实现的状态码。",
    },
    en: {
      tag: "Protocol",
      title: "I'm a Teapot",
      body: 'RFC 2324, published April 1, 1998, defines status 418 as "I\'m a teapot" and files itself as Informational, not a standard. On April 1, 2014, RFC 7168 extended it to cover tea brewing. The code still never became a real standard.',
      coda: "Both documents remain Informational; the status code shipped in real servers anyway.",
    },
  },
  {
    id: "multics-shutdown",
    stamp: "2000.10.30",
    sources: [
      { label: "Multics, English Wikipedia", url: "https://en.wikipedia.org/wiki/Multics" },
    ],
    zh: {
      tag: "关机",
      title: "最后一台",
      body: "2000年10月30日,已知最后一台在霍尼韦尔硬件上原生运行的Multics,在加拿大国防部哈利法克斯的机房里关机。",
      coda: "从立项算起,它跑了三十五年。",
    },
    en: {
      tag: "Shutdown",
      title: "The last one",
      body: "On 30 October 2000 the last known Multics installation running natively on Honeywell hardware was shut down at the Canadian Department of National Defence in Halifax, Nova Scotia.",
      coda: "Thirty-five years after the project began.",
    },
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
    zh: {
      tag: "地基",
      title: "没有许可证的数据库",
      body: "SQLite官网估算全球活跃数据库超万亿份,四十多亿部手机各装数百个,部署量或仅次于zlib。它没有许可证,作者把代码直接献给公有领域。",
      coda: "想要法律担保的公司,要另付费买一份保证书。",
    },
    en: {
      tag: "Foundation",
      title: "The Database With No License",
      body: "SQLite's own page estimates over a trillion active database files worldwide, since every smartphone alone carries hundreds, ranking it second only to zlib among deployed software. There is no license, because the authors gave every line to the public domain.",
      coda: "Companies wanting legal cover buy a separate warranty of title.",
    },
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
    zh: {
      tag: "治理",
      title: "一道备忘录",
      body: "据那篇 2011 年误发到公开网络的长帖回忆,贝索斯 2002 年下令:团队之间只能走服务接口,不许直连、不许读别人的库、不许走后门。",
      coda: "写那篇长帖的人,本来只想发给公司内部看。",
    },
    en: {
      tag: "Governance",
      title: "The memo",
      body: "According to the post that went public by accident in 2011, Bezos ordered in 2002 that teams expose everything through service interfaces: no direct linking, no reading another team's store, no back doors.",
      coda: "The author of that post had meant it for his colleagues only.",
    },
  },
  {
    id: "hupu-rumours",
    stamp: "2004.01",
    sources: [
      { label: "虎扑,中文維基百科", url: "https://zh.wikipedia.org/wiki/%E8%99%8E%E6%89%91" },
    ],
    zh: {
      tag: "论坛",
      title: "翻译流言的人",
      body: "2004年1月,一个在芝加哥读机械学博士的中国学生,用业余时间开了个篮球论坛。主要工作是把NBA的新闻和流言翻译成中文,整理好贴出来。",
      coda: "八年后,这个论坛开出了自己的电商平台。",
    },
    en: {
      tag: "Forum",
      title: "The one translating rumours",
      body: "In January 2004 a Chinese student working on a mechanical engineering doctorate in Chicago started a basketball forum in his spare time. The work was mostly translating NBA news and rumours into Chinese and tidying them up.",
      coda: "Eight years later the forum opened an online store of its own.",
    },
  },
  {
    id: "jd-the-other-name",
    stamp: "2004",
    sources: [
      { label: "京東集團,中文維基百科", url: "https://zh.wikipedia.org/wiki/%E4%BA%AC%E4%B8%9C" },
    ],
    zh: {
      tag: "词源",
      title: "名字里的另一个人",
      body: "2004年上线的那家零售平台,名字取自两个人:创始人刘强东,和他的初恋女友龚晓京。各出一个字。",
      coda: "「京」是她。",
    },
    en: {
      tag: "Etymology",
      title: "The other half of the name",
      body: "The retail platform that went online in 2004 took its name from two people: its founder, Liu Qiangdong, and Gong Xiaojing, the woman he had dated first. One character from each.",
      coda: "The Jing is hers.",
    },
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
    zh: {
      tag: "词源",
      title: "胡同的名字",
      body: "2005年3月6日上线的那个网站,名字不是隐喻。杨勃写它源码的时候,常去的咖啡馆在北京豆瓣胡同附近,他就用了那条胡同。",
      coda: "网站上线二十一年,名字一次没改。",
    },
    en: {
      tag: "Etymology",
      title: "Named after the alley",
      body: "The site that went live on 6 March 2005 is not named after a metaphor. Yang Bo wrote its source in a cafe near Douban Hutong in Beijing, and took the name of the alley.",
      coda: "Twenty-one years on, the site still carries it.",
    },
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
    zh: {
      tag: "版本控制",
      title: "来自地狱",
      body: '2005年4月7日,林纳斯提交了 git 的第一个 commit,留言是「"git" 的初始版本,来自地狱的信息管理器」,提交邮箱为 ppc970.osdl.org。',
      coda: "该邮箱指向OSDL测试用PowerPC机器。",
    },
    en: {
      tag: "Git",
      title: "Information Manager from Hell",
      body: 'On 7 April 2005 Linus Torvalds committed git\'s first revision. The message reads: Initial revision of "git", the information manager from hell. The author address on it is torvalds@ppc970.osdl.org.',
      coda: "That address points to a PowerPC 970 test machine at OSDL.",
    },
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
    zh: {
      tag: "支票",
      title: "圣塞里夫银行",
      body: "Knuth为找到书中错误的读者签发2.56美元支票,开票行是虚构的「圣塞里夫银行」。到2005年3月,他签出的支票总额已超两万美元。",
      coda: "多数支票被裱起来挂在墙上,很少有人拿去兑现。",
    },
    en: {
      tag: "Reward",
      title: "Bank of San Serriffe",
      body: "Donald Knuth pays $2.56 for each error found in his books, drawn on the fictional Bank of San Serriffe. By March 2005 the checks he had signed totaled over $20,000.",
      coda: "Most recipients frame the check rather than deposit it.",
    },
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
    zh: {
      tag: "反直觉",
      title: "那条回复",
      body: "休斯顿把 Dropbox 的演示贴上 Hacker News。最有名的一条回复解释道:开个 FTP 账号、用 curlftpfs 挂到本地、再跑 SVN,自己就能搭,而且看不出怎么赚钱。",
      coda: "十一年后公司上市,休斯顿说那是他最喜欢的一条讨论串。",
    },
    en: {
      tag: "Counterintuitive",
      title: "That reply",
      body: "Houston posted the Dropbox demo to Hacker News. The famous reply explained that you could do it yourself with an FTP account, curlftpfs and SVN, and that it did not look like it would make money.",
      coda: "Eleven years later, at the IPO, Houston called it his favourite thread on the site.",
    },
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
    zh: {
      tag: "转型",
      title: "两次废墟",
      body: "巴特菲尔德的网游《永不终结的游戏》做不下去,团队把里面的图片分享拆出来,叫 Flickr。八年后另一款网游 Glitch 关服,团队把内部聊天工具拆出来,叫 Slack。",
      coda: "两次都是关掉主业之后,才看清副产品。",
    },
    en: {
      tag: "Pivot",
      title: "Twice from the wreckage",
      body: "Butterfield's game, Game Neverending, stalled, and the team spun the photo-sharing piece out as Flickr. Eight years later his second game, Glitch, shut down, and the team spun out the chat tool they had built for themselves: Slack.",
      coda: "Both times the by-product only became visible once the main thing closed.",
    },
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
    zh: {
      tag: "错过",
      title: "五千万",
      body: "哈斯廷斯和兰道夫飞到达拉斯,提出五千万美元把 Netflix 卖给百视达,并替对方运营线上业务。按兰道夫回忆,对面的 CEO 全程在憋笑。",
      coda: "十年后,百视达申请破产。",
    },
    en: {
      tag: "The pass",
      title: "Fifty million",
      body: "Hastings and Randolph flew to Dallas to sell Netflix to Blockbuster for fifty million, and to run the online side for them. By Randolph's account the CEO across the table spent the meeting suppressing a laugh.",
      coda: "Blockbuster filed for bankruptcy ten years later.",
    },
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
    zh: {
      tag: "治理",
      title: "什么都没发生",
      body: "Gartner 估算全球为千年虫要花三千亿到六千亿美元,几十万人把上一代系统里的两位年份逐行改掉。跨年那夜,电网正常,银行正常,飞机照飞。",
      coda: "四年后有经济学家发论文,论证这笔钱大半白花了。",
    },
    en: {
      tag: "Governance",
      title: "Nothing happened",
      body: "Gartner put the worldwide cost of Y2K at three to six hundred billion dollars, and hundreds of thousands of people changed two-digit years line by line. On the night, the grid held, the banks held, the planes flew.",
      coda: "Four years later an economist published a paper arguing most of the money had been wasted.",
    },
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
    zh: {
      tag: "存疑",
      title: "查无此人",
      body: "「640K 够任何人用了」——盖茨说这话从来没有出处,像谣言一样飘着。「全世界只需要五台计算机」——沃森 1953 年确实说过五台,指的是 IBM 701 的预期订单。",
      coda: "701 后来卖了十八台。",
    },
    en: {
      tag: "Unsourced",
      title: "Attributed to nobody",
      body: '"640K ought to be enough for anybody" — Gates\'s own answer is that there is never a citation, that the quotation just floats like a rumour and gets repeated. "A world market for maybe five computers" — Thomas Watson did say five, in 1953, about the orders he expected for one machine, the IBM 701.',
      coda: "The 701 went on to sell eighteen.",
    },
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
    zh: {
      tag: "地基",
      title: "没有公司的软件仓库",
      body: "Homebrew是苹果开发者默认的包管理器,2013年贡献者数居GitHub全站第一。Max Howell写下第一版,如今由三十四名无偿志愿者维护。",
      coda: "资金来自一次众筹与开源集体的账户。",
    },
    en: {
      tag: "Foundation",
      title: "The Repository With No Employer",
      body: "Homebrew is the default package manager on most Mac developer machines; in 2013 it led all of GitHub in contributors. Max Howell wrote its first release in 2009. It is maintained today by a team of 34 people, all unpaid.",
      coda: "Its funding history is one Kickstarter and an Open Source Collective account.",
    },
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
    zh: {
      tag: "事故",
      title: "多出来的那一秒",
      body: "为了让原子钟对上地球自转,那天插进一秒。内核没把这事通知定时器,高精度定时器提前触发,CPU 空转。Reddit、Mozilla、LinkedIn 一起卡住,某航司值机停摆一小时。",
      coda: "时间并不单调递增。写代码的人默认它是。",
    },
    en: {
      tag: "Incident",
      title: "The extra second",
      body: "A leap second was inserted to keep atomic clocks in step with the earth's rotation. The kernel never told its timer subsystem, high-resolution timers fired early, and processors spun. Reddit, Mozilla and LinkedIn seized up; an airline boarded passengers by hand.",
      coda: "Time does not increase monotonically. Code assumes it does.",
    },
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
    zh: {
      tag: "传说",
      title: "消失的十一天",
      body: "1752年9月2日之后,英国日历直接跳到9月14日,抹去十一天。后世传说民众为此暴动,史料里却找不到一起记录。故事源头是一幅1755年的讽刺选举油画。",
      coda: "讽刺画里的标语,被当成了历史事件。",
    },
    en: {
      tag: "Myth",
      title: "The Eleven Missing Days",
      body: "On 2 September 1752, the British calendar jumped to 14 September, deleting eleven days. Popular history says mobs rioted over it. No contemporary record of any riot survives. The story traces to a banner in a 1755 satirical election painting.",
      coda: "A prop from a painting became the record of an event with no other trace.",
    },
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
    zh: {
      tag: "词源",
      title: "不可能的那句话",
      body: "「拽靴带把自己提起来」出自1785年闵希豪森的荒诞故事,十九世纪常被当作物理上不可能的例子。1953年,计算机界借它形容让机器自启动。",
      coda: "这个比喻本来是用来说明做不到。",
    },
    en: {
      tag: "Etymology",
      title: "Borrowed From an Impossible Feat",
      body: "\"Pulling oneself up by one's bootstraps\" traces to Baron Munchausen's 1785 tall tale and was used through the 19th century as the standard example of a physical impossibility. In 1953, computing borrowed it for the instruction chain that gets a machine to start itself.",
      coda: "The word for the trick was, on its first use, a punchline about the trick failing.",
    },
  },
  {
    id: "french-revolutionary-decimal-time",
    stamp: "1793 · 1795.04",
    sources: [
      { label: "Wikipedia — Decimal time", url: "https://en.wikipedia.org/wiki/Decimal_time" },
    ],
    zh: {
      tag: "实验",
      title: "十小时的一天",
      body: "1793年法国把一天定为十小时,一小时百分钟。1794年9月强制施行,1795年4月即暂停。杜伊勒里宫的钟面却继续走十进制,至少到1801年都没换。",
      coda: "废止的制度,在宫墙上多挂了几年。",
    },
    en: {
      tag: "Experiment",
      title: "The Ten-Hour Day",
      body: "In 1793 France divided the day into ten hours of a hundred decimal minutes each. Mandatory use began in September 1794 and was suspended just seven months later. The decimal face on the Tuileries Palace clock kept running at least through 1801.",
      coda: "The abolished system stayed mounted on a palace wall for years afterward.",
    },
  },
  {
    id: "railway-time-gwr",
    stamp: "1840.11 · 1880.08",
    sources: [
      { label: "Wikipedia — Railway time", url: "https://en.wikipedia.org/wiki/Railway_time" },
    ],
    zh: {
      tag: "标准",
      title: "火车带来的时间",
      body: "1840年11月,大西部铁路全线改用格林尼治时间,取代各地地方时。到1855年英国九成城镇已跟随。直到1880年,议会才立法定其为全国法定时间。",
      coda: "钟表先统一了,法律晚了四十年才追上。",
    },
    en: {
      tag: "Standard",
      title: "The Time the Trains Kept",
      body: "In November 1840, the Great Western Railway adopted Greenwich time across its network, replacing each town's own local time. By 1855, about 98 percent of British towns had followed. Parliament did not make it the legal national standard until 1880.",
      coda: "The clocks agreed on the time forty years before the law did.",
    },
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
    zh: {
      tag: "证伪",
      title: "西联的备忘录",
      body: "流传的1876年西联备忘录说电话「毫无价值」,不如派信差去电报局。调查者翻遍当年报纸找不到此件,收件人当年也不在西联任职,文本系后人伪造。",
      coda: "西联当年确实回绝了贝尔,但没写过这份备忘录。",
    },
    en: {
      tag: "Debunked",
      title: "The Memo Western Union Never Wrote",
      body: 'A widely quoted 1876 Western Union memo calls the telephone "idiotic" next to sending a messenger to the telegraph office. Researchers combing period newspapers found no trace of it, and the executive it names did not hold that post at the company that year. The text was fabricated later.',
      coda: "Western Union did decline Bell's patent that year; it just never wrote this memo.",
    },
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
    zh: {
      tag: "转型",
      title: "花牌之后的弯路",
      body: "1889年山内房治郎在京都开店做花牌起家。此后出租车、方便米饭生意均失败;常被引用的「爱情旅馆」说法,查证券报告并无记录。",
      coda: "1966年,一款伸缩玩具「怪手」卖出数十万件。",
    },
    en: {
      tag: "Pivot",
      title: "The Detours After the Flower Cards",
      body: "Fusajiro Yamauchi opened a shop in Kyoto in 1889 hand-making hanafuda playing cards. The company later tried a taxi service and instant rice, both abandoned; the widely repeated love-hotel chain claim has no record in securities filings researched back to 1962.",
      coda: "In 1966 a toy called the Ultra Hand sold hundreds of thousands of units.",
    },
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
    zh: {
      tag: "转型",
      title: "赠品的赠品",
      body: "1891年,Wrigley在芝加哥卖肥皂,送烘焙粉当赠品。顾客更想要烘焙粉,他改卖烘焙粉,又送口香糖当赠品,结果顾客更想要口香糖。",
      coda: "1892年,他停掉肥皂和烘焙粉,只卖口香糖。",
    },
    en: {
      tag: "Pivot",
      title: "The Premium's Premium",
      body: "In 1891 William Wrigley Jr. sold soap in Chicago and threw in baking powder as a bonus. Customers wanted the baking powder more than the soap, so he switched to selling that instead, and added chewing gum as baking powder's own bonus. Customers wanted the gum more.",
      coda: "By 1892 he had dropped both soap and baking powder to sell only gum.",
    },
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
    zh: {
      tag: "词源",
      title: "「机器人」的作者署名",
      body: "1920年,恰佩克原想用拉丁词根「拉波利」,嫌太书生气。他后来在专栏里承认,「robot」是弟弟约瑟夫随口起的,词根指农奴劳役。",
      coda: "著作权登记在写剧本的那个人名下。",
    },
    en: {
      tag: "Etymology",
      title: "Robot's Uncredited Coiner",
      body: 'Karel Čapek drafted his 1920 play with a Latinate word, "laboři," and thought it too bookish. In a newspaper column he named the actual source: his brother Josef, tossed off in passing. "Robot" comes from robota — a serf\'s compulsory labor, not machinery.',
      coda: "The play kept one brother's name on the title page.",
    },
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
    zh: {
      tag: "转型",
      title: "本来是用来擦墙纸的",
      body: "1930年代,Kutol的McVicker配出软面团,用于擦墙纸除煤灰。暖气改烧清洁燃料后没人再要,1956年改名Play-Doh卖彩泥。",
      coda: "到2005年,这款玩具在75个国家年销9500万罐。",
    },
    en: {
      tag: "Pivot",
      title: "It Was Meant to Clean Wallpaper",
      body: "In the 1930s, Kutol formulated a soft dough to scrub coal soot off wallpaper. Once homes switched to cleaner heating fuel, demand vanished. A teacher suggested selling it as modeling clay; it was renamed Play-Doh in 1956.",
      coda: "By 2005 it was selling 95 million cans a year across 75 countries.",
    },
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
    zh: {
      tag: "专利",
      title: "被扣下的专利",
      body: "1942年,拉玛尔与安塞尔为跳频通信系统申请专利。海军将设计列为机密扣下,建议她去卖战争债券。专利1959年到期,古巴导弹危机时军舰才装上跳频系统。",
      coda: "拉玛尔生前,没从这项专利里拿到过一分钱。",
    },
    en: {
      tag: "Patent",
      title: "The Patent They Shelved",
      body: "In 1942, Lamarr and composer George Antheil patented a frequency-hopping system to keep torpedo radio from being jammed. The Navy classified it, shelved it, and suggested Lamarr sell war bonds instead. The patent expired in 1959, before any ship carried it.",
      coda: "Lamarr never received payment for the patent in her lifetime.",
    },
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
    zh: {
      tag: "起源",
      title: "未造出的桌子",
      body: "1945年7月,布什在《大西洋月刊》发表「诚如所思」,构想靠联想轨迹检索胶片的桌子,取名Memex,9月又删节转载。这台设备从未造出来,连原型也没有。",
      coda: "恩格尔巴特和纳尔逊都说是它让自己动了念头。",
    },
    en: {
      tag: "Origin",
      title: "The Desk Never Built",
      body: 'In July 1945, Vannevar Bush published "As We May Think" in The Atlantic, describing a desk-sized microfilm machine called the Memex that let a user build associative trails through stored knowledge. It ran again in an abridged reprint that September. No prototype was ever built.',
      coda: "Engelbart and Nelson both later credited the essay as the reason they started.",
    },
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
    zh: {
      tag: "记录",
      title: "没被请去的晚宴",
      body: "1946年2月14日,ENIAC公开演示,惊艳全场的弹道程序是巴蒂克和霍尔伯顿写的。记者只介绍埃克特和莫奇利。庆功宴上,六位女程序员一个都没被邀请。",
      coda: "她们的名字,是几十年后才从照片里被找回来的。",
    },
    en: {
      tag: "Record",
      title: "The Dinner They Weren't Invited To",
      body: "At ENIAC's public unveiling on February 14, 1946, the trajectory program that impressed the room had been written by Jean Bartik and Betty Holberton. The press introduced only Eckert and Mauchly. None of the six women programmers were invited to the dinner after.",
      coda: "Their names were pulled back out of the event photographs decades later.",
    },
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
    zh: {
      tag: "论文",
      title: "杂耍定理",
      body: "1948年,香农发表《通信的数学理论》,奠定信息论基础。晚年他把同样的严谨用在业余爱好上,给抛球的飞行时间、停留时间与球数、手数列出一条正式定理。",
      coda: "它和1948年那篇论文,收进了同一本文集。",
    },
    en: {
      tag: "Paper",
      title: "The Juggling Theorem",
      body: "In 1948, Shannon published 'A Mathematical Theory of Communication,' founding information theory. Decades later he turned the same rigor on his hobby, deriving a formal relationship between a ball's flight time, its dwell time, and the count of balls and hands.",
      coda: "It was collected in the same volume as the 1948 paper.",
    },
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
    zh: {
      tag: "起源",
      title: "论文里的解释器",
      body: "1960年,麦卡锡在论文里写下eval函数,只想证明符号表达式能自我描述。学生拉塞尔把推导直译成机器码,证明工具变成了第一个Lisp解释器。",
      coda: "麦卡锡后来说他没打算让人真的运行它。",
    },
    en: {
      tag: "Origin",
      title: "The Interpreter in the Footnote",
      body: "In his 1960 paper, John McCarthy wrote an eval function as mathematical notation, to show that symbolic expressions could describe themselves. His student Steve Russell translated the derivation into IBM 704 machine code. The proof device became the first working Lisp interpreter.",
      coda: "McCarthy later said he had not intended anyone to actually run it.",
    },
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
    zh: {
      tag: "起源",
      title: "图书馆变成网络",
      body: "1960年,利克莱德在论文「人机共生」中设想把图书馆装进「思维中心」,用网络连通,供人对话式使用计算机。当时机器大多靠打孔卡批处理,屏幕对话尚不存在。",
      coda: "两年后他执掌五角大楼新部门,经费投向ARPANET。",
    },
    en: {
      tag: "Origin",
      title: "Libraries Wired Together",
      body: 'In his 1960 paper "Man-Computer Symbiosis," J.C.R. Licklider proposed "thinking centers" holding library functions, linked into a network for real-time, conversational use of computers. Most machines of the day ran on punch cards in batches; interactive terminals barely existed.',
      coda: "Two years later he ran a new Pentagon office and funded the project that became ARPANET.",
    },
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
    zh: {
      tag: "起源",
      title: "打印出来的口令",
      body: "1962年,MIT博士生谢尔嫌CTSS每周四小时机时不够,发现离线打印指令能读任何账户文件,打印出存口令的UACCNT.SECRET,分给同学借账号。",
      coda: "谢尔近三十年后才向系主任承认。",
    },
    en: {
      tag: "Origin",
      title: "The Password File, Printed",
      body: "In 1962, MIT PhD student Allan Scherr was frustrated with his four hours a week on CTSS. He found the offline print command could pull any account's files, so he printed UACCNT.SECRET, the file holding every password, and shared it to borrow accounts and keep running his simulations.",
      coda: "Scherr did not admit it to the lab's director until nearly thirty years later.",
    },
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
    zh: {
      tag: "记录",
      title: "让那位女士核实一下",
      body: "1962年,格伦升空前要求约翰逊手工复核IBM 7090算出的轨道参数。他说,若她说没问题,我就飞。约翰逊重算一遍,数字和电子计算机完全一致。",
      coda: "1962年2月20日,友谊七号如期升空。",
    },
    en: {
      tag: "Record",
      title: "Have the Girl Check It",
      body: "Before his 1962 orbital flight, John Glenn had engineers ask Katherine Johnson to hand-recompute the trajectory an IBM 7090 had already calculated. 'If she says they're good,' he said, 'I'm ready to go.' Her numbers matched the computer's exactly.",
      coda: "Friendship 7 launched on schedule, February 20, 1962.",
    },
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
    zh: {
      tag: "词源",
      title: "守护进程的守护",
      body: "1963年,MIT程序员给后台备份程序取名daemon,取自1867年「麦克斯韦妖」——不知疲倦分拣分子的隐形代理。「磁盘执行监视器」这缩写是后配的。",
      coda: "缩写解释先有词,后配理由。",
    },
    en: {
      tag: "Etymology",
      title: "The Daemon's Retrofitted Acronym",
      body: "In 1963, MIT's Project MAC programmers named a background tape-backup process after Maxwell's demon, an 1867 thought-experiment agent that sorts molecules tirelessly and invisibly — the Greek daimon, a neutral spirit, not the Judeo-Christian devil.",
      coda: '"Disk And Execution MONitor" was fitted onto the word afterward.',
    },
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
    zh: {
      tag: "起源",
      title: "光笔与示波器",
      body: "1963年1月,萨瑟兰提交博士论文Sketchpad,用光笔在TX-2屏幕上画图、定义几何约束。机器造价近百万美元,全球只有几台,画板没法交给别人用。",
      coda: "CAD软件用了近二十年才追上论文描述的功能。",
    },
    en: {
      tag: "Origin",
      title: "A Light Pen and an Oscilloscope",
      body: "In January 1963, Ivan Sutherland submitted his MIT thesis on Sketchpad, drawing constrained geometry with a light pen on the TX-2's screen at Lincoln Laboratory. The machine cost roughly a million dollars and only a handful existed; his drawing board could not be handed to anyone else.",
      coda: "Commercial CAD software took close to two decades to match what the thesis had shown.",
    },
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
    zh: {
      tag: "备忘录",
      title: "花园水管的备忘录",
      body: "1964年10月,麦克罗伊写备忘录,建议程序像花园水管,拧一段接到下个输入。备忘录传阅一时人人称赞,却没实现。九年后一夜,汤普森给shell加了个|。",
      coda: "第二天早上,互不相识的程序开始说话。",
    },
    en: {
      tag: "Memo",
      title: "The Garden Hose Memo",
      body: "In October 1964, McIlroy wrote a Bell Labs memo proposing programs connect like garden hoses — screw in another segment to massage data differently. It circulated, was admired, and went unbuilt. Nine years later, Ken Thompson added one character, |, to the Unix shell overnight.",
      coda: "By morning, programs that had never spoken to each other did.",
    },
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
    zh: {
      tag: "意气用事",
      title: "赌气买下的纺织厂",
      body: "1964年,巴菲特与伯克希尔总裁Stanton谈定每股11.5美元卖股,书面要约却写成11.375美元。他被这八分之一美元气到,买下公司控制权。",
      coda: "1985年,他关掉了自己抢来的纺织厂。",
    },
    en: {
      tag: "Spite",
      title: "The Mill Bought Out of Anger",
      body: "In 1964 Warren Buffett verbally agreed to sell his shares back to Berkshire's president, Seabury Stanton, at $11.50 each. The written tender offer came in at $11.375. Buffett was angry enough over the missing eighth that he bought control of the company instead and fired Stanton.",
      coda: "In 1985 he shut down the textile mills he had fought to keep.",
    },
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
    zh: {
      tag: "起源",
      title: "链接先于网页",
      body: "1965年,纳尔逊在ACM论文里提出「超文本」,构想跳转互引的文档,1960年已为此立项Xanadu。他设想按次计费原作者,2014年才发布残缺实现。",
      coda: "万维网用了他的名词,没用计费机制。",
    },
    en: {
      tag: "Origin",
      title: "The Link Before the Page",
      body: 'In a 1965 ACM paper, Ted Nelson coined "hypertext" for documents that link and quote each other non-sequentially, building on a project he had started in 1960 and later named Xanadu. His version paid original authors per link followed. A partial implementation did not ship until 2014.',
      coda: "The Web adopted his vocabulary and left the payment mechanism behind.",
    },
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
    zh: {
      tag: "记录",
      title: "客厅里的实验室机",
      body: "1965年,威尔克斯把250磅的LINC搬进父母家客厅,写完操作系统LAP6,比苹果二代早十二年。问她是否首位家用电脑用户,她说,我想我可能是吧。",
      coda: "她自己,从没肯定过这个头衔。",
    },
    en: {
      tag: "Record",
      title: "The LINC in the Living Room",
      body: "In 1965, Wilkes moved a 250-pound LINC computer into her parents' Baltimore living room and wrote LAP6, an interactive operating system, alone — twelve years before the Apple II reached any home. Asked if she was first, she said only: 'I guess I might have been.'",
      coda: "She never claimed the title outright herself.",
    },
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
    zh: {
      tag: "反思",
      title: "空引用的诱惑",
      body: "1965年,霍尔为ALGOL W设计首个类型系统,目标是让引用绝对安全,却仍加入空引用,只因实现太容易。2009年,他称此为「十亿美元的错误」。",
      coda: "错误不在类型系统,在于图省事的那一刻。",
    },
    en: {
      tag: "Confession",
      title: "The Reference He Added Anyway",
      body: "In 1965 Tony Hoare was building the first type system meant to make ALGOL W references provably safe at compile time. He added a null reference anyway, because it was easy to implement. In 2009 he called it his billion-dollar mistake.",
      coda: "The safety goal was explicit; the failure was that ease won anyway.",
    },
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
    zh: {
      tag: "触屏",
      title: "谁先造出触屏",
      body: "CERN官方资料称,斯顿普1972年为加速器控制室造出世界第一块电容触屏。但英国雷达研究院的约翰逊1965年已发表手指电容触控论文,早七年。",
      coda: "「世界第一」的说法,如今仍挂在CERN自己的网站上。",
    },
    en: {
      tag: "Touchscreen",
      title: "Who Actually Was First",
      body: "CERN credits Bent Stumpe with building the world's first capacitive touchscreen in 1972, for its accelerator control room. Eric Johnson of Britain's Royal Radar Establishment had already published a paper on finger-driven capacitive touch technology in 1965, seven years earlier.",
      coda: "CERN's claim to have built the first touchscreen still stands on its own website.",
    },
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
    zh: {
      tag: "计量",
      title: "9192631770次",
      body: "1960年前,一秒是1900年回归年的一个分数,由天文观测定义。1967年国际计量大会改用铯133,把一秒定为9192631770个辐射周期。",
      coda: "一秒不再由太阳决定,改由原子决定。",
    },
    en: {
      tag: "Metrology",
      title: "9,192,631,770 Cycles",
      body: "Until 1960, the second was a fraction of the 1900 tropical year, fixed by astronomical observation. In 1967 the General Conference on Weights and Measures redefined it as 9,192,631,770 cycles of a caesium-133 transition.",
      coda: "The length of a second stopped being set by the sun and started being set by an atom.",
    },
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
    zh: {
      tag: "考据",
      title: "标题不是他起的",
      body: "迪杰斯特拉投给CACM原题「反对goto语句」,编辑沃思赶稿期间自行改题为「goto语句有害论」。此后数十年,引用此标题的人远多于读过正文的人。",
      coda: "标题成了模板,正文渐被遗忘。",
    },
    en: {
      tag: "Correction",
      title: "The Title He Did Not Write",
      body: "Dijkstra submitted a paper titled A Case against the GO TO Statement to CACM. Editor Niklaus Wirth, rushing it into print as a letter, gave it the title that made it famous: Go To Statement Considered Harmful.",
      coda: "The phrase outran the letter, spawning decades of 'X Considered Harmful' titles nobody read past.",
    },
  },
  {
    id: "rollkugel-vs-mouse",
    stamp: "1968",
    sources: [
      { label: 'Wikipedia, "Computer mouse"', url: "https://en.wikipedia.org/wiki/Computer_mouse" },
      { label: 'Wikipedia, "Rollkugel"', url: "https://en.wikipedia.org/wiki/Rollkugel" },
    ],
    zh: {
      tag: "鼠标",
      title: "两只老鼠",
      body: "1968年10月,德律风根手册列出Rollkugel鼠标,1966年造的滚球装置。12月9日,恩格尔巴特演示他1963年做的木盒鼠标。双方互不知情。",
      coda: "先上市的那只鼠标,没人记得它的名字。",
    },
    en: {
      tag: "Mouse",
      title: "Two Mice, One Year",
      body: "In October 1968, Telefunken listed the Rollkugel mouse in a sales brochure, a rolling-ball device its engineers had built since 1966. Two months later, on December 9, Douglas Engelbart demonstrated the wooden mouse his SRI team had built since 1963. Neither team knew of the other.",
      coda: "Telefunken reached the market first and was forgotten; Engelbart came second and is what people mean by mouse.",
    },
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
    zh: {
      tag: "实证",
      title: "升到不称职为止",
      body: "1969年,彼得与赫尔在畅销书中戏称,每个员工终将升至自己不称职的那一级,原是讽刺之作。2019年,一项企业销售晋升数据的实证研究证实了这个笑话。",
      coda: "玩笑话后来成了论文里的显著系数。",
    },
    en: {
      tag: "Study",
      title: "Promoted to Incompetence",
      body: "In 1969, Laurence Peter and Raymond Hull half-joked in a bestseller that every employee rises to the level where they become incompetent, meant as satire. In 2019 a study of sales-force promotion data at 214 real firms found the joke held: top sellers made worse managers.",
      coda: "The punchline turned out to be a measurable, published regression coefficient.",
    },
  },
  {
    id: "lanpar-vs-visicalc",
    stamp: "1969 · 1979",
    sources: [
      { label: 'Wikipedia, "LANPAR"', url: "https://en.wikipedia.org/wiki/LANPAR" },
      { label: 'Wikipedia, "Spreadsheet"', url: "https://en.wikipedia.org/wiki/Spreadsheet" },
    ],
    zh: {
      tag: "表格",
      title: "没被命名的表格",
      body: "1969年,Pardo与Landau写出LANPAR,能任意顺序输公式自动运算,贝尔与通用都用它。1979年,布里克林做VisiCalc时不知它存在。",
      coda: "杂志把「第一款电子表格」的名号给了后来者。",
    },
    en: {
      tag: "Spreadsheet",
      title: "The Spreadsheet Nobody Named",
      body: "In summer 1969, Harvard graduates Rene Pardo and Remy Landau wrote LANPAR, a spreadsheet language that let users enter formulas in any order and still calculated correctly. Bell Canada and General Motors ran on it. In 1979, Dan Bricklin built VisiCalc without knowing LANPAR existed.",
      coda: "LANPAR's patent survived a court challenge through 1983; the magazines had already named VisiCalc first.",
    },
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
    zh: {
      tag: "词源",
      title: "垃圾邮件前传",
      body: "1970年,Monty Python小品里维京人齐唱「spam」盖过对白,嘲讽午餐肉过量。此梗先在80年代末MUD里指刷屏,九十年代初才转移到邮件。",
      coda: "命名它的不是发广告的人。",
    },
    en: {
      tag: "Etymology",
      title: "Spam, Before Marketing",
      body: "In a 1970 sketch, Monty Python's Vikings chant \"spam\" over a diner's dialogue, mocking a glut of canned meat on the menu. The joke migrated into MUD chatrooms by the late 1980s for chat flooding, then onto email by the early 1990s.",
      coda: "The word reached inboxes by way of a comedy sketch about lunch.",
    },
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
    zh: {
      tag: "起源",
      title: "未被采用的模型",
      body: "1970年,IBM研究员科德发表关系模型论文,公司主力产品是层级数据库,不急着采纳。埃里森读了论文和System R报告,抢先卖出首款商用关系数据库。",
      coda: "IBM的DB2直到1983年才上市。",
    },
    en: {
      tag: "Origin",
      title: "The Paper Its Employer Ignored",
      body: "In 1970, IBM researcher Edgar Codd published the relational model. IBM's flagship product was hierarchical, and the company was in no hurry to adopt his idea. Larry Ellison read Codd's paper and IBM's own System R reports, then shipped a commercial relational database first, in 1979.",
      coda: "IBM's own relational product, DB2, did not ship until 1983.",
    },
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
    zh: {
      tag: "算法",
      title: "被漏掉的引用",
      body: "1970年,芬兰学生Linnainmaa在硕士论文中给出反向模式自动微分算法。1986年,鲁梅尔哈特等人在《自然》发表同一算法训练神经网络,未提到他。",
      coda: "论文在图书馆放了十六年才被重新翻出。",
    },
    en: {
      tag: "Algorithm",
      title: "The Missing Citation",
      body: "In 1970, Finnish student Seppo Linnainmaa published the complete algorithm for reverse-mode automatic differentiation, with working code, in his master's thesis. In 1986, Rumelhart, Hinton and Williams published the same method in Nature to train neural networks. They did not cite him.",
      coda: "Linnainmaa's thesis sat uncited for sixteen years before historians of the field dug it back up.",
    },
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
    zh: {
      tag: "词源",
      title: "@ 没有别的含义",
      body: "1971年,BBN工程师汤姆林森要选用户名与主机名间的分隔符,唯一条件是不出现在任何人名里。他扫了眼键盘,选中当时几乎只有商人在用的@。",
      coda: "这个符号被选中,只因为它够生僻。",
    },
    en: {
      tag: "Etymology",
      title: "The Only Unused Key",
      body: "In 1971, BBN engineer Ray Tomlinson needed a separator between username and host that could never appear in an actual person's name. Scanning his Model 33 Teletype keyboard, he picked @ — a character then used almost exclusively by grocers and bookkeepers.",
      coda: "Every email address since has carried that one constraint forward.",
    },
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
    zh: {
      tag: "方法论",
      title: "模块该怎么切",
      body: "1972年,帕纳斯以KWIC索引对比两种分模块方式:一种按处理步骤,一种按可能变化的设计决策并隐藏细节,后者改一处无需读懂全部,此法后称「信息隐藏」。",
      coda: "模块的边界,画的其实是未来维护者要知道多少。",
    },
    en: {
      tag: "Method",
      title: "Where to Cut a Module",
      body: "In 1972 David Parnas split the same KWIC-index system into modules two ways: one by processing step, one by the design decisions most likely to change, each hidden behind an interface. Only the second let a change touch one module without anyone reading the rest.",
      coda: "The module boundary turned out to encode a guess about what a future maintainer would need to know.",
    },
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
    zh: {
      tag: "记录",
      title: "没人道谢的公式",
      body: "1972年,斯帕克·琼斯发表论文,提出用词语的稀有程度衡量分量,即逆文档频率,后来撑起几乎所有搜索排序。她本人在剑桥,直到1993年才拿到长聘职位。",
      coda: "此前,她做了三十多年的短期合同研究员。",
    },
    en: {
      tag: "Record",
      title: "The Formula Nobody Thanks",
      body: "In 1972, Spärck Jones published a paper proposing that a word's rarity across a document collection measures its importance — inverse document frequency, now under the ranking logic of nearly every search engine. She got no permanent post at Cambridge until 1993.",
      coda: "Until then she had worked a run of short-term, soft-money contracts.",
    },
  },
  {
    id: "cyclades-pouzin-tcpip",
    stamp: "1972 · 2004",
    sources: [{ label: 'Wikipedia, "CYCLADES"', url: "https://en.wikipedia.org/wiki/CYCLADES" }],
    zh: {
      tag: "互联网",
      title: "互联网的第五人",
      body: "1972年,普赞在法国建成CYCLADES网络,首创主机负责数据传递。1974年,瑟夫与卡恩的TCP论文感谢他。2004年二人获图灵奖,名单没有普赞。",
      coda: "《经济学人》后来称他为「互联网的第五人」。",
    },
    en: {
      tag: "Internet",
      title: "The Internet's Fifth Man",
      body: "In 1972, Louis Pouzin built the CYCLADES network in France, the first to make end hosts, not the network, responsible for reliable delivery. In 1974, Cerf and Kahn's TCP paper thanked him by name. In 2004, Cerf and Kahn won the Turing Award. Pouzin's name was not on it.",
      coda: "The Economist later called him the internet's fifth man.",
    },
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
    zh: {
      tag: "起源",
      title: "以太备忘录",
      body: "1973年5月22日,梅特卡夫写下备忘录「以太获取」,手绘草图画的是一根电缆连接阿尔托机器。它常被记成1976年那篇论文,真正的草图早了三年。",
      coda: "论文发表时,以太网已跑了三年。",
    },
    en: {
      tag: "Origin",
      title: "The Ether Memo",
      body: 'On May 22, 1973, Robert Metcalfe wrote a Xerox PARC memo titled "Ether Acquisition," with a hand-drawn diagram of a shared cable linking Alto computers. The technology is usually dated to the 1976 journal paper. The actual sketch is three years older, and hand-drawn.',
      coda: "By the time the paper was published, Ethernet had already run inside PARC for three years.",
    },
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
    zh: {
      tag: "轶事",
      title: "信封背面",
      body: "互联网起源的传说说,瑟夫把网关架构画在餐巾纸背面。他本人纠正过,那不是餐巾纸,是信封背面。1973年,他在酒店大堂,顺手画下了后来的TCP/IP草图。",
      coda: "次年,这份草图变成论文,发在IEEE通信汇刊上。",
    },
    en: {
      tag: "Anecdote",
      title: "The Back of an Envelope",
      body: "The internet's founding legend says Cerf sketched the gateway architecture on a napkin. He has corrected this: 'It wasn't a napkin, actually, it was the back of an envelope.' In 1973, waiting in a hotel lobby, he sketched what became TCP/IP's gateway design.",
      coda: "The following year, the sketch became a paper in IEEE Transactions on Communications.",
    },
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
    zh: {
      tag: "密码",
      title: "未公开的钥匙",
      body: "1973年,22岁的Cocks入职GCHQ,半小时写出无需共享密钥的加密方案。1976年迪菲等人在美国发表同一构想,写进教科书。文件1997年解密。",
      coda: "1997年,Ellis去世,距解密只隔几个月。",
    },
    en: {
      tag: "Cryptography",
      title: "The Unpublished Key",
      body: "In September 1973, 22-year-old Clifford Cocks, newly arrived at GCHQ, worked out a shared-key-free encryption scheme in half an hour. Three years later, Diffie, Hellman and Merkle published the same idea in the US and were credited as its inventors. GCHQ files stayed classified until 1997.",
      coda: "James Ellis died in 1997, a few months after the declassification that put his name on the record.",
    },
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
    zh: {
      tag: "搁置",
      title: "柯达雪藏数码相机",
      body: "1975年,24岁的萨森造出首台数码相机,8磅重,拍一张要23秒。管理层判断没人愿在电视上看照片,印刷用了上百年又便宜。柯达只申请专利,不出产品。",
      coda: "柯达2012年申请破产保护。",
    },
    en: {
      tag: "Shelved",
      title: "Kodak's Buried Camera",
      body: "In 1975, 24-year-old engineer Steven Sasson built the first digital camera: 8 pounds, 23 seconds per shot. Executives reasoned that no one would want to view pictures on a television when print was cheap and had worked for a century. They patented the camera and shelved it.",
      coda: "Kodak filed for bankruptcy protection in 2012.",
    },
  },
  {
    id: "galls-law-origin",
    stamp: "1975",
    sources: [
      { label: 'Wikipedia, "Systemantics"', url: "https://en.wikipedia.org/wiki/Systemantics" },
    ],
    zh: {
      tag: "轶事",
      title: "系统圣经",
      body: "1975年,儿科医生高尔遭30家出版社拒稿后自费出书,称复杂系统必由简单系统演化,凭空设计的复杂系统从未奏效。原书讲官僚机构,却成软件架构口头禅。",
      coda: "一句讲医院和政府的话,喂养了整套软件架构话语。",
    },
    en: {
      tag: "Origin",
      title: "A Book About Bureaucracies",
      body: "In 1975, after 30 publishers rejected it, pediatrician John Gall self-published Systemantics: a working complex system invariably evolves from a working simple system, and a complex system built from scratch never works. He was writing about hospitals and government agencies.",
      coda: "Software architects kept the line and quietly dropped the bureaucracies it was written about.",
    },
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
    zh: {
      tag: "曲解",
      title: "奥尔森的家用电脑",
      body: "1977年,DEC创始人奥尔森说,个人不需要在家放一台电脑。原意是不需要一台中央机替家庭开灯调温选节目,这判断在他的语境里是准的,媒体只截了前半句。",
      coda: "奥尔森本人当时家里就有电脑。",
    },
    en: {
      tag: "Misquote",
      title: "Olsen's Home Computer",
      body: "In 1977, DEC founder Ken Olsen said there was no reason for an individual to have a computer in the home. He meant one central machine running the lights, heat and entertainment for a household, accurate for the thing he described. Coverage kept only the first half of the sentence.",
      coda: "Olsen himself owned a computer at home at the time.",
    },
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
    zh: {
      tag: "格言",
      title: "比写代码难一倍",
      body: "1978年,克尼汉与普劳格写道:调试比编写难一倍,写代码时若已用尽聪明,调试时便无计可施。这条风格准则说的其实是同一人两次面对自己代码的落差。",
      coda: "对手不是别人的代码,是几周后的自己。",
    },
    en: {
      tag: "Maxim",
      title: "Twice as Hard as Writing It",
      body: "In the 1978 Elements of Programming Style, Kernighan and Plauger wrote that debugging is twice as hard as writing a program, so writing it as cleverly as you can leaves you, by definition, not smart enough to debug it. A style rule stated as a limit on meeting your own work twice.",
      coda: "The adversary was never someone else, it was you a few weeks later.",
    },
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
    zh: {
      tag: "起源",
      title: "施乐的交易",
      body: "1979年12月,施乐买入10万股苹果预上市股票,换来PARC参观权。乔布斯说图形界面是此生所见最好的。传闻是偷师,记录却是一笔股权交易。",
      coda: "施乐拿到股票,阿尔托始终没量产上市。",
    },
    en: {
      tag: "Origin",
      title: "Xerox's Own Deal",
      body: "December 1979: Apple toured Xerox PARC after Xerox agreed to buy 100,000 pre-IPO Apple shares at $10 each for the access. Jobs saw the Alto's graphical interface and called it the best thing he'd ever seen. The popular story is theft; the record is a trade Xerox negotiated.",
      coda: "Xerox got its shares. The Alto was never sold as a commercial product.",
    },
  },
  {
    id: "visicalc-1979-no-patent",
    stamp: "1979",
    sources: [
      { label: 'Dan Bricklin, "Patenting VisiCalc"', url: "http://www.bricklin.com/patenting.htm" },
      { label: 'Wikipedia, "VisiCalc"', url: "https://en.wikipedia.org/wiki/VisiCalc" },
    ],
    zh: {
      tag: "起源",
      title: "没申请的专利",
      body: "1979年VisiCalc发布前,律师给出的专利成功率约一成,软件当时难算专利发明,只留版权商标。1983年Lotus 1-2-3照接口做出了兼容品。",
      coda: "电子表格留下了,VisiCalc这家公司没有。",
    },
    en: {
      tag: "Origin",
      title: "The Patent They Skipped",
      body: "Before VisiCalc's 1979 release, Dan Bricklin consulted a patent attorney, who put the odds of success at about one in ten under the era's rules. They filed for copyright and trademark instead. In 1983, Lotus 1-2-3 shipped a compatible interface that could read VisiCalc's own files.",
      coda: "The spreadsheet survived as a category. The company that built it did not.",
    },
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
    zh: {
      tag: "条款",
      title: "IBM留了个口子",
      body: "1980年11月,IBM深陷反垄断案十余年,签约时刻意不锁死供应商,条款允许微软把DOS另卖给其他厂商。这个避险判断当时是站得住的。",
      coda: "克隆机随后蜂起,IBM未再掌控这个平台。",
    },
    en: {
      tag: "Clause",
      title: "IBM Leaves a Door Open",
      body: "IBM signed with Microsoft on the PC's operating system on November 6, 1980. Deep in a decade-plus antitrust case, IBM chose not to control its suppliers, and let Microsoft resell DOS to anyone else. As a hedge against another lawsuit, it made sense at the time.",
      coda: "Clone makers followed within years, and IBM never regained control of the platform.",
    },
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
    zh: {
      tag: "治理",
      title: "稳健原则的反转",
      body: "Postel在1980年TCP规范里写「发送保守,接收宽容」,奉为互联网黄金律。2023年IETF反悔,称宽容纵容协议缺陷,系统反更脆弱。",
      coda: "被自己的作者机构撤回的黄金律。",
    },
    en: {
      tag: "Governance",
      title: "The Robustness Principle, Reversed",
      body: "RFC 761 (1980) urged implementers to be liberal in what they accept, conservative in what they send. In 2023 the IETF's own architecture board reversed that guidance in RFC 9413: leniency lets bugs calcify into de facto standards, leaving systems less robust, not more.",
      coda: "The standard that told the internet to be lenient was rescinded by its own custodians.",
    },
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
    zh: {
      tag: "论文",
      title: "哑网络的论据",
      body: "1981年,索尔泽等人论证:文件校验只有通信两端应用程序能做对,底层网络再费力也补不全。这篇讨论校验位置的论文,后来成了「网络应保持简单」的理论基石。",
      coda: "一份校验位置的工程笔记,长成了网络中立的政治论据。",
    },
    en: {
      tag: "Paper",
      title: "An Argument for a Dumb Network",
      body: "In 1981 Saltzer, Reed, and Clark argued that checking a transferred file for errors can only be done correctly at the two endpoints; the network can help but never fully substitute. A paper about where to put a checksum became the founding case for keeping networks simple.",
      coda: "A note on error-checking placement grew into the case for net neutrality.",
    },
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
    zh: {
      tag: "遗留",
      title: "1900年的闰年",
      body: "Lotus 1-2-3把1900年错记成闰年,只为方便计算。微软为兼容它照抄了错误,如今仍写进Office Open XML标准。",
      coda: "抄错的兼容选择,变成了标准。",
    },
    en: {
      tag: "Legacy",
      title: "The Leap Year That Wasn't",
      body: "Lotus 1-2-3 treated 1900 as a leap year, a harmless shortcut. Microsoft copied the same false date to stay compatible. Lotus is gone; the false leap day remains, now written into the Office Open XML specification.",
      coda: "A compatibility hack for a discontinued rival is now a written standard.",
    },
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
    zh: {
      tag: "词源",
      title: "化身早于雪崩",
      body: "通常认为「avatar」网络分身用法来自1992年小说《雪崩》。但Habitat项目1985年已在用,论文写「玩家由Avatar形象代表」。",
      coda: "这个用法在小说出版前已经跑在商用服务器上七年。",
    },
    en: {
      tag: "Etymology",
      title: "An Avatar Before the Novel",
      body: 'Neal Stephenson\'s 1992 novel Snow Crash is usually credited with the online sense of "avatar." But Lucasfilm\'s Habitat, running on Commodore 64s since 1985, already wrote: "players are represented by animated figures that we call Avatars," from Sanskrit for incarnation.',
      coda: "The term was live on a commercial service seven years before the book.",
    },
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
    zh: {
      tag: "轶事",
      title: "生成树的诗",
      body: "1985年,DEC的经理周五交代任务后消失了一整周,要她设计不成环的网桥协议。佩尔曼周三就写完了生成树算法,剩下几天全用来写一首诗,当作论文的摘要。",
      coda: "那首诗写得,比算法还久。",
    },
    en: {
      tag: "Anecdote",
      title: "Algorhyme",
      body: "In 1985, Perlman's manager at DEC assigned the loop-free bridging problem on a Friday, then vanished for a week. She had the spanning-tree algorithm finished by Wednesday — and spent the rest writing Algorhyme, a poem that became the paper's abstract.",
      coda: "The poem took longer to write than the algorithm.",
    },
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
    zh: {
      tag: "论文",
      title: "没有银弹",
      body: "1986年,布鲁克斯在IFIP大会上提出,软件困难分本质与偶然两种,偶然性困难已大幅减少,但没有一项技术能在十年内让生产率提升十倍。",
      coda: "四十年过去,银弹仍在被下一个范式重新叫卖。",
    },
    en: {
      tag: "Essay",
      title: "No Silver Bullet",
      body: "At the 1986 IFIP congress, Fred Brooks split software difficulty into essential and accidental complexity. Accidental difficulty had fallen sharply, he said, but no single technique would deliver a tenfold productivity gain within a decade.",
      coda: "Four decades on, each new paradigm still gets sold as the bullet he said did not exist.",
    },
  },
  {
    id: "tz-olson-database",
    stamp: "1986 · 2011",
    sources: [
      { label: "Wikipedia — Tz database", url: "https://en.wikipedia.org/wiki/Tz_database" },
    ],
    zh: {
      tag: "命名",
      title: "奥尔森数据库",
      body: "多数设备的时区规则都来自同一份志愿维护的数据库,人称「奥尔森数据库」,纪念创始人奥尔森。但地区命名规则出自保罗·埃格特,他自2005年起才是主编。",
      coda: "被冠名的人和现在维护它的人是两个人。",
    },
    en: {
      tag: "Naming",
      title: "The Olson Database",
      body: "Most devices resolve timezones against one volunteer-run file set, informally called the Olson database after founder Arthur David Olson. Its naming scheme is credited to Paul Eggert, who has actually edited the database since 2005.",
      coda: "The eponym and the person who has maintained it since are different people.",
    },
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
    zh: {
      tag: "记录",
      title: "长城之外",
      body: "官方说法称钱天白独自发出中国首封邮件「越过长城,走向世界」。当时他仍在美国留学,真正执笔的是李澄炯与德国教授措恩,联署者共十三人。",
      coda: "讣告仍称他是发件人。",
    },
    en: {
      tag: "Record",
      title: "Beyond the Wall",
      body: "Retellings credit Qian Tianbai alone with China's first email, 'Across the Great Wall we can reach every corner of the world.' Qian was studying in the US that month; it was typed by Li Chengjiong and Karlsruhe's Werner Zorn, and left China six days later, on September 20.",
      coda: "His obituaries still list him as the sender.",
    },
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
    zh: {
      tag: "原则",
      title: "一条她没命名的定律",
      body: "1987年,利斯科夫在OOPSLA演讲提出,替换S与T对象若不改变行为,S即T子类型,她称之为替换性质。多年后马丁把它写进SOLID,冠上她的名字。",
      coda: "“原则”二字,是后来别人加上的。",
    },
    en: {
      tag: "Principle",
      title: "The Law She Never Named",
      body: "In a 1987 OOPSLA keynote, Barbara Liskov proposed that if substituting an object of type S for type T left every program's behavior unchanged, S was a subtype of T. She called it a substitution property. Years later, Robert Martin folded it into SOLID and named it after her.",
      coda: "The word 'principle' was someone else's addition.",
    },
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
    zh: {
      tag: "笔控",
      title: "卖不出的手写屏",
      body: "1987年,卡普兰创立Go公司,开发笔控系统PenPoint,融资7500万美元。1994年被AT&T收购,两周后砍配套芯片,7月关闭。",
      coda: "2010年,苹果推出电容多点触控的iPad。",
    },
    en: {
      tag: "Pen computing",
      title: "The Tablet Nobody Bought",
      body: 'In 1987 Jerry Kaplan started GO Corporation to build the pen-based PenPoint operating system, raising $75 million. AT&T acquired GO in January 1994, cancelled its supporting chip line two weeks later, and GO closed that July. Kaplan later said the company had "no meaningful sales."',
      coda: "In 2010 Apple released the iPad, a capacitive multitouch tablet.",
    },
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
    zh: {
      tag: "标准",
      title: "ISO 8601窄替身",
      body: "1988年,ISO 8601问世,合并五份互相冲突的旧日期标准。但今天网络协议引用的多是1997年RFC 3339,一份更窄的子集,并不完全兼容原版。",
      coda: "通用标准之下,真正跑的是它的窄化版本。",
    },
    en: {
      tag: "Standard",
      title: "ISO 8601's Narrower Stand-in",
      body: "ISO 8601 was first published in 1988, unifying five earlier, conflicting ISO date-and-time standards into one. But the format most internet software validates against is RFC 3339 (1997), a narrower profile that, after ISO 8601's later revision, is not even a strict subset of it.",
      coda: "The standard everyone cites and the dialect everyone's code checks against are not the same document.",
    },
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
    zh: {
      tag: "脚本",
      title: "圣诞节的业余项目",
      body: "1989年圣诞节假期,阿姆斯特丹一名研究员因为办公室放假,想找点编程消遣,着手写一个新脚本语言的解释器,取名字时想到了一部喜剧团体的名字。",
      coda: "2026年7月,它在TIOBE编程语言排行榜上排名第一。",
    },
    en: {
      tag: "Scripting",
      title: "A Christmas Hobby",
      body: "During the Christmas holidays of 1989, with his office closed for the week, a researcher in Amsterdam looked for a hobby programming project. He began writing an interpreter for a new scripting language and named it after a comedy troupe, not the snake.",
      coda: "In July 2026 it ranked first on the TIOBE index of programming language popularity.",
    },
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
    zh: {
      tag: "论战",
      title: "更差即更好",
      body: "1989年,加布里埃尔提出「更差即更好」,称简单实现比求全更易存活,借此解释Lisp输给C与Unix。1991年他化名旧友撰文反驳自己。",
      coda: "他晚年承认,自己始终无法决定这个观点对不对。",
    },
    en: {
      tag: "Debate",
      title: "Worse Is Better",
      body: "In 1989 Richard Gabriel coined 'worse is better': a simple, half-right implementation survives better than a complete, correct one, which is why he thought C and Unix beat Lisp. In 1991 he published a rebuttal under the pseudonym Nickieben Bourbaki, posing as an old friend.",
      coda: "Decades later he still said he could not decide whether his own argument was right.",
    },
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
    zh: {
      tag: "事故",
      title: "用鸽子跑的互联网协议",
      body: "1990年4月1日,RFC 1149愚人节式规定用信鸽传IP数据包。2001年,卑尔根Linux用户组真做了测试:9个包,4个收到,丢包过半。",
      coda: "玩笑协议真的被人接了线,还丢了一半包。",
    },
    en: {
      tag: "Incident",
      title: "The Protocol Someone Actually Flew",
      body: "David Waitzman published RFC 1149 on April Fools' Day, 1990: a spec for carrying IP datagrams by pigeon. On April 28, 2001, the Bergen Linux User Group actually built it, launching nine ping packets over roughly 5 km. Four came back — a 55% loss rate, round trips running 53 to 106 minutes.",
      coda: "The joke RFC has a real packet-loss figure on record: 55 percent.",
    },
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
    zh: {
      tag: "事故",
      title: "一个break的位置",
      body: "纽约一台4ESS交换机的恢复程序里,break语句嵌错层级,极小概率才触发。重启后的「就绪」信号被邻近交换机误读为异常,连锁扩散,近半长途电话打不通。",
      coda: "程序员以为那个break管的是if,不是switch。",
    },
    en: {
      tag: "Incident",
      title: "The Misplaced Break",
      body: 'A recovery routine on a New York 4ESS switch held a break statement nested one level too shallow, a defect testing never exercised. A restart\'s routine "ready" signal was then misread by neighboring switches as an error, and the false alarm cascaded through the network for nine hours.',
      coda: "AT&T later put the lost revenue at sixty million dollars.",
    },
  },
  {
    id: "aspec-vs-musicam",
    stamp: "1990 · 1991",
    sources: [{ label: 'Wikipedia, "MP3"', url: "https://en.wikipedia.org/wiki/MP3" }],
    zh: {
      tag: "音频",
      title: "输给简单的方案",
      body: "1991年,MPEG测试两套音频方案:ASPEC音质更好却太复杂被淘汰;松下、飞利浦的MUSICAM因简单胜出。MP3定稿时拿回了ASPEC的思路。",
      coda: "赢的方案输了名字,输的方案赢了声誉。",
    },
    en: {
      tag: "Audio",
      title: "Losing to the Simpler One",
      body: "In 1991, MPEG tested two rival audio codecs. ASPEC, built by Fraunhofer, AT&T and France's CNET, won the quality tests but was ruled too complex. MUSICAM, from Matsushita and Philips, won on simplicity. The finished MP3 folded ASPEC's filter design back in anyway.",
      coda: "The format everyone calls MP3 carries the losing proposal's engineering inside the winning one's name.",
    },
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
    zh: {
      tag: "内核",
      title: "新闻组里的公告",
      body: "1991年8月25日,赫尔辛基一名学生在comp.os.minix发帖,称在写个免费系统,「只是业余玩玩,不会像GNU那样大那样专业」。",
      coda: "2017年起,全球前500台超算全部运行这套系统。",
    },
    en: {
      tag: "Kernel",
      title: "A Post to comp.os.minix",
      body: 'On August 25, 1991, a Helsinki university student posted to the comp.os.minix newsgroup that he was writing a free operating system, calling it "just a hobby, won\'t be big and professional like gnu," and asked what features people wanted.',
      coda: "Since November 2017, all 500 of the world's fastest supercomputers have run an OS built on it.",
    },
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
    zh: {
      tag: "互联网",
      title: "免费赢了收费",
      body: "1991年,伯纳斯-李从CERN发布万维网,同年明大发布Gopher协议,更受欢迎。1993年,明大宣布Gopher收费,CERN免费公开网页协议。",
      coda: "收费公告发出后,Gopher再没追上过网页。",
    },
    en: {
      tag: "Web",
      title: "Free Beat Priced",
      body: "In 1991, Tim Berners-Lee released the World Wide Web from CERN. That same year, the University of Minnesota released Gopher, for a time the more popular system. In February 1993, Minnesota announced licensing fees for Gopher servers. That April, CERN made the web protocol free.",
      coda: "Gopher had the bigger following before the fee announcement, and never had it again afterward.",
    },
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
    zh: {
      tag: "治理",
      title: "粗略共识与运行代码",
      body: "1992年,Dave Clark在IETF幻灯片写下「拒绝国王总统投票,只信粗略共识与运行代码」。这句治理宪法引语,原是嘲讽OSI投票制玩笑。",
      coda: "讽刺幻灯片成了互联网治理的引语源头。",
    },
    en: {
      tag: "Governance",
      title: "Rough Consensus, Running Code",
      body: "At the July 1992 IETF meeting, MIT's Dave Clark put up a slide: 'We reject kings, presidents and voting. We believe in rough consensus and running code.' The phrase now anchors internet-governance folklore. It began as a jab at OSI's formal committee voting process.",
      coda: "The joke slide about OSI's voting rules became internet governance's founding creed.",
    },
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
    zh: {
      tag: "标准",
      title: "汉字统一的意外作者",
      body: "1992年,中日韩联合组完成统一汉字表,将上万汉字压进共享码位。传言日本代表力阻,抗议方案抹平字形差异。官方记录是,统一规则由日本代表宫泽彰拟定。",
      coda: "被传为反对者的代表,其实写了统一规则。",
    },
    en: {
      tag: "Standard",
      title: "Han Unification's Unlikely Author",
      body: "In 1992 the CJK Joint Research Group merged tens of thousands of Chinese, Japanese and Korean characters into shared Unicode code points. Popular retellings cast Japan as the objector. Unicode's own history credits the verification rules to Japanese delegate Miyazawa Akira.",
      coda: "The delegation cast as the victim helped write the rules it is remembered for opposing.",
    },
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
    zh: {
      tag: "记录",
      title: "早一年的专线",
      body: "纪念日定在1994年4月20日,中科院经64K专线全功能接入国际互联网。一年前,高能所已租线接通斯坦福,收发邮件多年,只是不算「全功能」。",
      coda: "两条专线,一个纪念日。",
    },
    en: {
      tag: "Record",
      title: "The Line a Year Early",
      body: "China marks April 20, 1994 as the day it joined the global internet — a 64K line, full-function access. Thirteen months earlier, physicists at IHEP had already leased a line to Stanford's SLAC, exchanging email with dozens of institutions. It just wasn't the kind of line anyone counted.",
      coda: "Two lines exist; only one gets an anniversary.",
    },
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
    zh: {
      tag: "词源",
      title: "维基取自班车",
      body: "「wiki」是夏威夷语「快」。1995年沃德·坎宁安要给可编辑网页系统起名,想起的是檀香山机场往返航站楼的Wiki Wiki免费班车。",
      coda: "这个词最早印在一辆机场摆渡车的车身上。",
    },
    en: {
      tag: "Etymology",
      title: "Named After a Shuttle Bus",
      body: '"Wiki" is Hawaiian for "quick." In 1995, Ward Cunningham needed a name for the first editable web system he built and reached not for any technical term but for his memory of the Wiki Wiki Shuttle, the free bus between terminals at Honolulu\'s airport.',
      coda: "The word's first home was painted on the side of an airport bus.",
    },
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
    zh: {
      tag: "标准",
      title: "机器人协议迟到的标准",
      body: "1994年Koster提出robots.txt协议,全靠爬虫自愿遵守,无强制力。直到2022年9月,IETF才发布RFC 9309,补上28年空白。",
      coda: "民间约定俗成28年后才成为正式标准。",
    },
    en: {
      tag: "Standard",
      title: "robots.txt: 28 Years Unratified",
      body: "Martijn Koster proposed robots.txt in 1994; crawlers followed it voluntarily, with no formal standard and nothing to enforce it. Google proposed standardization in 2019, and the IETF finally published RFC 9309 in September 2022, closing a 28-year gap.",
      coda: "The web's most-obeyed gentleman's agreement took twenty-eight years to become a real standard.",
    },
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
    zh: {
      tag: "事故",
      title: "查表里缺的项",
      body: "数学教授Nicely用新买的奔腾算素数倒数时发现结果对不上,确认问题出在芯片本身。英特尔起初只给提出异议的用户换货,舆论压力增大后才全面召回。",
      coda: "缺陷源于除法查表里漏掉的条目。",
    },
    en: {
      tag: "Incident",
      title: "The Missing Table Entries",
      body: "Mathematician Thomas Nicely noticed his new Pentium returning slightly wrong results while summing reciprocals of primes, and traced the fault to the chip itself. Intel first offered replacements only to customers who complained, and reversed into a full recall only under public pressure.",
      coda: "Intel booked a $475 million pretax charge for the recall.",
    },
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
    zh: {
      tag: "私网",
      title: "太早的信使",
      body: "1990年,前苹果工程师创立General Magic。1994年产品上市,售价800美元。公司自建专属网络代替互联网,称网页「被动」。",
      coda: "员工托尼·法德尔后来在苹果做出了iPod与iPhone。",
    },
    en: {
      tag: "Networks",
      title: "General Magic's Private Wire",
      body: 'In 1990 ex-Apple engineers Bill Atkinson, Andy Hertzfeld and Marc Porat founded General Magic. Sony\'s Magic Link shipped in 1994 for $800, sending email and running apps. Leadership built a proprietary AT&T network instead of using the internet, calling the web "passive."',
      coda: "Employee Tony Fadell later led hardware development on the iPod and iPhone at Apple.",
    },
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
    zh: {
      tag: "触屏",
      title: "西蒙的传真机",
      body: "1994年8月,IBM与贝尔南方推出Simon,4.5英寸触屏,能发邮件传真,插卡装软件,售价899美元。电池仅撑一小时,六个月后停产,卖出约五万台。",
      coda: "2007年,苹果推出无实体键盘的电容触屏iPhone。",
    },
    en: {
      tag: "Touchscreen",
      title: "Simon's Fax Machine",
      body: "On August 16, 1994, IBM and BellSouth launched the Simon Personal Communicator: a 4.5-inch touchscreen that sent email and fax, priced at $899. Battery life ran about an hour. It was discontinued six months later, having sold roughly 50,000 units.",
      coda: "In 2007 Apple shipped the iPhone, a capacitive touchscreen phone with no physical keyboard.",
    },
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
    zh: {
      tag: "标准",
      title: "CORS的退休规范",
      body: "1995年Netscape仓促加入同源策略,没经过标准程序。CORS直到2014年才成W3C推荐标准,2020年却被W3C自己废止,改归WHATWG。",
      coda: "自己写的标准,自己六年后废止。",
    },
    en: {
      tag: "Standard",
      title: "CORS: A Recommendation in Retirement",
      body: "Netscape bolted the same-origin policy onto Navigator in 1995, alongside JavaScript, with no standards process at all. CORS, meant to formally relax that policy, only became a W3C Recommendation in 2014 — and by 2020 the W3C had retired it, handing the spec to WHATWG's Fetch document.",
      coda: "The standards body retired its own security recommendation six years after publishing it.",
    },
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
    zh: {
      tag: "网页",
      title: "简历访问计数器",
      body: "1994年,一名程序员写了几个C语言CGI小程序,只是想知道多少人看了他的个人简历页;1995年6月,他把这套「个人主页工具」的源码公开发布。",
      coda: "三十年后,全球超过七成的网站服务端仍在用它的后代语言。",
    },
    en: {
      tag: "Web",
      title: "A Résumé Hit Counter",
      body: 'In 1994, a programmer wrote a handful of small CGI programs in C for no larger reason than wanting to know how many people were looking at his online résumé. He called the toolkit "Personal Home Page Tools" and released the source in June 1995.',
      coda: "Three decades on, over 70% of websites with a known server-side language still run its descendant.",
    },
  },
  {
    id: "craigslist-email-list",
    stamp: "1995",
    sources: [
      { label: 'Wikipedia, "Craigslist"', url: "https://en.wikipedia.org/wiki/Craigslist" },
      { label: 'Wikipedia, "Craig Newmark"', url: "https://en.wikipedia.org/wiki/Craig_Newmark" },
    ],
    zh: {
      tag: "分类",
      title: "一封活动邮件",
      body: "1995年,一名软件工程师在旧金山,把自己知道的当地聚会消息整理成邮件,发给几个朋友,只是想让大家多认识认识彼此。",
      coda: "如今它覆盖70个国家570座城市,月访问过亿。",
    },
    en: {
      tag: "Classifieds",
      title: "A Mailing List of Events",
      body: "In 1995, a software engineer in San Francisco started compiling the local gatherings and events he knew about into an email and sending it to a few friends, mainly so people could get to know one another a little better.",
      coda: "The list now reaches 570 cities in 70 countries and draws over 140 million visits a month.",
    },
  },
  {
    id: "wirths-law-misattributed",
    stamp: "1995",
    sources: [
      { label: 'Wikipedia, "Wirth\'s law"', url: "https://en.wikipedia.org/wiki/Wirth%27s_law" },
    ],
    zh: {
      tag: "考据",
      title: "沃思定律的作者",
      body: "1995年,沃思发表《为精简软件辩护》,写下「软件变慢速度超过硬件变快速度」。这句后世称为「沃思定律」的话,他本人注明引自同事马丁·赖泽尔。",
      coda: "冠名者只是转述者,原作者姓赖泽尔。",
    },
    en: {
      tag: "Correction",
      title: "The Law He Credited Away",
      body: "In 1995 Niklaus Wirth published 'A Plea for Lean Software,' writing that software is getting slower more rapidly than hardware is getting faster. The line later christened Wirth's Law was, by his own footnote, a quotation of his colleague Martin Reiser.",
      coda: "The eponym cited the source; posterity kept only the eponym.",
    },
  },
  {
    id: "general-magic-weekend-site",
    stamp: "1995",
    sources: [
      { label: 'Wikipedia, "Pierre Omidyar"', url: "https://en.wikipedia.org/wiki/Pierre_Omidyar" },
      { label: 'Wikipedia, "eBay"', url: "https://en.wikipedia.org/wiki/EBay" },
    ],
    zh: {
      tag: "副业",
      title: "周末上线的小网站",
      body: "1990年代中期,在一家被硅谷寄予厚望、要重新定义掌上通讯的创业公司里,一名程序员利用业余时间随手写了个卖旧货的小网站,周末上线,没打算认真做。",
      coda: "公司叫General Magic。网站后来改名eBay。",
    },
    en: {
      tag: "Side project",
      title: "The Site He Wasn't Serious About",
      body: "In the mid-1990s, at a Silicon Valley startup expected to reinvent handheld computing, one programmer spent his spare time writing a scrappy little site for selling secondhand junk. It went up on a weekend. He wasn't taking it seriously.",
      coda: "The startup was General Magic. The site was later renamed eBay.",
    },
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
    zh: {
      tag: "溢出",
      title: "776天的旧账",
      body: "GetTickCount每49.7天归零,是文档写明的已知行为。Win8到Server 2019间,它却提前在776天归零,到Win11才修。",
      coda: "同一函数留了三十年的两笔账。",
    },
    en: {
      tag: "Overflow",
      title: "A 776-Day Debt",
      body: "Windows 95's GetTickCount rolls to zero every 49.7 days, documented behavior, never treated as a bug. But on Windows 8 through Server 2019, the same function could roll over early, near 776 days, a genuine defect. Microsoft fixed it only in Windows 11, version 24H2.",
      coda: "The fix landed three decades after the counter it patches first shipped.",
    },
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
    zh: {
      tag: "词源",
      title: "没被换掉的代号",
      body: "1996年,英特尔工程师Kardach借读到的维京史,提议用统一斯堪的纳维亚的哈拉尔王命名短距无线技术,只当临时代号,发布前没来得及换成正式名。",
      coda: "临时用的那个名字一直用到了今天。",
    },
    en: {
      tag: "Etymology",
      title: "The Codename That Stuck",
      body: 'In 1996, Intel\'s Jim Kardach proposed "Bluetooth" — after Harald Bluetooth, the Viking king who united Scandinavia — as a throwaway codename during Ericsson-Nokia talks. The intended replacement, RadioWire, could not clear trademark search before launch.',
      coda: "No replacement name ever made it to market.",
    },
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
    zh: {
      tag: "宿命",
      title: "编外程序员",
      body: "1996年,一名中国学生在信息学奥赛上拿了金牌,保送清华计算机系。读书期间,他业余给一个学长的网站写内容系统。次年网站被搜狐收购,他没走,留下打工。",
      coda: "这名学生叫王小川,2004年他在搜狐内部做出了搜狗。",
    },
    en: {
      tag: "Small world",
      title: "The Off-Roster Coder",
      body: "In 1996 a Chinese student won gold at the Informatics Olympiad and was admitted straight into Tsinghua's computer science program. As a student he moonlighted building a content system for an alumnus's website. Sohu bought it the next year; he stayed on and kept working there.",
      coda: "The student was Wang Xiaochuan. In 2004, inside Sohu, he built Sogou.",
    },
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
    zh: {
      tag: "词源",
      title: "打错的那个域名",
      body: "1997年9月头脑风暴,Sean提议「googolplex」,佩奇简化成「googol」。Sean查域名手滑打成google,发现未注册,当天登记。",
      coda: "公司名字来自一次没被纠正的拼写错误。",
    },
    en: {
      tag: "Etymology",
      title: "A Misspelled Domain Search",
      body: 'During a September 1997 brainstorm, Sean Anderson suggested "googolplex"; Larry Page shortened it to "googol." Checking the domain registry on the spot, Anderson typed "google" by mistake and found it unclaimed. Page registered google.com that same day.',
      coda: "The registration record still carries the misspelling, dated September 15, 1997.",
    },
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
    zh: {
      tag: "标准",
      title: "MUST与must之隙",
      body: "1997年,RFC 2119定义MUST,SHOULD等词的强制含义,但未禁止小写使用。2017年,RFC 8174才补丁:唯有全大写才算数。",
      coda: "小写的must二十年里一直没人管。",
    },
    en: {
      tag: "Standard",
      title: "MUST vs must: A Twenty-Year Gap",
      body: "RFC 2119 (March 1997) defined MUST, SHOULD, MAY and their negatives as binding requirement levels for IETF documents. But it only said these words 'are often capitalized' — lowercase must and should were never excluded. RFC 8174 patched the loophole in 2017: only all-caps counts.",
      coda: "For twenty years, a lowercase must carried the same legal weight as a shrug.",
    },
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
    zh: {
      tag: "授权",
      title: "先卖许可证",
      body: "1997年6月11日,丁磊在广州注册了网易公司。起步业务不是免费邮箱,而是把一套邮件系统软件的使用许可卖给别的网站。",
      coda: "1998年,网易才用163.com上线了自己的免费邮箱。",
    },
    en: {
      tag: "Licensing",
      title: "Sell the license first",
      body: "On June 11, 1997, William Ding registered NetEase in Guangzhou. The company's first business was not free webmail. It licensed a piece of email server software it had built to other websites for a fee.",
      coda: "NetEase did not launch its own free email, under 163.com, until 1998.",
    },
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
    zh: {
      tag: "评测",
      title: "显卡之家",
      body: "1998年,一名在读高中生用业余时间做了一个叫「显卡之家」的个人网站,写显卡评测。两年后,他把网站改名泡泡网,继续更新。",
      coda: "2005年,他又创办了汽车之家。",
    },
    en: {
      tag: "Review site",
      title: "Graphics Card Home",
      body: "In 1998, a high school student in Hebei started a personal website called Graphics Card Home in his spare time, posting reviews of computer graphics cards. Two years later he renamed it PCPop and kept updating it through the rest of school.",
      coda: "In 2005 the same person founded Autohome.",
    },
  },
  {
    id: "china-oicq-to-qq",
    stamp: "1999.02 · 2000.11",
    sources: [
      { label: "Tencent QQ, Wikipedia", url: "https://en.wikipedia.org/wiki/Tencent_QQ" },
      { label: "QQ是怎么来的, 网易", url: "https://www.163.com/dy/article/EPF3DA1F0511V6CK.html" },
    ],
    zh: {
      tag: "品牌",
      title: "从OICQ到QQ",
      body: "1999年2月,腾讯上线OICQ,O向ICQ的「开放」致敬。同年10月,ICQ所属美国在线发函施压。2000年11月,马化腾改名QQ,取「可爱」之意。",
      coda: "「开放」二字最先被删掉。",
    },
    en: {
      tag: "Rebrand",
      title: "From OICQ to QQ",
      body: "Tencent launched OICQ in February 1999 — the O stood for 'Open,' a nod to ICQ. That October, AOL, ICQ's owner, sent a cease-and-desist over trademark infringement. In November 2000, Ma Huateng renamed it QQ, chosen because the letter reads as 'cute' in Chinese.",
      coda: "Open was the first word to go once AOL's lawyers arrived.",
    },
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
    zh: {
      tag: "误判",
      title: "Excite回绝谷歌",
      body: "1999年,谷歌愿以75万美元加1%股份卖给Excite。CEO贝尔判断两家搜索结果差距太小,不值得推倒重来。谷歌次年估值已破十亿美元。",
      coda: "贝尔后来说,这个决定他不会改。",
    },
    en: {
      tag: "Misjudgment",
      title: "Excite Turns Down Google",
      body: "In 1999 Google offered to sell itself to Excite for $750,000 plus roughly 1% equity. CEO George Bell judged the search gap too small to justify tearing out Excite's technology. The reasoning held up. Google was worth over a billion within a year.",
      coda: "Bell has said since that he would make the same call again.",
    },
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
    zh: {
      tag: "事故",
      title: "磅力与牛顿",
      body: "火星气候探测者号轨道插入时失联。调查发现,承包商的推力软件按磅力秒输出,导航软件按牛顿秒读入,相差4.45倍,探测器被导入距火星表面仅57公里的轨道。",
      coda: "这枚探测器再未传回信号。",
    },
    en: {
      tag: "Incident",
      title: "Pound-Force, Newton",
      body: "Mars Climate Orbiter went silent during orbital insertion. The board found that the contractor's thruster software output impulse in pound-force seconds while navigation software expected newton-seconds, off by a factor of 4.45. The craft was steered to within roughly 57 km of the surface.",
      coda: "The $327.6 million mission never transmitted again.",
    },
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
    zh: {
      tag: "转型",
      title: "掌上电脑转账的败退",
      body: "1999年,Confinity推出Palm Pilot红外转账,发布会演示成功。上线数周用户仅1.3万,一年未涨。真正跑起来的是备用方案:邮件转账。",
      coda: "公司改名PayPal,红外线转账悄悄下线。",
    },
    en: {
      tag: "Pivot",
      title: "The Beam That Never Came",
      body: "In 1999 Confinity launched infrared cash transfers between Palm Pilots, demoed live at a funding event. Weeks after launch it had roughly 13,000 users, a number that barely moved over the following year. What actually took off was email payments, built only as a fallback option.",
      coda: "The company renamed itself PayPal and quietly dropped the beam.",
    },
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
    zh: {
      tag: "宿命",
      title: "五百元月薪",
      body: "1999年,香港一家投资公司高管去杭州考察一个小网站。他见到十几个人挤在公寓里写代码。他没投钱,反而辞掉七十万美元年薪,加入公司,月薪五百元。",
      coda: "他叫蔡崇信,后来做了阿里巴巴的执行副主席。",
    },
    en: {
      tag: "Small world",
      title: "The 500-Yuan Salary",
      body: "In 1999 a Hong Kong investment executive traveled to Hangzhou to assess a small website as a possible investment. He found a dozen-odd people coding in one crowded apartment. He didn't invest — he quit his $700,000 salary and joined instead, for 500 yuan a month.",
      coda: "His name was Joe Tsai. He later became Alibaba's executive vice chairman.",
    },
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
    zh: {
      tag: "机制",
      title: "GPS第1024周",
      body: "GPS用10位数字记周,数到1023就归零,约每19.7年发作一次。首次归零在1999年8月,第二次在2019年4月6日,仍有设备因此出错。",
      coda: "同一处溢出,按周期又发作了一次。",
    },
    en: {
      tag: "Mechanism",
      title: "GPS Week 1024",
      body: "GPS counts weeks in 10 bits, a field that maxes at 1,023 and rolls to zero roughly every 19.7 years. The first rollover hit in August 1999. The second landed on 6 April 2019, breaking receivers built as if the first had been a one-off.",
      coda: "The same overflow is on a schedule and due to recur again in 2038.",
    },
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
    zh: {
      tag: "宿命",
      title: "打包卖掉",
      body: "1994年,一名程序员业余写了个免费收发邮件软件。2000年泡沫破裂,他把软件卖给一家公司,留下做技术总监。五年后公司撑不下去,连软件带人卖给了腾讯。",
      coda: "程序员叫张小龙。五年后他在腾讯做出了微信。",
    },
    en: {
      tag: "Small world",
      title: "Sold With the Software",
      body: "In 1994 a programmer in Guangzhou wrote a free email client in his spare time. In 2000, as the dot-com bubble burst, he sold it to a company and stayed on as tech director. Five years later that company folded and sold the software — and him with it — to Tencent.",
      coda: "The programmer was Zhang Xiaolong. Five years after that, inside Tencent, he built WeChat.",
    },
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
    zh: {
      tag: "重逢",
      title: "寻呼机公司的设计总监",
      body: "2000年,一名设计师加入Andy Rubin创办的掌上设备公司,做界面设计。公司后来卖给微软,团队解散,设计师辗转去了另外两家公司。",
      coda: "那名设计师叫马蒂亚斯·杜阿尔特。十年后,鲁宾把他招进了 Android。",
    },
    en: {
      tag: "Reunion",
      title: "Design Director, Failed Startup",
      body: "In 2000 a designer joined a handheld-device startup founded by Andy Rubin, working on its interface. The company was sold to Microsoft and the team scattered. The designer went on to two other companies over the next decade.",
      coda: "The designer was Matias Duarte. Ten years later Rubin hired him onto Android.",
    },
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
    zh: {
      tag: "吐槽",
      title: "没无线,略逊Nomad",
      body: "2001年10月,苹果发布第一代iPod。Slashdot创始人马尔达写道,「没无线,存储比Nomad还小,逊。」按当时播放器的参数,这话没说错。",
      coda: "这句话后来常被当反例引用。",
    },
    en: {
      tag: "Dismissal",
      title: "No Wireless, Less Space",
      body: 'When Apple unveiled the first iPod on October 23, 2001, Slashdot founder Rob "CmdrTaco" Malda wrote in his editor\'s note: "No wireless. Less space than a nomad. Lame." Against the spec sheets of rival MP3 players at the time, the line was not factually wrong.',
      coda: "The comment is now cited routinely as the counterexample it produced.",
    },
  },
  {
    id: "discuz-shenyang-dorm",
    stamp: "2001.06",
    sources: [{ label: "Wikipedia, Discuz!", url: "https://zh.wikipedia.org/wiki/Discuz!" }],
    zh: {
      tag: "论坛",
      title: "CDB论坛程序",
      body: "2001年,一名在沈阳读大学、住校内宿舍的学生写了一套论坛程序,取名Crossday Bulletin。次年10月,它改叫Discuz。",
      coda: "2010年8月23日,腾讯收购了这家公司。",
    },
    en: {
      tag: "Forum",
      title: "CDB, a dorm build",
      body: "In 2001, a university student living in a dormitory in Shenyang wrote a piece of forum software and named it Crossday Bulletin, working on it alongside his coursework. The following October he renamed it Discuz.",
      coda: "On August 23, 2010, Tencent acquired the company he had built around it.",
    },
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
    zh: {
      tag: "百科",
      title: "百科旁的副业",
      body: "2001年1月10日,一家付费审稿百科全书的创始人,在自己服务器上顺手装了个wiki软件,想让志愿者先在旁边随便编辑试试看。",
      coda: "2026年7月,仅英文版就有721万余篇条目。",
    },
    en: {
      tag: "Wiki",
      title: "A Side Project Next to Nupedia",
      body: "On January 10, 2001, the founder of a peer-reviewed online encyclopedia installed wiki software on the project's own server, mainly so volunteers could try drafting entries loosely on the side while the reviewed encyclopedia moved slowly ahead.",
      coda: "By July 2026 its English edition alone held over 7.2 million articles.",
    },
  },
  {
    id: "bittorrent-mailing-list",
    stamp: "2001.07.02",
    sources: [
      { label: 'Wikipedia, "BitTorrent"', url: "https://en.wikipedia.org/wiki/BitTorrent" },
      { label: 'Wikipedia, "Bram Cohen"', url: "https://en.wikipedia.org/wiki/Bram_Cohen" },
    ],
    zh: {
      tag: "协议",
      title: "一个新的P2P应用",
      body: "2001年7月2日,一名程序员在Yahoo邮件组里发了一条消息,标题是「BitTorrent——一个新的P2P应用」,介绍他刚设计好的文件分发协议。",
      coda: "三年后,这个协议一度占了全球互联网流量的三分之一。",
    },
    en: {
      tag: "Protocol",
      title: "A New P2P App",
      body: 'On July 2, 2001, a programmer posted a message to a Yahoo eGroups mailing list titled "BitTorrent -- a new P2P app," describing a file-distribution protocol he had just finished designing, one that pulled pieces of a file from many sources at once.',
      coda: "Three years later it accounted for a third of all internet traffic, per a 2004 CacheLogic study.",
    },
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
    zh: {
      tag: "生鲜",
      title: "三十分钟窗口",
      body: "1996年,博德斯创立Webvan,承诺30分钟送达,自建仓储物流。1999年11月IPO融资3.75亿美元。2001年7月破产,亏损逾8亿美元。",
      coda: "部分高管转投亚马逊,生鲜与Instacart接了同一单。",
    },
    en: {
      tag: "Groceries",
      title: "The Thirty-Minute Window",
      body: "In 1996 Borders bookstore co-founder Louis Borders started Webvan, promising 30-minute delivery on warehouses built from scratch. It IPO'd in November 1999 for $375 million at a valuation over $4.8 billion, then filed for bankruptcy in July 2001, having lost more than $800 million.",
      coda: "Some Webvan executives went on to Amazon; Amazon Fresh and Instacart later filled the same order.",
    },
  },
  {
    id: "kozmo-free-hour-delivery",
    stamp: "2001.04",
    sources: [
      { label: 'Wikipedia, "Kozmo.com"', url: "https://en.wikipedia.org/wiki/Kozmo.com" },
      { label: 'Wikipedia, "DoorDash"', url: "https://en.wikipedia.org/wiki/DoorDash" },
    ],
    zh: {
      tag: "配送",
      title: "不收费的一小时",
      body: "1998年,帕克与康永创立Kozmo,承诺一小时免费送货,骑手靠传呼机接单,融资2.5亿。1999年亏2630万。2001年4月,员工到岗才知已倒闭。",
      coda: "2013年成立的DoorDash用手机GPS接单并收费。",
    },
    en: {
      tag: "Delivery",
      title: "The Free-Hour Promise",
      body: "In 1998 Joseph Park and Yong Kang founded Kozmo.com, promising free one-hour delivery with couriers dispatched by pager. It raised roughly $250 million but earned $3.5 million against a $26.3 million loss in 1999. In April 2001, staff learned of the shutdown by finding closed offices.",
      coda: "DoorDash, founded in 2013, dispatches couriers by smartphone GPS and charges a delivery fee.",
    },
  },
  {
    id: "flooz-digital-currency",
    stamp: "2001.08",
    sources: [
      { label: 'Wikipedia, "Flooz.com"', url: "https://en.wikipedia.org/wiki/Flooz.com" },
      { label: 'Wikipedia, "Bitcoin"', url: "https://en.wikipedia.org/wiki/Bitcoin" },
    ],
    zh: {
      tag: "货币",
      title: "花不出去的钱",
      body: "1999年2月,莱维坦创立Flooz.com,用户买入数字货币「flooz」消费。团伙用赃卡刷出30万美元积分,2001年欺诈占19%,同年8月倒闭。",
      coda: "2009年1月,中本聪挖出比特币创世区块。",
    },
    en: {
      tag: "Currency",
      title: "Money With No Store",
      body: "In February 1999, iVillage co-founder Robert Levitan launched Flooz.com, a digital currency users could buy and spend at partner merchants. A crime ring used stolen cards to mint $300,000 in fraudulent credits, and by 2001 fraud reached 19% of volume. The company folded that August.",
      coda: "In January 2009, Satoshi Nakamoto mined bitcoin's genesis block.",
    },
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
    zh: {
      tag: "错失",
      title: "雅虎拒购谷歌",
      body: "2002年,雅虎CEO塞梅尔开价30亿收购谷歌,对方坚持50亿。雅虎市值当时才约50亿,吃下等于赌上全部身家。谷歌两年后上市,估值230亿。",
      coda: "雅虎2017年卖掉核心业务仅44.8亿。",
    },
    en: {
      tag: "Miss",
      title: "Yahoo Passes on Google",
      body: "In 2002 Yahoo CEO Terry Semel offered $3 billion for Google; Page and Brin held out for $5 billion. Semel's read was that Yahoo's own market cap, near $5 billion after the crash, could not absorb that bet. Google went public two years later at $23 billion.",
      coda: "Yahoo sold its core business to Verizon in 2017 for $4.48 billion.",
    },
  },
  {
    id: "pplive-dorm-2002",
    stamp: "2002.06",
    sources: [
      { label: "Wikipedia, PP视频", url: "https://zh.wikipedia.org/wiki/PP%E8%A7%86%E9%A2%91" },
    ],
    zh: {
      tag: "寝室",
      title: "韵苑26栋",
      body: "2002年世界杯期间,华中科大宿舍没有电视,姚欣在校内网上看比赛,服务器总是卡死。他在韵苑26栋寝室里琢磨怎么把点对点技术和流媒体接起来。",
      coda: "2005年上线的PPLive,巅峰期用户过亿。",
    },
    en: {
      tag: "Dorm room",
      title: "Building 26, Yunyuan",
      body: "During the 2002 World Cup, Yao Xin's dorm at Huazhong University of Science and Technology had no television, so he watched matches over the campus network, which kept crashing. In his room in Building 26 he started working out how to combine peer-to-peer transfer with streaming video.",
      coda: "PPLive launched in 2005 and, at its peak, counted over a hundred million users.",
    },
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
    zh: {
      tag: "交易",
      title: "担保交易",
      body: "2003年,淘宝买卖双方互不信任,财务部想出担保交易:买家先把钱冻结,收货确认后才划给卖家。10月首笔成交,买家在西安,卖家在日本。",
      coda: "谐音成了公司的名字。",
    },
    en: {
      tag: "Trust",
      title: "The Escrow Workaround",
      body: "In 2003, with Taobao buyers and sellers unwilling to trust each other first, finance built an escrow workaround: payment sat frozen until goods were confirmed. The first trade closed that October — a student in Xi'an paying a seller in Japan. The name puns 'pay' and 'guarantee.'",
      coda: "The pun became the company's permanent, official name.",
    },
  },
  {
    id: "china-taobao-free-vs-ebay",
    stamp: "2003.05 · 2006",
    sources: [
      { label: "易趣消亡史, 经济观察网", url: "http://m.eeo.com.cn/2022/0729/545987.shtml" },
      { label: "易趣不复返, 品玩", url: "https://www.pingwest.com/a/267841" },
    ],
    zh: {
      tag: "竞争",
      title: "三年免费",
      body: "2003年,易趣占中国C2C七成市场,靠挂牌费与佣金盈利。淘宝5月上线,阿里巴巴祭出三年免费。到2006年,淘宝拿下七成市场,eBay退出中国C2C。",
      coda: "收费的一方,先撑不住了。",
    },
    en: {
      tag: "Competition",
      title: "Three Years Free",
      body: "In 2003, eBay's Eachnet held over 70 percent of China's C2C market, charging listing and transaction fees. Taobao launched that May to a near-empty site; Alibaba's answer was three years of free listings. By 2006, Taobao held 70 percent and eBay withdrew from Chinese C2C.",
      coda: "The side still charging listing fees ran out of runway first.",
    },
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
    zh: {
      tag: "点评",
      title: "查氏餐馆指南",
      body: "2002年,张涛从美国回国,随身带着对《查氏餐馆调查》那种读者打分餐馆指南的印象。他注册了域名zsurvey.com,想在上海做一份中文版。",
      coda: "2003年4月12日,大众点评网正式上线。",
    },
    en: {
      tag: "Review guide",
      title: "A Zagat notebook",
      body: "In 2002, Zhang Tao came back to China from the United States carrying an idea he had picked up there: the Zagat Survey, a restaurant guide built from readers' own ratings. He registered the domain zsurvey.com and set out to build a Chinese version in Shanghai.",
      coda: "Dianping, the site that grew from it, went live on April 12, 2003.",
    },
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
    zh: {
      tag: "博客",
      title: "博客软件的困境",
      body: "2003年1月24日,阿姆斯特丹一名大学生在博客上写道,他常用的b2程序主开发者已消失数月,他想接手做个分支,还缺一个名字。",
      coda: "运营这套软件的公司,2021年估值75亿美元。",
    },
    en: {
      tag: "Blogging",
      title: "The Blogging Software Dilemma",
      body: "On January 24, 2003, a university student wrote on his own blog that b2, the blogging software he used daily, had gone unmaintained for months since its lead developer disappeared. He said he wanted to fork it and asked only for a name.",
      coda: "The company that grew out of that fork was valued at $7.5 billion by 2021.",
    },
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
    zh: {
      tag: "事故",
      title: "报警器没有响",
      body: "俄亥俄电网监控中心的告警软件悄然卡死:一处编码错误让两个进程同时抢到同一数据结构的写权限,陷入死循环。调度员没看到过载警报,五千五百万人因此断电。",
      coda: "工程师用了八周才复现这个竞态条件。",
    },
    en: {
      tag: "Incident",
      title: "The Alarm That Didn't Ring",
      body: "The alarm process at an Ohio control room silently jammed: a coding error let two processes gain write access to the same data structure at once, looping forever. Operators never saw the overload warnings and failed to shed load in time. The cascade left 55 million people without power.",
      coda: "Engineers needed eight weeks to reproduce the race condition.",
    },
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
    zh: {
      tag: "澄清",
      title: "不是卖多余的机器",
      body: "常见说法称亚马逊卖闲置服务器。当事人Benjamin Black否认:2003年他与Pinkham写的备忘录,提的是标准化基础设施对外卖服务。",
      coda: "2006年,S3和EC2按这份备忘录的构想上线。",
    },
    en: {
      tag: "Correction",
      title: "Not the Leftover Servers",
      body: "The common version says AWS began by reselling Amazon's idle holiday-season server capacity. Benjamin Black calls that flatly false: in 2003 he and Chris Pinkham wrote a memo proposing standardized, automated infrastructure, purpose-built from the start to be sold externally as a service.",
      coda: "S3 and EC2 launched in 2006, following that memo.",
    },
  },
  {
    id: "maps-intern-friendfeed",
    stamp: "2003 · 2009",
    sources: [
      { label: 'Wikipedia, "Bret Taylor"', url: "https://en.wikipedia.org/wiki/Bret_Taylor" },
      { label: 'Wikipedia, "FriendFeed"', url: "https://en.wikipedia.org/wiki/FriendFeed" },
    ],
    zh: {
      tag: "实习",
      title: "地图组实习生",
      body: "2003年,一名产品经理招进一名实习生,做后来演变成谷歌地图的本地搜索项目。四年后,实习生和一名做过Gmail的工程师一起离职创业。",
      coda: "那名实习生叫布雷特·泰勒。四年后创办的公司,被 Facebook 买走了。",
    },
    en: {
      tag: "Internship",
      title: "The Maps Team Intern",
      body: "In 2003 a Google product manager hired an intern onto the team building local search, the project that grew into Google Maps. Four years later that intern and an engineer who had built Gmail left Google together to start a company.",
      coda: "The intern was Bret Taylor. The company he left to start was bought by Facebook.",
    },
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
    zh: {
      tag: "扩容",
      title: "四十秒的页面",
      body: "2002年上线的Friendster曾拥有过亿用户,服务器扛不住计算「共同好友度」,一页最长要加载四十秒。用户在客服邮件里威胁转投MySpace。",
      coda: "2004年上线的Facebook扛住了同一种流量。",
    },
    en: {
      tag: "Scaling",
      title: "The Forty-Second Load",
      body: "Friendster launched in 2002 and reached over 100 million registered accounts, but its servers buckled under the load of computing degrees of connection between friends; a single page could take forty seconds to load. Support emails show users threatening to defect to the newer MySpace.",
      coda: "Facebook launched in 2004 on the same social-graph idea and held under the traffic.",
    },
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
    zh: {
      tag: "转型",
      title: "滑雪板店没做起来的软件",
      body: "2004年,Lütke嫌电商软件太差,自写一套卖Snowdevil滑雪装备。滑雪板生意平平,商家却抢着买这套软件。2006年改名Shopify发布。",
      coda: "2015年,Shopify在纽约证交所挂牌上市。",
    },
    en: {
      tag: "Pivot",
      title: "The Store Software Outgrew the Store",
      body: "In 2004, programmer Tobias Lutke found the e-commerce software of the day too clunky, so he wrote his own to sell snowboard gear online as Snowdevil. Snowdevil itself stayed a small shop, but other merchants started asking to license the software behind it.",
      coda: "Shopify listed on the New York Stock Exchange in 2015.",
    },
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
    zh: {
      tag: "转型",
      title: "播客公司里的推特",
      body: "2005年6月苹果给iTunes加入播客,两天订阅破百万,播客公司Odeo一夜过时。黑客松上,Dorsey的短信更新点子成了Twitter。",
      coda: "Odeo这家母公司,2007年被卖给了别人。",
    },
    en: {
      tag: "Pivot",
      title: "The Podcast Company's Side Project",
      body: "On June 28, 2005, Apple built podcast subscriptions into iTunes; within two days subscriptions passed one million, and Odeo's entire podcasting business went obsolete overnight. The next March, an internal hackathon produced Jack Dorsey's SMS status-update pitch: Twitter.",
      coda: "Odeo, the company Twitter was built inside, was sold off in 2007.",
    },
  },
  {
    id: "youtube-tune-in-hook-up",
    stamp: "2005",
    sources: [
      { label: 'Wikipedia, "YouTube"', url: "https://en.wikipedia.org/wiki/YouTube" },
      { label: 'Wikipedia, "Jawed Karim"', url: "https://en.wikipedia.org/wiki/Jawed_Karim" },
    ],
    zh: {
      tag: "传说",
      title: "情人节注册的域名",
      body: "youtube.com在2005年情人节注册,创始人称构想仿交友网站Hot or Not。但Karim否认那场聚会,Chen也承认故事像营销包装。",
      coda: "他提到的真实动机,是找不到南亚海啸的视频。",
    },
    en: {
      tag: "Legend",
      title: "The Domain Registered on Valentine's Day",
      body: "youtube.com was registered on February 14, 2005, and its founders later told of a dating-site concept modeled on Hot or Not. Jawed Karim denied attending the dinner party the story hinges on, and Steve Chen conceded it reads like a marketing narrative.",
      coda: "What Karim cited instead was trouble finding tsunami footage online.",
    },
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
    zh: {
      tag: "宿命",
      title: "巴菲特午餐",
      body: "2006年,一位广东电子厂出身的商人拍下与巴菲特共进午餐,花了六十二万美元。同去的是个二十六岁的年轻人,刚从一家美国公司辞职,还没想清楚要做什么。",
      coda: "商人叫段永平。年轻人叫黄峥,后来创立了拼多多。",
    },
    en: {
      tag: "Small world",
      title: "The Buffett Lunch",
      body: "In 2006 a Guangdong electronics manufacturer won the annual charity auction for lunch with Warren Buffett, paying $620,100. He brought along a 26-year-old who had just quit an American company and had no clear plan yet.",
      coda: "The manufacturer was Duan Yongping. The young man was Colin Huang, who later founded Pinduoduo.",
    },
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
    zh: {
      tag: "误判",
      title: "黑莓看到了短板",
      body: "2007年1月,黑莓两位创始人看完iPhone发布视频,列出的短板都是真的:没键盘,不安全,续航差,玻璃打字。巴尔斯利答复,「没事,我们没问题」。",
      coda: "黑莓市场份额此后逐年被iPhone蚕食。",
    },
    en: {
      tag: "Misread",
      title: "BlackBerry Saw the Flaws",
      body: "In January 2007, BlackBerry co-CEO Jim Balsillie and chairman Mike Lazaridis watched the iPhone unveiling. Lazaridis's list of flaws was accurate: no physical keyboard, weak security, poor battery, glass typing. Every item was real. Balsillie's reply was, \"It's OK, we'll be fine.\"",
      coda: "BlackBerry's market share eroded to the iPhone in the years that followed.",
    },
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
    zh: {
      tag: "预测",
      title: "德沃拉克劝苹果收手",
      body: "2007年3月,专栏作家德沃拉克撰文称手机业利润薄、诺基亚摩托罗拉已站稳,建议苹果趁早转卖设计给「接盘者」。按苹果的历史份额推理,这不算离谱。",
      coda: "他后来说,亲手摸到那台手机后改了主意。",
    },
    en: {
      tag: "Prediction",
      title: "Dvorak Says Pull the Plug",
      body: 'On March 28, 2007, columnist John C. Dvorak wrote that phone margins were thin and Nokia and Motorola already dominant, so Apple should hand the iPhone design to some "suckers" and walk away. Given Apple\'s history in that market, the reasoning was not unreasonable.',
      coda: "He later said that once he actually held the phone, he regretted the call.",
    },
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
    zh: {
      tag: "合并",
      title: "临时学会写代码",
      body: "2007年,两名爱尔兰少年带着自写的电商小工具进了Y Combinator,又与一对牛津毕业的兄弟合并成一家公司。后者不懂编程,其中一人被要求现学。",
      coda: "那人叫Harj Taggar,后来做了YC的合伙人。",
    },
    en: {
      tag: "Merger",
      title: "The One Who Had to Learn to Code",
      body: "In 2007 two Irish teenage brothers brought a homemade e-commerce tool into Y Combinator and merged their company with one run by two Oxford graduates. Neither of the Oxford pair could program. One of them was told to learn, fast.",
      coda: "That one was Harj Taggar, later Y Combinator's first non-founder partner.",
    },
  },
  {
    id: "justintv-backpack-cruise",
    stamp: "2007 · 2016",
    sources: [
      { label: 'Wikipedia, "Justin.tv"', url: "https://en.wikipedia.org/wiki/Justin.tv" },
      { label: 'Wikipedia, "Kyle Vogt"', url: "https://en.wikipedia.org/wiki/Kyle_Vogt" },
    ],
    zh: {
      tag: "背包",
      title: "自制直播背包",
      body: "2007年3月,一个人把摄像头绑在棒球帽上,背着一套自制设备在旧金山街头走动,24小时直播自己的生活。那套背包设备,是一位从麻省理工辍学的朋友做的。",
      coda: "做背包的叫Kyle Vogt,后来创立Cruise。",
    },
    en: {
      tag: "The backpack",
      title: "The Livestreaming Backpack",
      body: "In March 2007 a man strapped a webcam to a baseball cap and began livestreaming his life around San Francisco, twenty-four hours a day, wearing a homemade laptop-backpack rig built by a friend who had dropped out of MIT.",
      coda: "The friend who built it was Kyle Vogt, who later founded Cruise, acquired by GM for over $1 billion.",
    },
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
    zh: {
      tag: "问答",
      title: "反EE问答站",
      body: "2008年4月16日,一名程序员在博客上贴文,说想做一个「反Experts-Exchange」的问答网站,给程序员用。",
      coda: "2021年,这个网站以18亿美元卖给了Prosus。",
    },
    en: {
      tag: "Q&A",
      title: "The Anti-Experts-Exchange",
      body: 'On April 16, 2008, a programmer posted on his own blog that he wanted to build an "anti-Experts-Exchange" question-and-answer site for programmers, without the paywalls and search-engine gaming he found nauseating about the incumbent.',
      coda: "In 2021 the site was sold to Prosus for 1.8 billion dollars.",
    },
  },
  {
    id: "zune-leap-year-freeze",
    stamp: "2008.12.31",
    sources: [
      { label: "Wikipedia — Zune Meltdown", url: "https://en.wikipedia.org/wiki/Zune_Meltdown" },
    ],
    zh: {
      tag: "故障",
      title: "第366天",
      body: "2008年12月31日,Zune 30全线死机,人称Z2K9。原因是电源芯片驱动里的死循环,只在闰年第366天触发。没有补丁,唯一修法是等电池耗尽。",
      coda: "修复方式不是打补丁,是等它没电。",
    },
    en: {
      tag: "Incident",
      title: "Day 366",
      body: "Near midnight Pacific time on 31 December 2008, every Zune 30 froze solid, nicknamed Z2K9. The cause was an infinite loop in a power-chip driver that could only trigger on a leap year's 366th day. No patch existed; the only fix was letting the battery die.",
      coda: "The remedy shipped by Microsoft was to wait for the device to run out of power.",
    },
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
    zh: {
      tag: "质疑",
      title: "骗子王坚",
      body: "2012年前后,阿里云投入巨大却无成果,有员工当面对马云说王坚是骗子,工程师流失近八成。马云回应:每年投十亿,投十年,做不出来再说。",
      coda: "2020年,阿里云首次盈利。",
    },
    en: {
      tag: "Doubt",
      title: "The Liar Who Built the Cloud",
      body: "Around 2012, with Alibaba Cloud years into heavy investment and no visible product, staff told Jack Ma directly that Wang Jian was a fraud. Close to eighty percent of the engineering team quit. Ma's reply: fund it a billion yuan a year for ten years, then judge it.",
      coda: "Ten years later, the fraud's project turned a profit.",
    },
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
    zh: {
      tag: "促销",
      title: "27家商户",
      body: "2009年11月11日,淘宝商城为填补交易淡季,凑了27个品牌做促销,原定三十多家陆续退出。山西公务员严俊0点3秒下单150元话费,成了第一个买家。",
      coda: "当天成交额5200万元,是平日的十倍。",
    },
    en: {
      tag: "Discount",
      title: "27 merchants",
      body: "On November 11, 2009, Taobao Mall rounded up twenty-seven brands to fill a slow sales week; the plan had called for over thirty, but merchants kept dropping out. A civil servant named Yan Jun in Shanxi placed the day's first order, 150 yuan of phone credit, at 00:00:03.",
      coda: "Sales that day reached 52 million yuan, ten times an ordinary day.",
    },
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
    zh: {
      tag: "同窗",
      title: "商学院选修课",
      body: "2009年,一名程序员请假去哈佛商学院读MBA。他业余一直在维护一个反垃圾邮件志愿项目,课堂上随口提起,一位同学听完说,这该做成真正的产品。",
      coda: "那位同学叫Michelle Zatlyn。",
    },
    en: {
      tag: "Classmate",
      title: "An Elective at HBS",
      body: "In 2009 a programmer took a leave of absence to study for an MBA at Harvard Business School. He had spent years running an anti-spam volunteer project on the side. He mentioned it in class one day. A classmate said it should be a real product.",
      coda: "That classmate was Michelle Zatlyn, later Cloudflare's co-founder and COO.",
    },
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
    zh: {
      tag: "事故",
      title: "二选一",
      body: "2010年11月3日,腾讯弹窗要求用户在QQ与360间二选一,称检测到隐私风险。马化腾称三天后用户或「全军覆没」。工信部两次介入,勒令双方恢复兼容。",
      coda: "监管出手,战争才停。",
    },
    en: {
      tag: "Incident",
      title: "Choose One",
      body: "On November 3, 2010, Tencent forced a pop-up choice: uninstall 360 or QQ would stop running. Ma Huateng warned users might be wiped out within three days. Days later the Ministry of Industry and Information Technology ordered both sides to restore compatibility.",
      coda: "The regulator ended it, not the market or either company.",
    },
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
    zh: {
      tag: "泡沫",
      title: "千团大战",
      body: "2010年首家团购网站上线,新浪、腾讯、开心网接连跟进。到2011年8月,团购企业超五千家,史称「千团大战」。到2014年年中,存活仅剩176家。",
      coda: "五千家里,不到两百家活下来。",
    },
    en: {
      tag: "Bubble",
      title: "The Thousand-Groupon War",
      body: "China's first group-buying site launched in 2010; portals and social networks piled in within months. By August 2011, more than 5,000 group-buying companies were competing — the 'Thousand-Groupon War.' By mid-2014, only 176 sites remained standing.",
      coda: "Fewer than two hundred of five thousand survived.",
    },
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
    zh: {
      tag: "标准",
      title: "语义化版本号",
      body: "2010年,GitHub创始人定义MAJOR.MINOR.PATCH,意图终结依赖地狱。规范正文却写明,0.y.z阶段版本号可随时改变,不受此约束。",
      coda: "多数包永远停在0.x,承诺从未生效。",
    },
    en: {
      tag: "Standard",
      title: "SemVer's Own Exemption",
      body: "In 2010 GitHub cofounder Tom Preston-Werner published semver.org, proposing MAJOR.MINOR.PATCH to end 'dependency hell.' The spec itself carves out an exception: during the 0.y.z 'initial development' phase, anything may change at any time — a stage most packages never actually leave.",
      coda: "Most published packages never leave the version range the rule does not bind.",
    },
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
    zh: {
      tag: "转型",
      title: "被砍掉的签到功能",
      body: "Systrom和Krieger花近一年做出签到应用Burbn完整版,自己嫌它臃肿。砍掉签到功能,8周后改名Instagram重新上线。",
      coda: "上线一周,用户数到了10万。",
    },
    en: {
      tag: "Pivot",
      title: "What Got Cut From Burbn",
      body: "Kevin Systrom and Mike Krieger spent nearly a year building a full-featured check-in app called Burbn, then judged their own finished iPhone build cluttered. They stripped it down to photos, comments, and likes, and shipped the result eight weeks later as Instagram.",
      coda: "Within a week of launch it had 100,000 users.",
    },
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
    zh: {
      tag: "事故",
      title: "时区数据库诉讼",
      body: "2011年10月,占星软件公司Astrolabe起诉tz时区数据库侵权,数据库随即下线。ICANN出面接管托管,2012年Astrolabe撤诉。",
      coda: "起诉方最终撤诉,数据库归了ICANN。",
    },
    en: {
      tag: "Incident",
      title: "The Lawsuit Over the Time Zone Database",
      body: "In October 2011 astrology-software maker Astrolabe sued the tz database's maintainers, claiming its zone data infringed an atlas it published. The mailing list and FTP server went dark. ICANN stepped in to host the database; Astrolabe withdrew the suit in February 2012.",
      coda: "An astrology company's copyright claim over sunrise tables was withdrawn without payment.",
    },
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
    zh: {
      tag: "嘲讽",
      title: "十亿美元买滤镜",
      body: "2012年4月,Facebook以10亿美元收购13人、零收入的Instagram。斯图尔特问,「买个毁照片的东西?」按规模收入衡量,这话不算无理。",
      coda: "这笔收购后来常被称最划算交易之一。",
    },
    en: {
      tag: "Ridicule",
      title: "A Billion for a Filter",
      body: 'In April 2012 Facebook announced it was paying $1 billion for Instagram, a 13-person team with no revenue. On The Daily Show, Jon Stewart asked, "A billion dollars of money? For a thing that kind of ruins your pictures?" Measured against team size and revenue, the question was not unfair.',
      coda: "The deal is now cited routinely as one of the best acquisitions in tech history.",
    },
  },
  {
    id: "didi-alibaba-resignation",
    stamp: "2012.06",
    sources: [
      { label: "Wikipedia, Didi Chuxing", url: "https://en.wikipedia.org/wiki/Didi_Chuxing" },
      { label: "Wikipedia, 程维", url: "https://zh.wikipedia.org/wiki/%E7%A8%8B%E7%BB%B4" },
    ],
    zh: {
      tag: "辞职",
      title: "从阿里到出租车",
      body: "程维在阿里做了8年销售,升到支付宝B2C事业部副总经理。2012年6月,他辞了职,和吴睿、李响一起做打车软件。9月9日上线时,在线司机只有16人。",
      coda: "两个月后,同时在线司机破百。",
    },
    en: {
      tag: "Resignation",
      title: "From Alibaba to taxis",
      body: "Cheng Wei spent eight years at Alibaba, working up to deputy general manager of Alipay's consumer business. In June 2012 he quit and, with Wu Rui and Li Xiang, started a taxi-hailing app. When it launched on September 9, only sixteen drivers were online at once.",
      coda: "Two months later, more than a hundred drivers were online at the same time.",
    },
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
    zh: {
      tag: "事故",
      title: "第八台服务器",
      body: "骑士资本向八台服务器部署新代码,只装成七台,第八台留着废弃多年的Power Peg代码,被订单唤醒,45分钟建仓数十亿多空头寸。SEC认定是无人复核。",
      coda: "六天后,骑士资本被竞对收购。",
    },
    en: {
      tag: "Incident",
      title: "The Eighth Server",
      body: "Knight Capital pushed new trading code to eight servers; only seven took it. The eighth still ran dead Power Peg code, retired years earlier, which live orders woke up. In 45 minutes Knight built $3.5B long and $3.15B short. The SEC's finding: nobody reviewed the incomplete deploy.",
      coda: "Knight was acquired by a rival within a week of the loss.",
    },
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
    zh: {
      tag: "拍卖",
      title: "一周竞价",
      body: "2012年,一名多伦多教授带两名研究生,在图像识别比赛里碾压所有对手。三人注册空壳公司待价而沽,谷歌、微软、百度、DeepMind一周内轮番出价。",
      coda: "教授选了谷歌,研究生之一叫Ilya Sutskever。",
    },
    en: {
      tag: "Auction",
      title: "A Week of Bidding",
      body: "In 2012 a University of Toronto professor and his two graduate students crushed the field in an image-recognition contest, then incorporated a shell company to sell themselves. Google, Microsoft, Baidu, and DeepMind spent a week bidding against each other for it.",
      coda: "Hinton chose Google. One of the two students was Ilya Sutskever.",
    },
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
    zh: {
      tag: "词源",
      title: "那本红皮书不是那本",
      body: "「小红书」这三个字,大部分人默认它指的是另一本红皮的书。创始人毛文超给出的来源要平淡得多:贝恩公司和斯坦福商学院,他工作过和读过书的地方,主色都是红的。",
      coda: "英文名直译过去,和那本书一字不差。",
    },
    en: {
      tag: "Etymology",
      title: "Not that little red book",
      body: "Most people assume the name points at the other red book. The founder's own account is duller: Bain & Company and the Stanford Graduate School of Business, the firm he worked at and the school he attended, both run on red.",
      coda: "Translated into English, the name comes out identical to the other one anyway.",
    },
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
    zh: {
      tag: "支付",
      title: "珍珠港偷袭",
      body: "2014年除夕前后,微信红包上线,数日内被抢发超4000万个。马云在来往上写道,这是「珍珠港偷袭」,短期有效,长期健康才是硬道理。",
      coda: "红包成了移动支付的入口。",
    },
    en: {
      tag: "Payments",
      title: "Pearl Harbor, Digital",
      body: "Around Chinese New Year 2014, WeChat's red-envelope feature went live; users grabbed over 40 million red packets within days. On the app Laiwang, Jack Ma called it a 'Pearl Harbor sneak attack' — effective short-term, he wrote, but healthy long-term growth mattered more.",
      coda: "The red envelope became a payments funnel.",
    },
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
    zh: {
      tag: "事故",
      title: "四个人的项目",
      body: "心脏出血漏洞源于一次心跳扩展补丁的缺失边界检查,两年内几乎无人察觉。维护着全球大半HTTPS流量的代码库,当时只有四名核心开发者,仅一人全职。",
      coda: "补丁在漏洞公开当天随即发布。",
    },
    en: {
      tag: "Incident",
      title: "A Team of Four",
      body: "Heartbleed's missing bounds check entered OpenSSL's heartbeat extension in December 2011 and sat unnoticed for two years until independent researchers found it in April 2014. At the time, the codebase behind most of the web's HTTPS traffic was maintained by four volunteers, one full-time.",
      coda: "The fix shipped the same day the bug was disclosed.",
    },
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
    zh: {
      tag: "漏洞",
      title: "重复的跳转",
      body: "苹果SSL验证函数里,一行「goto fail;」被复制成两行,后一句没有if判断,验证代码永远跳过签名检查,却始终返回成功。",
      coda: "该代码在受影响系统上原样运行了数月。",
    },
    en: {
      tag: "Security",
      title: "The Duplicate Jump",
      body: "Inside Apple's SSLVerifySignedServerKeyExchange, a goto fail; line was duplicated. The second copy sat outside any if, so the function always jumped past the signature check and returned success regardless.",
      coda: "The duplicate line ran unchanged on the affected systems for months.",
    },
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
    zh: {
      tag: "地基",
      title: "谁在对表",
      body: "全球银行、交易所与卫星导航靠 NTP 对表。米尔斯设计了协议,如今参考实现主要由哈兰·斯滕一人维护。二零一五年,基金会公开求援,称经费将尽。",
      coda: "基金会仍在为经费四处筹款。",
    },
    en: {
      tag: "Time",
      title: "Who Sets the Clock",
      body: "Banks, exchanges and satellite systems synchronize against NTP. David Mills designed the protocol; the reference implementation is now led, largely alone, by Harlan Stenn. In March 2015 trade press ran the headline 'NTP Needs Money: Is A Foundation The Answer?'",
      coda: "The foundation is still fundraising toward its budget.",
    },
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
    zh: {
      tag: "事故",
      title: "多输入的那一行",
      body: "一名S3工程师按手册下线少量计费服务器,输入的参数范围过大,连带下线索引子系统。该子系统多年未整体重启,恢复远慢于预期,大片网站瘫痪近四小时。",
      coda: "亚马逊自家状态页也依赖同一套系统。",
    },
    en: {
      tag: "Incident",
      title: "One Wide Argument",
      body: "An S3 engineer ran an authorized command meant to take a small number of billing servers offline, but one input covered a wider range than intended. The removed servers also backed the index subsystem, which had not been fully restarted in years and came back far slower than expected.",
      coda: "The outage ran roughly four hours; AWS's own status page depended on the same systems.",
    },
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
    zh: {
      tag: "事故",
      title: "五道备份",
      body: "工程师想清空延迟的从库,却在主库上删了数据目录,几秒后收手,约300GB已消失。GitLab清点五种备份机制,能用来恢复的一个都没有。",
      coda: "靠六小时前一次意外快照捡回大部分数据。",
    },
    en: {
      tag: "Incident",
      title: "Five Backups, Zero",
      body: "An engineer meant to clear a lagging replica but deleted the PostgreSQL data directory on the primary instead, stopping seconds too late; roughly 300GB was already gone. GitLab found that of five backup and replication methods it had running, none could actually restore the data.",
      coda: "Recovery relied on a snapshot someone happened to take six hours earlier.",
    },
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
    zh: {
      tag: "事故",
      title: "被删掉的保险丝",
      body: "一条新WAF正则规则因回溯匹配,部署几秒内把全球服务器CPU拖到近100%。真正隐患更早:一次重构删掉了本该限制单规则CPU用量的保护开关。",
      coda: "故障持续27分钟,全局关闭WAF后恢复。",
    },
    en: {
      tag: "Incident",
      title: "The Fuse That Was Removed",
      body: "A new WAF rule with a catastrophically backtracking regex pushed CPU on Cloudflare's global network to near 100 percent within seconds of deployment. The rule itself was ordinary; what let it detonate was a CPU-usage safeguard on regex rules quietly deleted weeks earlier in a refactor.",
      coda: "The outage lasted 27 minutes and ended when the WAF was disabled globally.",
    },
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
    zh: {
      tag: "移交",
      title: "交出去的钥匙",
      body: "Requests 月下载超三千万次,是 Python 常用的网络请求库。雷茨二零一一年发布它,二零一九年因健康问题交给了软件基金会。",
      coda: "他此后再未领导过这个项目。",
    },
    en: {
      tag: "Handoff",
      title: "Handing Over the Keys",
      body: "Requests logs over 30 million downloads a month and became the standard HTTP client for Python. Kenneth Reitz released it on February 14, 2011. In 2019, after health problems, he handed control of the project to the Python Software Foundation.",
      coda: "He has not returned to lead the project since stepping down.",
    },
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
    zh: {
      tag: "修复",
      title: "提前十八年",
      body: "32位系统的time_t会在2038年1月19日溢出。2020年的Linux 5.6是首个能撑过这天的内核,但程序还要换64位libc重新编译才生效。",
      coda: "内核修好了,大批32位程序还没跟上。",
    },
    en: {
      tag: "Fix",
      title: "Eighteen Years Early",
      body: "32-bit Unix systems will overflow their time_t counter on 19 January 2038. Linux 5.6, released in 2020, was the first kernel able to keep a 32-bit system running past that date. Applications still need a rebuild against a 64-bit time_t to actually benefit.",
      coda: "The kernel was patched years before most 32-bit userspace caught up.",
    },
  },
  {
    id: "log4shell-eight-years",
    stamp: "2021.12.10",
    sources: [
      { label: 'Wikipedia, "Log4Shell"', url: "https://en.wikipedia.org/wiki/Log4Shell" },
      { label: 'Wikipedia, "Log4j"', url: "https://en.wikipedia.org/wiki/Log4j" },
    ],
    zh: {
      tag: "漏洞",
      title: "八年后被发现",
      body: "Log4j 是 Java 最常用的日志库,漏洞令九成云端企业中招。这段代码自二零一三年起便有缺陷,无人细查,直到二零二一年十二月才公开。",
      coda: "修复它的仍是几名志愿者。",
    },
    en: {
      tag: "Vulnerability",
      title: "Eight Years Unread",
      body: "Log4j sits inside most enterprise Java software; Wiz and EY found 93 percent of cloud environments exposed to Log4Shell. The flaw existed in the code since 2013. It was reported November 24, 2021 and disclosed publicly on December 10, rated CVSS 10.",
      coda: "A handful of volunteers wrote the fix that reached millions of servers.",
    },
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
    zh: {
      tag: "维护",
      title: "补丁的作者",
      body: "core-js 被 WhatsApp、Netflix、苹果引用,月下载约两点五亿次。作者二零一九年卷入车祸致人死亡,次年入狱十个月,出狱后仍在维护它。",
      coda: "捐款从每月两千五百美元跌到四百美元。",
    },
    en: {
      tag: "Maintainer",
      title: "The Patch Nobody Replaced",
      body: "core-js ships inside WhatsApp, Netflix, Apple and PayPal, logging roughly 250 million downloads a month. Its author, Denis Pushkarev, was in a fatal 2019 car accident, served about ten months in prison starting January 2020, and kept maintaining the library throughout.",
      coda: "Monthly donations fell from about 2,500 dollars to 400.",
    },
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
 * Every year in the archive, sorted. The rail draws one faint tick per entry, so
 * what the reader sees is the actual density of the record — the 1960s crowd, the
 * gaps — rather than a decorative ruler.
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
 * process start, and computing it on the client would risk a January-1
 * mismatch against what the server rendered.
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
 * own density, so the reader sees where the record crowds and where it thins.
 * An even tick every decade would look like a slider — and would be a claim
 * about the calendar rather than about the archive.
 */
export function bootLogDensity(buckets: number, span: BootLogSpan): number[] {
  const counts = new Array<number>(Math.max(1, buckets)).fill(0);
  for (const year of BOOT_LOG_YEARS) {
    const bucket = bootLogBucket(year, counts.length, span);
    counts[bucket] = (counts[bucket] ?? 0) + 1;
  }
  return counts;
}

/** Any Chinese variant reads the authored zh copy; everything else reads en. */
export function resolveBootLogLocale(locale: string): BootLogLocale {
  return locale.toLowerCase().startsWith("zh") ? "zh" : "en";
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
 * genuinely per visit. Only `count` localized records cross to the client —
 * shipping every entry in both languages would be most of the panel's payload.
 */
export function pickBootLogRotation(
  locale: string,
  count = 4,
  random: () => number = Math.random,
): BootLogRecord[] {
  const lang = resolveBootLogLocale(locale);
  return shuffle(BOOT_LOG_ENTRIES, random)
    .slice(0, Math.max(1, Math.min(count, BOOT_LOG_ENTRIES.length)))
    .map((entry) => ({
      id: entry.id,
      stamp: entry.stamp,
      year: bootLogYear(entry.stamp),
      ...entry[lang],
    }));
}
