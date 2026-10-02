"""Make a fake Task 1 grading page for the tests, from any saved CRM page (it keeps the page's
layout and correction ids, swaps in a made-up essay and a made-up student).
    python3 tests/task1_page.py <saved CRM page.html> <week 7-10> <out.html>"""
import copy, re, sys
import bs4

ESSAYS = {
    7: ["The pie charts compare the jobs of people in Ashby and in the UK as a whole in 2008.",
        "Overall, personal service and office work were the biggest groups in Ashby, while in the UK technical work was more common.",
        "In Ashby, {personal service} accounted for 21% of workers. Office work made up 18%, and unemployed people were 14%.",
        "In the UK, technical work was 17% and professional work was 20%. Only 10% were unemployed."],
    8: ["The line graph shows the price of coffee in four countries between 1996 and 2004.",
        "Overall, Japan had the most expensive and the most volatile prices, while coffee in the USA was the cheapest.",
        "Japanese coffee {rise} from $2 in 1996 to a peak of $3 in 1998. France stayed at around $2 throughout.",
        "German prices rose from $1.5 to $1.75. The USA was the cheapest at $1.5 in 2004."],
    9: ["The table compares the percentage of people who played six sports in 1990, 2000 and 2010.",
        "Overall, football was by far the most popular sport. Rugby saw the biggest rise, while judo fell the most.",
        "Football {decrease} slightly from 59% to 56%. Rugby doubled from 12% in 1990 to 24% in 2010.",
        "Golf stayed at 28% in 1990 and 2000 before falling to 25% in 2010. Judo dropped from 9% to 4%."],
    10: ["The maps show an office building now and the changes planned for the future.",
         "Overall, the building will be extended to the east, and the main entrance will move.",
         "In the west, the grass {will replace} by an outdoor seating area. The kitchen and canteen will become two offices.",
         "The four small offices in the south will be turned into two larger ones, with the main entrance between them."],
}
FIXES = {"personal service": "personal services", "rise": "rose", "decrease": "decreased", "will replace": "will be replaced"}

src, week, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
soup = bs4.BeautifulSoup(open(src, encoding="utf-8").read(), "html.parser")
editor = soup.find(id="editorjs")
para = editor.select_one(".ce-paragraph")
spans = editor.select(".comment-inline.grammar, .comment-inline.vocabulary")
tpl = spans[0]
para.clear()
for k, text in enumerate(ESSAYS[week]):
    if k:
        para.append(soup.new_tag("br"))
    m = re.search(r"\{(.+?)\}", text)
    if not m:
        para.append(text)
        continue
    para.append(text[:m.start()])
    sp = copy.copy(tpl)
    sp.s.string = m.group(1)
    sp.mark.string = FIXES[m.group(1)]
    para.append(sp)
    para.append(text[m.end():])
# drop the old essay's other blocks
for b in editor.select(".ce-block")[1:]:
    b.decompose()
# the student's original (the TR/CC editor): the same essay before the corrections, no teacher notes
orig = soup.select("#trcc .ce-paragraph")
for b in orig[1:]:
    b.decompose()
if orig:
    o = orig[0]
    o.clear()
    for k, text in enumerate(ESSAYS[week]):
        if k:
            o.append(soup.new_tag("br"))
        o.append(re.sub(r"\{(.+?)\}", r"\1", text))
html = str(soup)
html = re.sub(r"Writing Week \d+", f"Writing Week {week}", html)
full = None
email = soup.find(string=re.compile(r"^\s*\S+@\S+\.\w+\s*$"))
if email:
    prev = email.find_previous(string=lambda s: s.strip() and not re.fullmatch(r"[A-ZĐ]{1,3}|\d+", s.strip()))
    full = prev.strip() if prev else None
    html = html.replace(email.strip(), "test@example.com")
if full:
    html = html.replace(full, "Trần Thị Thử").replace(full.split()[-1], "Thử")
open(out, "w", encoding="utf-8").write(html)
