/* Ante's legal documents in Hungarian (the English ones in js/legal.js are the reference).
   Keep both in step when anything changes. */
(function () {
  "use strict";
  const L = window.AnteLegal; if (!L) return;
  const { OWNER, EMAIL, PHONE, TAX_NUMBER, REGISTRATION } = L;
  const ADDRESS = "1183 Budapest, Kálti Márk u. 2/B";
  const UPDATED = "2026. november 2.";
  L.LANG.hu = {
    credits: {
      title: "Köszönet",
      intro: "Az Ante-t egyetlen ember készíti, mások szabad, nyílt munkájának segítségével. Köszönöm.",
      sections: [
        ["Betűtípusok", "Geist (felület): Vercel. Óra-betűtípusok: Bitcount (Petr van Blokland), Doto (Óliver Lalan), DotGothic16 (Fontworks), Handjet (Rosetta), Workbench és Sixtyfour (Jens Kutilek), Silkscreen (Jason Kottke), Pixelify Sans (Stefie Justprince), VT323 (Peter Hull). Mind SIL Open Font License 1.1 alatt."],
        ["Színek", "A Latte, Frappé, Macchiato és Mocha témák a Catppuccin palettáit használják (MIT licenc)."],
        ["Weboldal-listák", "A felnőtt és szerencsejáték-oldalak listái a The Block List Projectből (github.com/blocklistproject/Lists) és Steven Black hosts listájából (github.com/StevenBlack/hosts) származnak, mindkettő MIT licenc alatt."],
        ["Ikonok", "A vonalas ikonok az Ante-hoz készültek; a beállítások fogaskereke a Lucide „settings” ikonját követi (ISC licenc)."],
        ["Tervezőeszközök", "Az animált jelenetek Benji Taylor Stageshow irányelveit követik (MIT licenc). Ezeket is használtuk: ECC (Everything Claude Code) és Matt Pocock skilljei a tervezéshez és az átnézésekhez."],
        ["Ezekkel készült", "Android, Kotlin, Credential Manager és egy WebView; Playwrighttal tesztelve; Claude-dal közösen írva."],
      ],
    },
    imprint: {
      title: "Impresszum",
      intro: "Az Ante szolgáltatójának adatai, ahogy a magyar és uniós szabályok az online szolgáltatásoknál előírják.",
      sections: [
        ["Szolgáltató", `Az Ante-t ${OWNER} magánszemély készíti és üzemelteti.`],
        ["Cím", ADDRESS],
        ["Elérhetőség", `E-mail: ${EMAIL}<br>Telefon: ${PHONE}`],
        ["A tartalomért felel", OWNER],
        ["Vállalkozási adatok", TAX_NUMBER ? `Adószám: ${TAX_NUMBER}. ${REGISTRATION}` : "Az Ante ingyenes, és semmi sincs benne eladó. A Ko-fi-támogatások önkéntes ajándékok a fejlesztőnek. Ha ez változik, előbb itt jelennek meg a nyilvántartási adatok és az adószám."],
        ["Fogyasztói panaszok", `Írj a(z) ${EMAIL} címre, 30 napon belül válaszolunk. Ha nem tudunk megegyezni, a szolgáltató székhelye szerinti Budapesti Békéltető Testülethez (1016 Budapest, Krisztina krt. 99., I. emelet 111.; bekeltet.bkik.hu) vagy a lakóhelyed szerinti békéltető testülethez fordulhatsz; az eljárás ingyenes. A fogyasztóvédelmi hatósághoz is fordulhatsz. A szolgáltató együttműködik a békéltető testület eljárásában.`],
      ],
    },
    terms: {
      title: "Felhasználási feltételek",
      intro: `Ezek a feltételek az Ante alkalmazásra és a webes demóra vonatkoznak. Utolsó módosítás: ${UPDATED}. Az Ante első megnyitásakor az „Elmúltam 18 éves, és elfogadom” gombbal fogadod el őket.`,
      sections: [
        ["1. Mi az Ante", "Az Ante képernyőidő-kezelő eszköz. Napi időkeretet állítasz be a telefonod alkalmazásaira. Ha egy keret elfogy, az Ante letakarja az alkalmazást. Az asztaloknál (rulett, blackjack, nyerőgép, póker és fej vagy írás) ebből az időkeretből tehetsz fel perceket."],
        ["2. Nincs valódi pénz, nincs nyeremény", "Az Ante nem szerencsejáték-szolgáltatás. Az asztaloknál nem fizethetsz be pénzt, és nem nyerhetsz pénzt, árut vagy bármi más értéket. A nyert vagy vesztett percek csak a saját magad által beállított időkereteket változtatják, és naponta újraindulnak. Minden asztal átlagosan valamivel kevesebbet ad vissza, mint amennyit elvesz. Ez tervezési döntés, hogy a játék perceket vegyen el, ne adjon hozzá; nem ígéret arra, hogy csökken a képernyőidőd."],
        ["3. Ki használhatja", "Legalább 18 évesnek kell lenned, mert az asztalok kaszinójátékokat szimulálnak. Ha a szerencsejáték-jellegű játékok gondot okoznak neked, vagy okozhatnak, ne használd az asztalokat. Ha a szerencsejáték, akár idővel is, problémának kezd tűnni, beszélj az orvosoddal vagy egy segítő szolgálattal."],
        ["4. A telefonod és a beállításai", "A tiltáshoz az Android kisegítő engedélye kell, amelyet a Beállításokban bármikor ki- és bekapcsolhatsz. Az Ante a limitektől függetlenül soha nem takarja le a telefon alkalmazást, az üzenetküldőt és a segélyhívást. Az Ante nem garantálja, hogy minden alkalmazás minden helyzetben le lesz tiltva, például az alkalmazások webes változatai vagy a kép a képben videó. Szigorú módban a Beállítások, a Play Áruház és az eltávolítás előtt 30 másodperces várakozás van. A saját magad által indított, időzített Szigorú zárolást az alkalmazásban nem lehet idő előtt kikapcsolni; a választott időpontban magától ér véget. A Google Playről telepített változatban a várakozás után az Ante mindig eltávolítható; a Google Playen kívülről telepített változatok a zárolás végéig letakarva tartják az eltávolító képernyőt. Ez általad vállalt akadály, nem garancia: az Android mindig elindítható csökkentett módban. A weboldalszűrő név alapján tilt, és nem fog meg mindent: a saját Biztonságos DNS-t használó böngészők, egy másik VPN vagy egy szolgáltató nevére állított Privát DNS megkerülheti."],
        ["5. A fiókod és az adataid", "A Google-bejelentkezés nem kötelező. A neved és e-mail-címed kerül vele erre a telefonra, és lehetővé teszi, hogy az adataidat a saját Google Drive-odra mentsd és másik telefonon visszaállítsd. Bármikor kijelentkezhetsz, letöltheted vagy törölheted az összes adatodat: Beállítások → Az adataid. A törlés megvárja, amíg az általad indított Szigorú zárolás vagy Fókusz véget ér."],
        ["6. Ante Támogató (Ko-fi-támogatás)", "Az Ante ingyenes. A Ko-fin (ko-fi.com) bármekkora összeggel támogathatod, egyszer vagy többször. A támogatás önkéntes ajándék a fejlesztőnek: a fizetést, a visszatérítést és a nyugtákat a Ko-fi és a fizetési szolgáltatói kezelik a saját feltételeik szerint. Köszönetként, ha a támogatást ugyanazzal az e-mail-címmel adod, amellyel az Ante-ba Google-lel bejelentkeztél, Ante Támogató leszel: megkapod a Támogató jelvényt és egy arany keretet a profilképed köré, mást nem: az Ante minden funkciója és megjelenése mindenkinek ingyenes, és a Támogató státusz soha nem old fel tiltó funkciókat, perceket vagy jobb esélyeket. A Támogató státusz köszönet, nem vásárlás; addig marad meg, amíg az Ante támogató-ellenőrzése működik, és nagyjából hetente újra ellenőrződik."],
        ["7. Felelősség", "Az Ante funkcióit „ahogy vannak” biztosítjuk. A jogszabályok által megengedett mértékben a szolgáltató nem felel az Ante használatából vagy használhatatlanságából eredő károkért, például egy elmulasztott üzenetért, mert egy alkalmazás le volt takarva. A szándékos és súlyosan gondatlan károkozásért, valamint az életet, testi épséget vagy egészséget megkárosító szerződésszegésért való felelősség nem zárható ki."],
        ["8. Változások", "A feltételek az alkalmazás változásával módosulhatnak. A fenti dátum mutatja a legfrissebb változatot. Ha egy változás számodra lényeges, az Ante megmutatja, mielőtt hatályba lép, és kéri, hogy fogadd el az új feltételeket. Ha nem fogadod el, abbahagyhatod az Ante használatát, és törölheted az adataidat: Beállítások → Az adataid."],
        ["9. Jog és elérhetőség", `A magyar jog az irányadó. Kérdések: ${EMAIL}.`],
      ],
    },
    privacy: {
      title: "Adatvédelmi tájékoztató",
      intro: `Hogyan kezeli az Ante az adataidat. Utolsó módosítás: ${UPDATED}. Röviden: minden a telefonodon marad. Az egyetlen szerver egy kicsi, amely a Ko-fi-támogatásokat ellenőrzi, és az e-mail-címedet sosem látja.`,
      sections: [
        ["Az adatkezelő", `${OWNER}, ${ADDRESS}. E-mail: ${EMAIL}, telefon: ${PHONE}.`],
        ["Ami a telefonodon marad", "A limitjeid, az alkalmazásonként maradt és felhasznált idő, a napi előzményeid (kb. hat hónap), az asztali eredményeid, a beállításaid, a témád és, ha adsz hozzá, a profilképed (a választott fotóból készült kis másolat). Ez az eszközödön tárolódik. Csak akkor hagyja el, ha a saját Google Drive-odra mented (lásd lent). Jogalap: az általad kért alkalmazás nyújtása (GDPR 6. cikk (1) b))."],
        ["Alkalmazásfrissítések", "Az Ante a projekt nyilvános GitHub-oldalán (github.com) ellenőrzi, van-e újabb változat a képernyőiből, használat közben legfeljebb tízpercenként, és ha van, letölti. Ezek a kérések nem tartalmaznak személyes adatot, de a GitHub, mint minden weboldal, látja az IP-címedet, és a saját adatvédelmi szabályai szerint szokásos naplókat vezet (docs.github.com/site-policy/privacy-policies). Jogalap: jogos érdek az alkalmazás naprakészen és biztonságosan tartásához (GDPR 6. cikk (1) f)). Minden frissítés aláírt, az Ante minden mást elutasít."],
        ["Melyik alkalmazás van előtérben", "Bekapcsolt kisegítő engedéllyel az Android megmondja az Ante-nak az előtérbe kerülő alkalmazás nevét, hogy az Ante le tudja takarni a limitet túllépő alkalmazásokat. Az Ante nem olvassa a képernyőd tartalmát, azt, amit gépelsz, vagy az értesítéseidet. Az alkalmazásneveket a telefonon használja, és a használati összesítéseken túl nem tárolja. Hogy milyen alkalmazásokat és mennyi ideig használsz, sokat elárulhat rólad (például egy társkereső, egészségügyi vagy vallási alkalmazás), ezért ez az előzmény a telefonodon és, ha úgy döntesz, a saját Drive-odon marad."],
        ["Google-bejelentkezés (nem kötelező)", "Ha Google-fiókkal jelentkezel be, a Google a saját bejelentkező képernyőjét mutatja, és átadja az Ante-nak a nevedet, e-mail-címedet és fiókképedet. Az Ante a képet egyszer letölti a Google képszerveréről, és egy kis másolatot ment belőle a telefonodra a neveddel és e-mail-címeddel együtt. A bejelentkezést a Google a saját adatvédelmi szabályai szerint kezeli (policies.google.com/privacy). Az Ante nem őrzi meg a Google bejelentkezési tokent. Jogalap: a hozzájárulásod (GDPR 6. cikk (1) a)), amelyet kijelentkezéssel visszavonhatsz."],
        ["Az alkalmazáslista", "Hogy alkalmazásokat választhass, az Ante beolvassa a telefonodra telepített alkalmazások listáját és ikonjait. Ez a lista a telefonon marad."],
        ["Weboldalszűrő (nem kötelező)", "Ha bekapcsolod a weboldalszűrőt, az Android egyszer engedélyt kér az Ante VPN-jéhez. Ez csak DNS-lekérdezéseket visz: azoknak az oldalaknak a nevét, amelyeket a telefonod alkalmazásai és böngészői el akarnak érni. Az Ante minden nevet a telefonon ellenőriz az alkalmazással érkező listák alapján (felnőtt oldalak, szerencsejáték-oldalak és az általad hozzáadott oldalak). A tiltott nevekre „nincs ilyen oldal” választ ad; minden más lekérdezés a hálózatod szokásos DNS-szerveréhez megy, ugyanúgy, mint az Ante nélkül. Az Ante nem tárolja, nem naplózza és nem küldi el, milyen oldalakat látogatsz, és más forgalom nem megy rajta keresztül. Jogalap: az általad bekapcsolt funkció nyújtása (GDPR 6. cikk (1) b))."],
        ["Webes demó", "A webes demó a böngésződben fut mintaadatokkal, és az állapotát a böngésző helyi tárhelyén tárolja. Bárhol is fut, a weboldal tárhelyszolgáltatója a saját szabályai szerint szokásos szervernaplókat (például IP-címeket) vezethet."],
        ["Google Drive-mentés (nem kötelező)", "Ha bekapcsolod a mentést vagy a Mentésre koppintasz, az Ante hozzáférést kér a Google-tól a saját Google Drive-od egy privát alkalmazásmappájához (drive.appdata engedély: a többi fájlodat az Ante nem látja). Ide egy fájlt ment a limitjeiddel, ütemezéseiddel, előzményeiddel, asztali eredményeiddel és beállításaiddal. A fájl közvetlenül a telefonodról kerül a Google-hoz, nem megy át az Ante szerverén. Jogalap: a hozzájárulásod (GDPR 6. cikk (1) a)). Az Adataim törlése eltávolítja, és a Google-fiókodban (Biztonság → Harmadik féltől származó kapcsolatok) elveheted az Ante hozzáférését."],
        ["Ko-fi-támogatás és a Támogató-ellenőrzés (nem kötelező)", "Ha a Ko-fin támogatsz, a Ko-fi értesíti az Ante kis támogató-szerverét (Cloudflare Workers-en fut). A szerver csak az általad használt e-mail-cím visszafejthetetlen ujjlenyomatát (SHA-256), az első és a legutóbbi támogatásod dátumát, a támogatások számát és összegét tárolja. Nem tárolja a nevedet, az e-mail-címedet, az üzenetedet vagy fizetési adatot. Amikor a „Támogattam, ellenőrzés” gombra koppintasz (és utána nagyjából hetente), az Ante a Google-bejelentkezésed e-mail-címének ugyanilyen ujjlenyomatát küldi el a szervernek, amely csak igennel vagy nemmel válaszol. Jogalap: jogos érdek a támogatók megköszönéséhez (GDPR 6. cikk (1) f)). Ha szeretnéd, hogy töröljük a bejegyzésedet, írj a fenti e-mail-címre."],
        ["Ko-fi", "A Ko-fi hivatkozás a böngésződben nyitja meg a ko-fi.com oldalt. Amit ott teszel, azt a Ko-fi a saját adatvédelmi szabályai szerint kezeli (ko-fi.com/home/privacy)."],
        ["Adattovábbítás az EU-n kívülre", "A Google (bejelentkezés, Drive-mentés), a GitHub (frissítések) és a Cloudflare (támogató-ellenőrzés) amerikai vállalat. A hozzájuk kerülő adatok továbbítása az EU–USA adatvédelmi keretrendszer alapján történik, amelynek mindhárom tagja, valamint az általános szerződési feltételeik alapján."],
        ["Meddig", "A telefonon tárolt adatok addig maradnak meg, amíg nem törlöd őket (Beállítások → Az adataid), el nem távolítod az Ante-t, vagy nem törlöd az adatait az Android beállításaiban. A Drive-mentés addig marad, amíg nem törlöd. A napi előzmények kb. hat hónapra korlátozódnak. Kijelentkezéskor a neved és e-mail-címed azonnal törlődik."],
        ["A jogaid", `A GDPR alapján jogod van az adataidhoz való hozzáféréshez, azok helyesbítéséhez és törléséhez, a kezelés korlátozásához, a tiltakozáshoz, az adathordozhatósághoz és a hozzájárulás visszavonásához. Ennek nagy részét magad intézheted: Beállítások → Az adataid: Adataim letöltése (hozzáférés és hordozhatóság) és Adataim törlése (törlés). Minden másért írj a(z) ${EMAIL} címre.`],
        ["Panasz", "Panaszt a Nemzeti Adatvédelmi és Információszabadság Hatóságnál (NAIH, 1055 Budapest, Falk Miksa utca 9–11., naih.hu) tehetsz."],
        ["Gyermekek", "Az Ante felnőtteknek (18 éven felülieknek) szól, mert az asztalok kaszinójátékokat szimulálnak."],
        ["Változások", "Ha a tájékoztató változik, a fenti dátum is változik, a fontos változásokat pedig az alkalmazás jelzi."],
      ],
    },
  };
})();
